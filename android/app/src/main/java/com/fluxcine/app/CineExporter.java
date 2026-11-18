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
 * Monta o vídeo final. Trechos com velocidade (chips rápidos, lentos, pausas) são gravados antes,
 * um por um; depois tudo é juntado em velocidade normal com título, legenda, zoom de impacto e
 * a trilha de efeitos sonoros. Chamar na thread principal.
 */
final class CineExporter {
    interface Listener {
        void onProgress(int percent);
        void onDone(long durationMs);
        void onError(String message);
    }

    private final Handler main = new Handler(Looper.getMainLooper());
    private Transformer transformer;
    private boolean cancelled;

    void export(Context ctx, JSONObject o, File out, Listener l) throws Exception {
        JSONArray segs = o.getJSONArray("segments");
        List<Integer> speedIdx = new ArrayList<>();
        for (int i = 0; i < segs.length(); i++) {
            double sp = segs.getJSONObject(i).optDouble("speed", 1);
            if (Math.abs(sp - 1) > 0.001) speedIdx.add(i);
        }
        if (speedIdx.isEmpty()) { exportFinal(ctx, o, out, 0, l); return; }
        prerender(ctx, o, speedIdx, 0, out, l);
    }

    /** Grava o trecho speedIdx[k] já com a velocidade aplicada e troca na lista por esse arquivo. */
    private void prerender(Context ctx, JSONObject o, List<Integer> speedIdx, int k, File out, Listener l) {
        try {
            if (cancelled) return;
            if (k >= speedIdx.size()) { exportFinal(ctx, o, out, 40, l); return; }
            JSONObject s = o.getJSONArray("segments").getJSONObject(speedIdx.get(k));
            CineSpec spec = CineSpec.from(ctx, o);
            long startMs = s.getLong("startMs"), endMs = Math.max(startMs + 40, s.getLong("endMs"));
            float speed = (float) s.optDouble("speed", 1);
            MediaItem mi = new MediaItem.Builder()
                    .setUri(Uri.fromFile(new File(s.getString("path"))))
                    .setClippingConfiguration(new MediaItem.ClippingConfiguration.Builder().setStartPositionMs(startMs).setEndPositionMs(endMs).build())
                    .build();
            List<Effect> video = new ArrayList<>();
            video.add(FrameDropEffect.createDefaultFrameDropEffect(30f));
            video.add(Presentation.createForWidthAndHeight(spec.outW, spec.outH, Presentation.LAYOUT_SCALE_TO_FIT_WITH_CROP));
            EditedMediaItem.Builder b = new EditedMediaItem.Builder(mi).setEffects(new Effects(ImmutableList.<AudioProcessor>of(), video)).setSpeed(new ConstSpeed(speed));
            if (s.optBoolean("removeAudio", false)) b.setRemoveAudio(true);
            final File piece = new File(ctx.getCacheDir(), "piece_" + k + ".mp4");
            Composition c = new Composition.Builder(EditedMediaItemSequence.withAudioAndVideoFrom(ImmutableList.of(b.build()))).setHdrMode(Composition.HDR_MODE_TONE_MAP_HDR_TO_SDR_USING_OPEN_GL).build();
            int pFrom = 40 * k / speedIdx.size(), pTo = 40 * (k + 1) / speedIdx.size();
            run(ctx, c, piece, pFrom, pTo, new Listener() {
                @Override public void onProgress(int p) { l.onProgress(p); }
                @Override public void onDone(long d) {
                    try {
                        long ms = d > 0 ? d : Math.round((endMs - startMs) / speed);
                        s.put("path", piece.getAbsolutePath()).put("startMs", 0).put("endMs", ms).put("speed", 1).put("removeAudio", false);
                        prerender(ctx, o, speedIdx, k + 1, out, l);
                    } catch (Exception e) { l.onError(e.getMessage()); }
                }
                @Override public void onError(String m) { l.onError(m); }
            });
        } catch (Exception e) {
            l.onError("Falha ao preparar os chips: " + e.getMessage());
        }
    }

    private void exportFinal(Context ctx, JSONObject o, File out, int pFrom, Listener l) throws Exception {
        CineSpec spec = CineSpec.from(ctx, o);
        JSONArray segs = o.getJSONArray("segments");
        CineRenderer renderer = new CineRenderer(spec);
        List<EditedMediaItem> items = new ArrayList<>();
        long globalUs = 0;
        for (int i = 0; i < segs.length(); i++) {
            JSONObject s = segs.getJSONObject(i);
            long startMs = s.getLong("startMs"), endMs = Math.max(startMs + 40, s.getLong("endMs"));
            MediaItem mi = new MediaItem.Builder()
                    .setUri(Uri.fromFile(new File(s.getString("path"))))
                    .setClippingConfiguration(new MediaItem.ClippingConfiguration.Builder().setStartPositionMs(startMs).setEndPositionMs(endMs).build())
                    .build();
            long durUs = (endMs - startMs) * 1000L;
            List<Effect> video = new ArrayList<>();
            video.add(FrameDropEffect.createDefaultFrameDropEffect(30f));
            video.add(Presentation.createForWidthAndHeight(spec.outW, spec.outH, Presentation.LAYOUT_SCALE_TO_FIT_WITH_CROP));
            if (spec.finalStart >= 0 && (globalUs + durUs) / 1e6 > spec.finalStart) video.add(new ImpactZoom(globalUs, spec.finalStart));
            video.add(new OverlayEffect(ImmutableList.<TextureOverlay>of(new CineOverlay(renderer, globalUs))));
            EditedMediaItem.Builder b = new EditedMediaItem.Builder(mi).setEffects(new Effects(ImmutableList.<AudioProcessor>of(), video));
            if (s.optBoolean("removeAudio", false)) b.setRemoveAudio(true);
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
            File wav = SfxSynth.writeTrack(new File(ctx.getCacheDir(), "sfx-track.wav"), ev, globalUs / 1e6);
            cb = new Composition.Builder(mainSeq, EditedMediaItemSequence.withAudioFrom(ImmutableList.of(new EditedMediaItem.Builder(MediaItem.fromUri(Uri.fromFile(wav))).build())));
        } else {
            cb = new Composition.Builder(mainSeq);
        }
        run(ctx, cb.setHdrMode(Composition.HDR_MODE_TONE_MAP_HDR_TO_SDR_USING_OPEN_GL).build(), out, pFrom, 100, new Listener() {
            @Override public void onProgress(int p) { l.onProgress(p); }
            @Override public void onDone(long d) { cleanupPieces(ctx); l.onDone(d); }
            @Override public void onError(String m) { cleanupPieces(ctx); l.onError(m); }
        });
    }

    private static void cleanupPieces(Context ctx) {
        File[] fs = ctx.getCacheDir().listFiles();
        if (fs != null) for (File f : fs) if (f.getName().startsWith("piece_")) f.delete();
    }

    /** Roda uma exportação; o progresso vai de pFrom a pTo. */
    private void run(Context ctx, Composition composition, File out, int pFrom, int pTo, Listener l) {
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
                if (transformer.getProgress(ph) == Transformer.PROGRESS_STATE_AVAILABLE) l.onProgress(pFrom + ph.progress * (pTo - pFrom) / 100);
                main.postDelayed(this, 250);
            }
        }, 250);
    }

    void cancel() {
        main.post(() -> {
            cancelled = true;
            if (transformer != null) transformer.cancel();
            transformer = null;
            main.removeCallbacksAndMessages(null);
        });
    }
}
