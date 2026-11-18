package com.fluxcine.app;

import android.content.Context;
import android.media.MediaCodec;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;
import org.vosk.Model;
import org.vosk.Recognizer;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

/** Escuta a fala do vídeo (offline, Vosk português) e devolve cada palavra com início e fim. */
final class SpeechEngine {
    interface Progress { void on(double p); }

    private static SpeechEngine instance;
    private final Context ctx;
    private Model model;

    private SpeechEngine(Context c) { ctx = c.getApplicationContext(); }

    static synchronized SpeechEngine get(Context c) {
        if (instance == null) instance = new SpeechEngine(c);
        return instance;
    }

    private synchronized void ensureModel() throws Exception {
        if (model != null) return;
        File dir = new File(ctx.getFilesDir(), "vosk-pt");
        File marker = new File(dir, "ok-v1");
        if (!marker.exists()) {
            deleteRec(dir);
            String[] top = ctx.getAssets().list("vosk-pt");
            if (top == null || top.length == 0) throw new Exception("modelo de voz não incluído no app");
            copyAssetDir("vosk-pt", dir);
            marker.createNewFile();
        }
        model = new Model(dir.getAbsolutePath());
    }

    private void copyAssetDir(String asset, File dest) throws Exception {
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
        for (String k : kids) copyAssetDir(asset + "/" + k, new File(dest, k));
    }

    private static void deleteRec(File f) {
        if (f.isDirectory()) { File[] l = f.listFiles(); if (l != null) for (File c : l) deleteRec(c); }
        f.delete();
    }

    JSONArray transcribe(String path, Progress progress) throws Exception {
        ensureModel();
        JSONArray words = new JSONArray();
        MediaExtractor ex = new MediaExtractor();
        ex.setDataSource(path);
        int track = -1;
        MediaFormat fmt = null;
        for (int i = 0; i < ex.getTrackCount(); i++) {
            MediaFormat f = ex.getTrackFormat(i);
            String m = f.getString(MediaFormat.KEY_MIME);
            if (m != null && m.startsWith("audio/")) { track = i; fmt = f; break; }
        }
        if (track < 0) { ex.release(); return words; }
        ex.selectTrack(track);
        long durUs = fmt.containsKey(MediaFormat.KEY_DURATION) ? fmt.getLong(MediaFormat.KEY_DURATION) : 0;
        int srcRate = fmt.getInteger(MediaFormat.KEY_SAMPLE_RATE);
        int channels = fmt.getInteger(MediaFormat.KEY_CHANNEL_COUNT);
        boolean isFloat = false;

        MediaCodec codec = MediaCodec.createDecoderByType(fmt.getString(MediaFormat.KEY_MIME));
        codec.configure(fmt, null, null, 0);
        codec.start();
        Recognizer rec = new Recognizer(model, 16000f);
        rec.setWords(true);

        short[] chunk = new short[4000];
        int chunkLen = 0;
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
                        for (int c = 0; c < channels; c++) s += isFloat ? ob.getFloat() * 32767.0 : ob.getShort();
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
                    if (progress != null && durUs > 0 && System.currentTimeMillis() - lastNotify > 250) {
                        lastNotify = System.currentTimeMillis();
                        progress.on(Math.min(0.99, info.presentationTimeUs / (double) durUs));
                    }
                    codec.releaseOutputBuffer(oi, false);
                    if ((info.flags & MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) outDone = true;
                }
            }
            if (chunkLen > 0) rec.acceptWaveForm(chunk, chunkLen);
            collect(rec.getFinalResult(), words);
        } finally {
            rec.close();
            codec.stop();
            codec.release();
            ex.release();
        }
        return words;
    }

    private static void collect(String json, JSONArray out) {
        try {
            JSONObject o = new JSONObject(json);
            JSONArray r = o.optJSONArray("result");
            if (r == null) return;
            for (int i = 0; i < r.length(); i++) {
                JSONObject w = r.getJSONObject(i);
                JSONObject j = new JSONObject();
                j.put("w", w.getString("word"));
                j.put("s", w.getDouble("start"));
                j.put("e", w.getDouble("end"));
                out.put(j);
            }
        } catch (Exception ignored) { }
    }
}
