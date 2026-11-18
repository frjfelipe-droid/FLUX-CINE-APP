package com.fluxcine.app;

import android.content.Context;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;

import androidx.media3.common.Effect;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.audio.AudioProcessor;
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

/** Monta o vídeo final: corta e junta os trechos, aplica camada gráfica, mixa efeitos e exporta MP4. Chamar na thread principal. */
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

        List<long[]> sfxEvents = new ArrayList<>();
        int mainSfx = SfxSynth.type(o.optString("sfx", "none"));
        if (mainSfx >= 0) {
            sfxEvents.add(new long[]{120_000, mainSfx});
            for (double b : spec.boundaries) sfxEvents.add(new long[]{Math.max(0, (long) ((b - 0.35) * 1e6)), SfxSynth.WHOOSH});
            sfxEvents.add(new long[]{(long) (spec.ctaStart() * 1e6), SfxSynth.POP});
        }

        CineRenderer renderer = new CineRenderer(spec);
        List<EditedMediaItem> items = new ArrayList<>();
        long globalUs = 0;
        for (int i = 0; i < segs.length(); i++) {
            JSONObject s = segs.getJSONObject(i);
            long startMs = s.getLong("startMs"), endMs = s.getLong("endMs");
            MediaItem mi = new MediaItem.Builder()
                    .setUri(Uri.fromFile(new File(s.getString("path"))))
                    .setClippingConfiguration(new MediaItem.ClippingConfiguration.Builder()
                            .setStartPositionMs(startMs).setEndPositionMs(endMs).build())
                    .build();
            List<Effect> video = new ArrayList<>();
            video.add(Presentation.createForWidthAndHeight(CineSpec.W, CineSpec.H, Presentation.LAYOUT_SCALE_TO_FIT_WITH_CROP));
            if (spec.ending.equals("zoom")) video.add(new ZoomTransform(globalUs, spec.total));
            video.add(new OverlayEffect(ImmutableList.<TextureOverlay>of(new CineOverlay(renderer, globalUs))));
            List<AudioProcessor> audio = new ArrayList<>();
            if (!sfxEvents.isEmpty()) audio.add(new SfxMixer(globalUs, sfxEvents));
            items.add(new EditedMediaItem.Builder(mi).setEffects(new Effects(audio, video)).build());
            globalUs += (endMs - startMs) * 1000L;
        }

        Composition composition = new Composition.Builder(new EditedMediaItemSequence(items))
                .experimentalSetForceAudioTrack(true)
                .setHdrMode(Composition.HDR_MODE_TONE_MAP_HDR_TO_SDR_USING_OPEN_GL)
                .build();

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
