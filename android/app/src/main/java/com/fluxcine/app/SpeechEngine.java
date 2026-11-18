package com.fluxcine.app;

import android.content.Context;
import android.media.MediaCodec;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

/**
 * Escuta a fala do vídeo com o Whisper (offline, no aparelho) e devolve cada palavra
 * com início, fim, confiança e pontuação ("?" ajuda a achar o gancho).
 */
final class SpeechEngine {
    interface Progress { void on(double p); }

    static final String BASE = "ggml-base-q5_1.bin";
    static final String SMALL = "ggml-small-q5_1.bin";
    private static final String PROMPT = "Olá, tudo bem? Hoje eu vou te mostrar como vender mais. Você sabia disso? Então presta atenção.";

    private static SpeechEngine instance;
    private final Context ctx;
    private long handle;
    private String loaded;

    private SpeechEngine(Context c) { ctx = c.getApplicationContext(); }

    static synchronized SpeechEngine get(Context c) {
        if (instance == null) instance = new SpeechEngine(c);
        return instance;
    }

    static File modelDir(Context c) { File d = new File(c.getFilesDir(), "whisper"); d.mkdirs(); return d; }

    /** O modelo "preciso" (small) é baixado sob demanda; o básico vem dentro do app. */
    private synchronized void ensureModel() throws Exception {
        File small = new File(modelDir(ctx), SMALL);
        File base = new File(modelDir(ctx), BASE);
        File want = small.exists() && small.length() > 100_000_000L ? small : base;
        if (want == base && (!base.exists() || base.length() < 1_000_000L)) {
            try (InputStream in = ctx.getAssets().open("whisper/" + BASE); OutputStream os = new FileOutputStream(base)) {
                byte[] buf = new byte[1 << 16];
                int n;
                while ((n = in.read(buf)) > 0) os.write(buf, 0, n);
            } catch (Exception e) {
                base.delete();
                throw new Exception("modelo de voz não incluído no app");
            }
        }
        if (handle != 0 && want.getName().equals(loaded)) return;
        if (handle != 0) { Whisper.nativeFree(handle); handle = 0; }
        handle = Whisper.nativeInit(want.getAbsolutePath());
        if (handle == 0) throw new Exception("não consegui carregar o modelo de voz");
        loaded = want.getName();
    }

    synchronized void release() { if (handle != 0) { Whisper.nativeFree(handle); handle = 0; loaded = null; } }

    JSONArray transcribe(String path, Progress progress) throws Exception {
        float[] pcm = decode16k(path, p -> { if (progress != null) progress.on(p * 0.15); });
        JSONArray out = new JSONArray();
        if (pcm.length < 8000) return out;
        normalize(pcm);
        ensureModel();
        int threads = Math.max(2, Math.min(6, Runtime.getRuntime().availableProcessors() - 1));
        String raw;
        synchronized (this) {
            raw = Whisper.nativeTranscribe(handle, pcm, threads, "pt", PROMPT, pc -> { if (progress != null) progress.on(0.15 + 0.85 * pc / 100.0); });
        }
        JSONArray in = new JSONArray(raw);
        double lastE = 0;
        for (int i = 0; i < in.length(); i++) {
            JSONObject o = in.getJSONObject(i);
            String w = o.getString("w").trim();
            if (w.isEmpty() || w.startsWith("[") || w.startsWith("(") || w.startsWith("*") || w.startsWith("♪")) continue;
            double s = o.getDouble("s"), e = o.getDouble("e");
            // pontuação solta ("?", ",") vira parte da palavra anterior
            if (w.matches("^[\\p{Punct}…¿¡]+$")) {
                if (out.length() > 0) { JSONObject prev = out.getJSONObject(out.length() - 1); prev.put("w", prev.getString("w") + w.replaceAll("[¿¡]", "")); }
                continue;
            }
            if (s < lastE - 0.05) s = lastE;
            if (e <= s) e = s + 0.12;
            JSONObject wd = new JSONObject();
            wd.put("w", w);
            wd.put("s", s);
            wd.put("e", e);
            wd.put("c", o.optDouble("c", 0.5));
            out.put(wd);
            lastE = e;
        }
        if (progress != null) progress.on(1.0);
        return out;
    }

    private static void normalize(float[] a) {
        float peak = 0;
        for (float v : a) peak = Math.max(peak, Math.abs(v));
        if (peak < 1e-4f || peak > 0.6f) return;
        float g = Math.min(8f, 0.7f / peak);
        for (int i = 0; i < a.length; i++) a[i] *= g;
    }

    /** Decodifica o áudio do vídeo para mono 16 kHz em float [-1, 1]. */
    static float[] decode16k(String path, Progress progress) throws Exception {
        MediaExtractor ex = new MediaExtractor();
        ex.setDataSource(path);
        int track = -1;
        MediaFormat fmt = null;
        for (int i = 0; i < ex.getTrackCount(); i++) {
            MediaFormat f = ex.getTrackFormat(i);
            String m = f.getString(MediaFormat.KEY_MIME);
            if (m != null && m.startsWith("audio/")) { track = i; fmt = f; break; }
        }
        if (track < 0) { ex.release(); return new float[0]; }
        ex.selectTrack(track);
        long durUs = fmt.containsKey(MediaFormat.KEY_DURATION) ? fmt.getLong(MediaFormat.KEY_DURATION) : 0;
        int srcRate = fmt.getInteger(MediaFormat.KEY_SAMPLE_RATE);
        int channels = fmt.getInteger(MediaFormat.KEY_CHANNEL_COUNT);
        boolean isFloat = false;
        MediaCodec codec = MediaCodec.createDecoderByType(fmt.getString(MediaFormat.KEY_MIME));
        codec.configure(fmt, null, null, 0);
        codec.start();

        float[] buf = new float[Math.max(16000, (int) (durUs / 1e6 * 16000) + 16000)];
        int len = 0;
        double step = srcRate / 16000.0, nextOut = 0, prev = 0;
        long n = 0;
        boolean inDone = false, outDone = false;
        MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
        long lastNotify = 0;
        try {
            while (!outDone) {
                if (!inDone) {
                    int ii = codec.dequeueInputBuffer(10_000);
                    if (ii >= 0) {
                        ByteBuffer ib = codec.getInputBuffer(ii);
                        int sz = ex.readSampleData(ib, 0);
                        if (sz < 0) { codec.queueInputBuffer(ii, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM); inDone = true; }
                        else { codec.queueInputBuffer(ii, 0, sz, ex.getSampleTime(), 0); ex.advance(); }
                    }
                }
                int oi = codec.dequeueOutputBuffer(info, 10_000);
                if (oi == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                    MediaFormat of = codec.getOutputFormat();
                    srcRate = of.getInteger(MediaFormat.KEY_SAMPLE_RATE);
                    channels = of.getInteger(MediaFormat.KEY_CHANNEL_COUNT);
                    step = srcRate / 16000.0;
                    if (Build.VERSION.SDK_INT >= 24 && of.containsKey(MediaFormat.KEY_PCM_ENCODING))
                        isFloat = of.getInteger(MediaFormat.KEY_PCM_ENCODING) == android.media.AudioFormat.ENCODING_PCM_FLOAT;
                } else if (oi >= 0) {
                    ByteBuffer ob = codec.getOutputBuffer(oi);
                    ob.position(info.offset);
                    ob.limit(info.offset + info.size);
                    ob.order(ByteOrder.nativeOrder());
                    int bytesPer = isFloat ? 4 : 2;
                    int frames = info.size / (bytesPer * channels);
                    for (int f = 0; f < frames; f++) {
                        double s = 0;
                        for (int c = 0; c < channels; c++) s += isFloat ? ob.getFloat() : ob.getShort() / 32768.0;
                        s /= channels;
                        while (nextOut <= n) {
                            double frac = 1.0 - (n - nextOut);
                            double v = prev + (s - prev) * Math.max(0, Math.min(1, frac));
                            if (len == buf.length) buf = java.util.Arrays.copyOf(buf, buf.length * 2);
                            buf[len++] = (float) Math.max(-1, Math.min(1, v));
                            nextOut += step;
                        }
                        prev = s;
                        n++;
                    }
                    if (progress != null && durUs > 0 && info.presentationTimeUs - lastNotify > 400_000) {
                        lastNotify = info.presentationTimeUs;
                        progress.on(Math.min(1, info.presentationTimeUs / (double) durUs));
                    }
                    codec.releaseOutputBuffer(oi, false);
                    if ((info.flags & MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) outDone = true;
                }
            }
        } finally {
            try { codec.stop(); } catch (Exception ignored) {}
            codec.release();
            ex.release();
        }
        return java.util.Arrays.copyOf(buf, len);
    }
}
