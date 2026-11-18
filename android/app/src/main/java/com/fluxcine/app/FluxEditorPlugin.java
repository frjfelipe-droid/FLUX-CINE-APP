package com.fluxcine.app;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.media.MediaCodec;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.util.Base64;

import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.audio.AudioProcessor;
import androidx.media3.common.Effect;
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

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.common.collect.ImmutableList;

import org.json.JSONArray;
import org.json.JSONObject;
import org.vosk.Model;
import org.vosk.Recognizer;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * FLUX CINE — editor de vídeo no aparelho.
 * pickVideo: escolhe um vídeo da galeria (copiado para o app).
 * transcribe: escuta a fala (Vosk, offline) e devolve as palavras com tempo.
 * render: corta, junta, anima títulos, legenda, mixa efeitos e exporta (Media3 Transformer).
 * saveToGallery / shareInstagram / share: entrega o vídeo.
 */
@CapacitorPlugin(name = "FluxEditor")
public class FluxEditorPlugin extends Plugin {

    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final Handler main = new Handler(Looper.getMainLooper());
    private Model voskModel;
    private Transformer transformer;

    // ---------------------------------------------------------------- escolher vídeo

    @PluginMethod
    public void pickVideo(PluginCall call) {
        Intent i = new Intent(Intent.ACTION_GET_CONTENT);
        i.setType("video/*");
        i.addCategory(Intent.CATEGORY_OPENABLE);
        startActivityForResult(call, i, "onPicked");
    }

    @ActivityCallback
    private void onPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            call.reject("Nenhum vídeo escolhido", "CANCELLED");
            return;
        }
        final Uri uri = result.getData().getData();
        io.execute(() -> {
            try {
                Context ctx = getContext();
                String name = displayName(ctx.getContentResolver(), uri);
                File dir = new File(ctx.getFilesDir(), "clips");
                dir.mkdirs();
                File out = new File(dir, "clip_" + System.currentTimeMillis() + ".mp4");
                try (InputStream in = ctx.getContentResolver().openInputStream(uri); OutputStream os = new FileOutputStream(out)) {
                    byte[] buf = new byte[1 << 16];
                    int n;
                    while ((n = in.read(buf)) > 0) os.write(buf, 0, n);
                }
                JSObject ret = new JSObject();
                ret.put("path", out.getAbsolutePath());
                ret.put("name", name == null ? out.getName() : name);
                MediaMetadataRetriever r = new MediaMetadataRetriever();
                r.setDataSource(out.getAbsolutePath());
                ret.put("durationMs", parseLong(r.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)));
                Bitmap frame = r.getFrameAtTime(500_000, MediaMetadataRetriever.OPTION_CLOSEST_SYNC);
                if (frame != null) {
                    int w = 240, h = Math.max(1, frame.getHeight() * 240 / Math.max(1, frame.getWidth()));
                    Bitmap small = Bitmap.createScaledBitmap(frame, w, h, true);
                    ByteArrayOutputStream bos = new ByteArrayOutputStream();
                    small.compress(Bitmap.CompressFormat.JPEG, 72, bos);
                    ret.put("thumb", "data:image/jpeg;base64," + Base64.encodeToString(bos.toByteArray(), Base64.NO_WRAP));
                }
                r.release();
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Não consegui abrir o vídeo: " + e.getMessage());
            }
        });
    }

    private static String displayName(ContentResolver cr, Uri uri) {
        try (Cursor c = cr.query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (c != null && c.moveToFirst()) return c.getString(0);
        } catch (Exception ignored) { }
        return null;
    }

    private static long parseLong(String s) {
        try { return Long.parseLong(s); } catch (Exception e) { return 0; }
    }

    // ---------------------------------------------------------------- escutar a fala

    @PluginMethod
    public void transcribe(PluginCall call) {
        final String path = call.getString("path");
        final String id = call.getString("id", "");
        io.execute(() -> {
            try {
                ensureModel();
                JSArray words = runVosk(path, id);
                JSObject ret = new JSObject();
                ret.put("words", words);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Não consegui ouvir o vídeo: " + e.getMessage());
            }
        });
    }

    private void ensureModel() throws Exception {
        if (voskModel != null) return;
        Context ctx = getContext();
        File dir = new File(ctx.getFilesDir(), "vosk-pt");
        File marker = new File(dir, "ok-v1");
        if (!marker.exists()) {
            deleteRec(dir);
            String[] top = ctx.getAssets().list("vosk-pt");
            if (top == null || top.length == 0) throw new Exception("modelo de voz não incluído no app");
            copyAssetDir(ctx, "vosk-pt", dir);
            marker.createNewFile();
        }
        voskModel = new Model(dir.getAbsolutePath());
    }

    private static void copyAssetDir(Context ctx, String asset, File dest) throws Exception {
        String[] kids = ctx.getAssets().list(asset);
        if (kids == null || kids.length == 0) {
            dest.getParentFile().mkdirs();
            try (InputStream in = ctx.getAssets().open(asset); OutputStream os = new FileOutputStream(dest)) {
                byte[] buf = new byte[1 << 16];
                int n;
                while ((n = in.read(buf)) > 0) os.write(buf, 0, n);
            }
            return;
        }
        dest.mkdirs();
        for (String k : kids) copyAssetDir(ctx, asset + "/" + k, new File(dest, k));
    }

    private static void deleteRec(File f) {
        if (f.isDirectory()) { File[] l = f.listFiles(); if (l != null) for (File c : l) deleteRec(c); }
        f.delete();
    }

    private JSArray runVosk(String path, String id) throws Exception {
        MediaExtractor ex = new MediaExtractor();
        ex.setDataSource(path);
        int track = -1;
        MediaFormat fmt = null;
        for (int i = 0; i < ex.getTrackCount(); i++) {
            MediaFormat f = ex.getTrackFormat(i);
            String m = f.getString(MediaFormat.KEY_MIME);
            if (m != null && m.startsWith("audio/")) { track = i; fmt = f; break; }
        }
        JSArray words = new JSArray();
        if (track < 0) { ex.release(); return words; }
        ex.selectTrack(track);
        long durUs = fmt.containsKey(MediaFormat.KEY_DURATION) ? fmt.getLong(MediaFormat.KEY_DURATION) : 0;
        int srcRate = fmt.getInteger(MediaFormat.KEY_SAMPLE_RATE);
        int channels = fmt.getInteger(MediaFormat.KEY_CHANNEL_COUNT);
        boolean isFloat = false;

        MediaCodec codec = MediaCodec.createDecoderByType(fmt.getString(MediaFormat.KEY_MIME));
        codec.configure(fmt, null, null, 0);
        codec.start();
        Recognizer rec = new Recognizer(voskModel, 16000f);
        rec.setWords(true);

        short[] chunk = new short[4000];
        int chunkLen = 0;
        double step = srcRate / 16000.0, nextOut = 0, prev = 0;
        long n = 0;
        boolean inDone = false, outDone = false;
        MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
        long lastNotify = 0;

        while (!outDone) {
            if (!inDone) {
                int ii = codec.dequeueInputBuffer(10_000);
                if (ii >= 0) {
                    ByteBuffer ib = codec.getInputBuffer(ii);
                    int sz = ex.readSampleData(ib, 0);
                    if (sz < 0) {
                        codec.queueInputBuffer(ii, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM);
                        inDone = true;
                    } else {
                        codec.queueInputBuffer(ii, 0, sz, ex.getSampleTime(), 0);
                        ex.advance();
                    }
                }
            }
            int oi = codec.dequeueOutputBuffer(info, 10_000);
            if (oi == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                MediaFormat of = codec.getOutputFormat();
                srcRate = of.getInteger(MediaFormat.KEY_SAMPLE_RATE);
                channels = of.getInteger(MediaFormat.KEY_CHANNEL_COUNT);
                step = srcRate / 16000.0;
                if (Build.VERSION.SDK_INT >= 24 && of.containsKey(MediaFormat.KEY_PCM_ENCODING)) {
                    isFloat = of.getInteger(MediaFormat.KEY_PCM_ENCODING) == android.media.AudioFormat.ENCODING_PCM_FLOAT;
                }
            } else if (oi >= 0) {
                ByteBuffer ob = codec.getOutputBuffer(oi);
                ob.position(info.offset);
                ob.limit(info.offset + info.size);
                ob.order(ByteOrder.nativeOrder());
                int bytesPer = isFloat ? 4 : 2;
                int frames = info.size / (bytesPer * channels);
                for (int f = 0; f < frames; f++) {
                    double s = 0;
                    for (int c = 0; c < channels; c++) {
                        s += isFloat ? ob.getFloat() * 32767.0 : ob.getShort();
                    }
                    s /= channels;
                    while (nextOut <= n) {
                        double frac = 1.0 - (n - nextOut);
                        double v = prev + (s - prev) * Math.max(0, Math.min(1, frac));
                        chunk[chunkLen++] = (short) Math.max(-32768, Math.min(32767, v));
                        if (chunkLen == chunk.length) {
                            if (rec.acceptWaveForm(chunk, chunkLen)) collect(rec.getResult(), words);
                            chunkLen = 0;
                        }
                        nextOut += step;
                    }
                    prev = s;
                    n++;
                }
                if (durUs > 0 && System.currentTimeMillis() - lastNotify > 250) {
                    lastNotify = System.currentTimeMillis();
                    JSObject p = new JSObject();
                    p.put("id", id);
                    p.put("p", Math.min(0.99, info.presentationTimeUs / (double) durUs));
                    notifyListeners("transcribeProgress", p);
                }
                codec.releaseOutputBuffer(oi, false);
                if ((info.flags & MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) outDone = true;
            }
        }
        if (chunkLen > 0) rec.acceptWaveForm(chunk, chunkLen);
        collect(rec.getFinalResult(), words);
        rec.close();
        codec.stop();
        codec.release();
        ex.release();
        return words;
    }

    private static void collect(String json, JSArray out) {
        try {
            JSONObject o = new JSONObject(json);
            JSONArray r = o.optJSONArray("result");
            if (r == null) return;
            for (int i = 0; i < r.length(); i++) {
                JSONObject w = r.getJSONObject(i);
                JSObject j = new JSObject();
                j.put("w", w.getString("word"));
                j.put("s", w.getDouble("start"));
                j.put("e", w.getDouble("end"));
                out.put(j);
            }
        } catch (Exception ignored) { }
    }

    // ---------------------------------------------------------------- montar o vídeo

    @PluginMethod
    public void render(PluginCall call) {
        final JSONObject spec = call.getData();
        main.post(() -> {
            try {
                startRender(call, spec);
            } catch (Exception e) {
                call.reject("Falha ao montar o vídeo: " + e.getMessage());
            }
        });
    }

    private void startRender(PluginCall call, JSONObject o) throws Exception {
        Context ctx = getContext();
        CineSpec spec = CineSpec.from(ctx, o);
        JSONArray segs = o.getJSONArray("segments");

        List<long[]> sfxEvents = new ArrayList<>(); // {timeUs, type}
        int mainSfx = SfxSynth.type(o.optString("sfx", "none"));
        if (mainSfx >= 0) sfxEvents.add(new long[]{120_000, mainSfx});
        for (double b : spec.boundaries) {
            if (mainSfx >= 0) sfxEvents.add(new long[]{(long) ((b - 0.35) * 1e6), SfxSynth.WHOOSH});
        }
        if (mainSfx >= 0) sfxEvents.add(new long[]{(long) (spec.ctaStart() * 1e6), SfxSynth.POP});

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

        File dir = new File(ctx.getCacheDir(), "exports");
        dir.mkdirs();
        File[] old = dir.listFiles();
        if (old != null) for (File f : old) f.delete();
        final File out = new File(dir, "FLUX-CINE-" + System.currentTimeMillis() + ".mp4");

        transformer = new Transformer.Builder(ctx)
                .setVideoMimeType(MimeTypes.VIDEO_H264)
                .setAudioMimeType(MimeTypes.AUDIO_AAC)
                .addListener(new Transformer.Listener() {
                    @Override
                    public void onCompleted(Composition c, ExportResult r) {
                        main.removeCallbacksAndMessages(null);
                        JSObject ret = new JSObject();
                        ret.put("path", out.getAbsolutePath());
                        ret.put("durationMs", r.durationMs);
                        call.resolve(ret);
                    }

                    @Override
                    public void onError(Composition c, ExportResult r, ExportException e) {
                        main.removeCallbacksAndMessages(null);
                        call.reject("Falha ao exportar: " + e.getMessage() + " (" + e.getErrorCodeName() + ")");
                    }
                })
                .build();
        transformer.start(composition, out.getAbsolutePath());

        final ProgressHolder ph = new ProgressHolder();
        main.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (transformer == null) return;
                if (transformer.getProgress(ph) == Transformer.PROGRESS_STATE_AVAILABLE) {
                    JSObject p = new JSObject();
                    p.put("p", ph.progress);
                    notifyListeners("renderProgress", p);
                }
                main.postDelayed(this, 250);
            }
        }, 250);
    }

    @PluginMethod
    public void cancelRender(PluginCall call) {
        main.post(() -> {
            if (transformer != null) transformer.cancel();
            main.removeCallbacksAndMessages(null);
            call.resolve();
        });
    }

    // ---------------------------------------------------------------- entregar

    @PluginMethod
    public void copyText(PluginCall call) {
        String t = call.getString("text", "");
        main.post(() -> {
            ClipboardManager cm = (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
            cm.setPrimaryClip(ClipData.newPlainText("Legenda FLUX CINE", t));
            call.resolve();
        });
    }

    @PluginMethod
    public void saveToGallery(PluginCall call) {
        final String path = call.getString("path");
        io.execute(() -> {
            try {
                Context ctx = getContext();
                File src = new File(path);
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues v = new ContentValues();
                    v.put(MediaStore.Video.Media.DISPLAY_NAME, src.getName());
                    v.put(MediaStore.Video.Media.MIME_TYPE, "video/mp4");
                    v.put(MediaStore.Video.Media.RELATIVE_PATH, Environment.DIRECTORY_MOVIES + "/FLUX CINE");
                    v.put(MediaStore.Video.Media.IS_PENDING, 1);
                    ContentResolver cr = ctx.getContentResolver();
                    Uri uri = cr.insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, v);
                    try (InputStream in = new FileInputStream(src); OutputStream os = cr.openOutputStream(uri)) {
                        byte[] buf = new byte[1 << 16];
                        int n;
                        while ((n = in.read(buf)) > 0) os.write(buf, 0, n);
                    }
                    v.clear();
                    v.put(MediaStore.Video.Media.IS_PENDING, 0);
                    cr.update(uri, v, null, null);
                    call.resolve();
                } else {
                    call.reject("Use o botão Compartilhar para salvar neste Android.", "UNSUPPORTED");
                }
            } catch (Exception e) {
                call.reject("Não consegui salvar: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void shareInstagram(PluginCall call) {
        share(call, true);
    }

    @PluginMethod
    public void share(PluginCall call) {
        share(call, false);
    }

    private void share(PluginCall call, boolean instagram) {
        final String path = call.getString("path");
        final String caption = call.getString("caption", "");
        main.post(() -> {
            try {
                Context ctx = getContext();
                if (!caption.isEmpty()) {
                    ClipboardManager cm = (ClipboardManager) ctx.getSystemService(Context.CLIPBOARD_SERVICE);
                    cm.setPrimaryClip(ClipData.newPlainText("Legenda FLUX CINE", caption));
                }
                Uri uri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", new File(path));
                Intent send = new Intent(Intent.ACTION_SEND);
                send.setType("video/mp4");
                send.putExtra(Intent.EXTRA_STREAM, uri);
                send.putExtra(Intent.EXTRA_TEXT, caption);
                send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                boolean hasInsta = false;
                if (instagram) {
                    try {
                        ctx.getPackageManager().getPackageInfo("com.instagram.android", 0);
                        hasInsta = true;
                    } catch (PackageManager.NameNotFoundException ignored) { }
                }
                if (instagram && hasInsta) {
                    send.setPackage("com.instagram.android");
                    getActivity().startActivity(send);
                } else {
                    getActivity().startActivity(Intent.createChooser(send, "Compartilhar vídeo"));
                }
                JSObject ret = new JSObject();
                ret.put("instagram", hasInsta);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Não consegui compartilhar: " + e.getMessage());
            }
        });
    }
}
