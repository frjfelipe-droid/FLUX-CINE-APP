package com.fluxcine.app;

import android.content.Context;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;

import androidx.media3.common.Effect;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.audio.AudioProcessor;
import androidx.media3.effect.FrameDropEffect;
import androidx.media3.effect.OverlayEffect;
import androidx.media3.effect.Presentation;
import androidx.media3.effect.TextureOverlay;
import androidx.media3.transformer.Composition;
import androidx.media3.transformer.EditedMediaItem;
import androidx.media3.transformer.EditedMediaItemSequence;
import androidx.media3.transformer.Effects;
import androidx.media3.transformer.ExportException;
import androidx.media3.transformer.ExportResult;
import androidx.media3.transformer.ProgressHolder;
import androidx.media3.transformer.Transformer;

import com.google.common.collect.ImmutableList;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

/**
 * Monta o vídeo final: corta e junta os trechos (com velocidade: rápido, lento, pausa),
 * aplica a camada gráfica e o zoom de impacto, mistura a trilha de efeitos e exporta MP4.
 * Chamar na thread principal.
 */
final class CineExporter {
    interface Listener {
        void onProgress(int percent);
        void onDone(long durationMs);
        void onError(String message);
    }

    private final Handler main = new Handler(Looper.getMainLooper());
    private Transformer transformer;

    void export(Context ctx, JSONObject o, File out, Listener l) throws Exception {
        CineSpec spec = CineSpec.from(ctx, o);
        JSONArray segs = o.getJSONArray("segments");

        CineRenderer renderer = new CineRenderer(spec);
        List<EditedMediaItem> items = new ArrayList<>();
        long globalUs = 0;
        boolean hasSpeed = false;
        for (int i = 0; i < segs.length(); i++) {
            JSONObject s = segs.getJSONObject(i);
            long startMs = s.getLong("startMs"), endMs = Math.max(s.getLong("startMs") + 40, s.getLong("endMs"));
            float speed = (float) s.optDouble("speed", 1);
            if (speed <= 0) speed = 1;
            MediaItem mi = new MediaItem.Builder()
                    .setUri(Uri.fromFile(new File(s.getString("path"))))
                    .setClippingConfiguration(new MediaItem.ClippingConfiguration.Builder()
                            .setStartPositionMs(startMs).setEndPositionMs(endMs).build())
                    .build();
            long durUs = (long) ((endMs - startMs) * 1000L / speed);
            List<Effect> video = new ArrayList<>();
            video.add(FrameDropEffect.createDefaultFrameDropEffect(30f));
            video.add(Presentation.createForWidthAndHeight(spec.outW, spec.outH, Presentation.LAYOUT_SCALE_TO_FIT_WITH_CROP));
            if (spec.finalStart >= 0 && (globalUs + durUs) / 1e6 > spec.finalStart) video.add(new ImpactZoom(globalUs, spec.finalStart));
            video.add(new OverlayEffect(ImmutableList.<TextureOverlay>of(new CineOverlay(renderer, globalUs))));
            EditedMediaItem.Builder b = new EditedMediaItem.Builder(mi).setEffects(new Effects(ImmutableList.<AudioProcessor>of(), video));
            if (s.optBoolean("removeAudio", false)) b.setRemoveAudio(true);
            if (Math.abs(speed - 1f) > 0.001f) { b.setSpeed(new ConstSpeed(speed)); hasSpeed = true; }
            items.add(b.build());
            globalUs += durUs;
        }
        EditedMediaItemSequence mainSeq = EditedMediaItemSequence.withAudioAndVideoFrom(items);

        // trilha de efeitos sonoros: título, cada corte, final de impacto e CTA
        int mainSfx = SfxSynth.type(o.optString("sfx", "none"));
        List<long[]> ev = new ArrayList<>();
        if (mainSfx >= 0) {
            ev.add(new long[]{120_000, mainSfx});
            for (double bd : spec.boundaries) ev.add(new long[]{Math.max(0, (long) ((bd - 0.32) * 1e6)), SfxSynth.WHOOSH});
            if (spec.finalStart > 0.3) ev.add(new long[]{(long) (spec.finalStart * 1e6), SfxSynth.IMPACT});
            if (!spec.cta.isEmpty()) ev.add(new long[]{(long) (spec.ctaStart() * 1e6), SfxSynth.POP});
        }
        final File wav = ev.isEmpty() ? null : SfxSynth.writeTrack(new File(ctx.getCacheDir(), "sfx-track.wav"), ev, spec.total);

        if (wav != null && !hasSpeed) {
            // uma passada: vídeo + trilha de efeitos juntos
            run(ctx, new Composition.Builder(mainSeq, sfxSequence(wav)).setHdrMode(Composition.HDR_MODE_TONE_MAP_HDR_TO_SDR_USING_OPEN_GL).build(), out, 0, 100, l, null);
        } else if (wav != null) {
            // duas passadas (trechos com velocidade): 1) cortes + gráficos, 2) mistura os efeitos copiando o vídeo
            final File tmp = new File(ctx.getCacheDir(), "pass1.mp4");
            tmp.delete();
            run(ctx, new Composition.Builder(mainSeq).setHdrMode(Composition.HDR_MODE_TONE_MAP_HDR_TO_SDR_USING_OPEN_GL).build(), tmp, 0, 90, l, () -> mixSfx(ctx, tmp, wav, out, true, l));
        } else {
            run(ctx, new Composition.Builder(mainSeq).setHdrMode(Composition.HDR_MODE_TONE_MAP_HDR_TO_SDR_USING_OPEN_GL).build(), out, 0, 100, l, null);
        }
    }

    private static EditedMediaItemSequence sfxSequence(File wav) {
        return EditedMediaItemSequence.withAudioFrom(ImmutableList.of(new EditedMediaItem.Builder(MediaItem.fromUri(Uri.fromFile(wav))).build()));
    }

    private void mixSfx(Context ctx, File pass1, File wav, File out, boolean transmux, Listener l) {
        try {
            EditedMediaItemSequence v = EditedMediaItemSequence.withAudioAndVideoFrom(ImmutableList.of(new EditedMediaItem.Builder(MediaItem.fromUri(Uri.fromFile(pass1))).build()));
            Composition c = new Composition.Builder(v, sfxSequence(wav)).setTransmuxVideo(transmux).build();
            run(ctx, c, out, 90, 100, new Listener() {
                @Override public void onProgress(int p) { l.onProgress(p); }
                @Override public void onDone(long d) { pass1.delete(); l.onDone(d); }
                @Override public void onError(String m) {
                    if (transmux) { mixSfx(ctx, pass1, wav, out, false, l); return; }
                    // sem efeitos é melhor do que sem vídeo
                    if (pass1.renameTo(out)) l.onDone(-1); else l.onError(m);
                }
            }, null);
        } catch (Exception e) {
            if (pass1.renameTo(out)) l.onDone(-1); else l.onError(e.getMessage());
        }
    }

    /** Roda uma exportação; o progresso vai de pFrom a pTo. Se next != null, chama next em vez de onDone. */
    private void run(Context ctx, Composition composition, File out, int pFrom, int pTo, Listener l, Runnable next) {
        main.removeCallbacksAndMessages(null);
        out.delete();
        transformer = new Transformer.Builder(ctx)
                .setVideoMimeType(MimeTypes.VIDEO_H264)
                .setAudioMimeType(MimeTypes.AUDIO_AAC)
                .addListener(new Transformer.Listener() {
                    @Override
                    public void onCompleted(Composition c, ExportResult r) {
                        main.removeCallbacksAndMessages(null);
                        transformer = null;
                        if (next != null) next.run(); else l.onDone(r.durationMs);
                    }

                    @Override
                    public void onError(Composition c, ExportResult r, ExportException e) {
                        main.removeCallbacksAndMessages(null);
                        transformer = null;
                        l.onError("Falha ao exportar: " + e.getMessage() + " (" + e.getErrorCodeName() + ")");
                    }
                })
                .build();
        transformer.start(composition, out.getAbsolutePath());
        final ProgressHolder ph = new ProgressHolder();
        main.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (transformer == null) return;
                if (transformer.getProgress(ph) == Transformer.PROGRESS_STATE_AVAILABLE) l.onProgress(pFrom + ph.progress * (pTo - pFrom) / 100);
                main.postDelayed(this, 250);
            }
        }, 250);
    }

    void cancel() {
        main.post(() -> {
            if (transformer != null) transformer.cancel();
            transformer = null;
            main.removeCallbacksAndMessages(null);
        });
    }
}
