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
            if (Math.abs(speed - 1f) > 0.001f) b.setSpeed(new ConstSpeed(speed));
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
        Composition.Builder cb;
        if (!ev.isEmpty()) {
            File wav = SfxSynth.writeTrack(new File(ctx.getCacheDir(), "sfx-track.wav"), ev, spec.total);
            EditedMediaItemSequence sfxSeq = EditedMediaItemSequence.withAudioFrom(ImmutableList.of(
                    new EditedMediaItem.Builder(MediaItem.fromUri(Uri.fromFile(wav))).build()));
            cb = new Composition.Builder(mainSeq, sfxSeq);
        } else {
            cb = new Composition.Builder(mainSeq);
        }
        Composition composition = cb.setHdrMode(Composition.HDR_MODE_TONE_MAP_HDR_TO_SDR_USING_OPEN_GL).build();

        transformer = new Transformer.Builder(ctx)
                .setVideoMimeType(MimeTypes.VIDEO_H264)
                .setAudioMimeType(MimeTypes.AUDIO_AAC)
                .addListener(new Transformer.Listener() {
                    @Override
                    public void onCompleted(Composition c, ExportResult r) {
                        main.removeCallbacksAndMessages(null);
                        transformer = null;
                        l.onDone(r.durationMs);
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
                if (transformer.getProgress(ph) == Transformer.PROGRESS_STATE_AVAILABLE) l.onProgress(ph.progress);
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
