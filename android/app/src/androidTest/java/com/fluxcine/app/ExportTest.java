package com.fluxcine.app;

import android.content.Context;
import android.graphics.Bitmap;
import android.media.MediaMetadataRetriever;
import android.util.Log;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.junit.Assert.assertTrue;

/** Teste de ponta a ponta no aparelho: escuta a fala, corta silêncios, exporta e salva quadros para conferência. */
@RunWith(AndroidJUnit4.class)
public class ExportTest {
    private static final String TAG = "FLUXTEST";

    @Test
    public void appOpensAndShowsTemplates() throws Exception {
        Context target = InstrumentationRegistry.getInstrumentation().getTargetContext();
        try (androidx.test.core.app.ActivityScenario<MainActivity> sc = androidx.test.core.app.ActivityScenario.launch(MainActivity.class)) {
            String res = null;
            for (int i = 0; i < 20 && (res == null || !res.startsWith("\"6")); i++) {
                Thread.sleep(1000);
                final String[] r = {null};
                final CountDownLatch l = new CountDownLatch(1);
                sc.onActivity(a -> a.getBridge().getWebView().evaluateJavascript(
                        "document.querySelectorAll('.card').length + '|' + (document.querySelector('.badge')||{}).innerText + '|' + document.getElementById('app').innerText.slice(0,80)",
                        v -> { r[0] = v; l.countDown(); }));
                l.await(5, TimeUnit.SECONDS);
                res = r[0];
            }
            Log.i(TAG, "ui=" + res);
            Thread.sleep(1500);
            Bitmap shot = InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
            if (shot != null) {
                java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
                Bitmap.createScaledBitmap(shot, shot.getWidth() / 2, shot.getHeight() / 2, true).compress(Bitmap.CompressFormat.JPEG, 80, bos);
                toDownloads(target, "ui_home.jpg", "image/jpeg", bos.toByteArray());
            }
            assertTrue("tela inicial não carregou: " + res, res != null && res.startsWith("\"6|Edita no seu celular"));
        }
    }

    @Test
    public void transcribeCutAndExport() throws Exception {
        Context target = InstrumentationRegistry.getInstrumentation().getTargetContext();
        Context testCtx = InstrumentationRegistry.getInstrumentation().getContext();
        File in = new File(target.getCacheDir(), "test.mp4");
        try (InputStream is = testCtx.getAssets().open("test.mp4"); OutputStream os = new FileOutputStream(in)) {
            byte[] b = new byte[1 << 16];
            int n;
            while ((n = is.read(b)) > 0) os.write(b, 0, n);
        }
        File frames = new File(target.getExternalFilesDir(null), "frames");
        frames.mkdirs();
        JSONObject report = new JSONObject();

        long t0 = System.currentTimeMillis();
        JSONArray words = SpeechEngine.get(target).transcribe(in.getAbsolutePath(), null);
        report.put("transcribeMs", System.currentTimeMillis() - t0);
        report.put("words", words);
        Log.i(TAG, "words(" + words.length() + ")=" + words);

        MediaMetadataRetriever mr = new MediaMetadataRetriever();
        mr.setDataSource(in.getAbsolutePath());
        double dur = Long.parseLong(mr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)) / 1000.0;
        mr.release();

        // mesmo plano que o app faz: trechos de fala (sem silêncios) + legendas de até 3 palavras
        List<double[]> segs = new ArrayList<>();
        for (int i = 0; i < words.length(); i++) {
            JSONObject w = words.getJSONObject(i);
            double s = Math.max(0, w.getDouble("s") - 0.12), e = Math.min(dur, w.getDouble("e") + 0.2);
            if (!segs.isEmpty() && s - segs.get(segs.size() - 1)[1] < 0.45) segs.get(segs.size() - 1)[1] = Math.max(segs.get(segs.size() - 1)[1], e);
            else segs.add(new double[]{s, e});
        }
        if (segs.isEmpty()) { segs.add(new double[]{0, dur / 2}); segs.add(new double[]{dur / 2, dur}); }

        JSONArray segments = new JSONArray();
        JSONArray captions = new JSONArray();
        double out = 0;
        JSONObject cur = null;
        for (double[] g : segs) {
            segments.put(new JSONObject().put("path", in.getAbsolutePath()).put("startMs", Math.round(g[0] * 1000)).put("endMs", Math.round(g[1] * 1000)));
            for (int i = 0; i < words.length(); i++) {
                JSONObject w = words.getJSONObject(i);
                if (w.getDouble("s") >= g[0] - 0.02 && w.getDouble("e") <= g[1] + 0.02) {
                    double s = out + w.getDouble("s") - g[0], e = out + w.getDouble("e") - g[0];
                    if (cur == null || cur.getJSONArray("words").length() >= 3) {
                        cur = new JSONObject().put("s", s).put("e", e).put("words", new JSONArray());
                        captions.put(cur);
                    }
                    cur.getJSONArray("words").put(new JSONObject().put("w", w.getString("w")).put("s", s).put("e", e));
                    cur.put("e", e + 0.3);
                }
            }
            out += g[1] - g[0];
        }
        if (captions.length() == 0) {
            captions.put(new JSONObject().put("s", 1.0).put("e", 2.6).put("words", new JSONArray()
                    .put(new JSONObject().put("w", "três").put("s", 1.0).put("e", 1.4))
                    .put(new JSONObject().put("w", "erros").put("s", 1.4).put("e", 1.9))
                    .put(new JSONObject().put("w", "graves").put("s", 1.9).put("e", 2.4))));
        }
        report.put("segments", segments.length());
        report.put("cutDuration", out);
        report.put("originalDuration", dur);

        JSONObject a = new JSONObject()
                .put("segments", segments).put("captions", captions)
                .put("boundaries", new JSONArray().put(segs.size() > 1 ? segs.get(0)[1] - segs.get(0)[0] : out / 2))
                .put("title", "3 erros que te fazem perder clientes").put("fontFile", "Anton-400.ttf").put("upper", true)
                .put("accent", "#FFB020").put("hlMode", "box").put("letterbox", true)
                .put("cta", "Chama no WhatsApp").put("ending", "logo").put("sfx", "impact");
        report.put("A", runExport(target, a, frames, "A"));

        JSONObject b = new JSONObject(a.toString())
                .put("fontFile", "Unbounded-800.ttf").put("upper", false).put("accent", "#D4FF3A")
                .put("letterbox", false).put("hlMode", "underline").put("ending", "zoom").put("sfx", "whoosh")
                .put("title", "O segredo que ninguém conta");
        report.put("B", runExport(target, b, frames, "B"));

        toDownloads(target, "report.json", "application/json", report.toString(2).getBytes("UTF-8"));
        Log.i(TAG, "report=" + report);
        assertTrue("export A falhou: " + report.getJSONObject("A").optString("error"), report.getJSONObject("A").optBoolean("ok"));
        assertTrue("export B falhou: " + report.getJSONObject("B").optString("error"), report.getJSONObject("B").optBoolean("ok"));
    }

    private static void toDownloads(Context ctx, String name, String mime, byte[] data) throws Exception {
        android.content.ContentValues v = new android.content.ContentValues();
        v.put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, name);
        v.put(android.provider.MediaStore.MediaColumns.MIME_TYPE, mime);
        v.put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH, "Download/fluxtest");
        android.net.Uri uri = ctx.getContentResolver().insert(android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
        try (OutputStream os = ctx.getContentResolver().openOutputStream(uri)) { os.write(data); }
    }

    private JSONObject runExport(Context ctx, JSONObject spec, File frames, String tag) throws Exception {
        JSONObject r = new JSONObject();
        File out = new File(ctx.getCacheDir(), "out_" + tag + ".mp4");
        out.delete();
        CountDownLatch latch = new CountDownLatch(1);
        final String[] err = {null};
        long t0 = System.currentTimeMillis();
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> {
            try {
                new CineExporter().export(ctx, spec, out, new CineExporter.Listener() {
                    @Override public void onProgress(int p) { }
                    @Override public void onDone(long d) { latch.countDown(); }
                    @Override public void onError(String m) { err[0] = m; latch.countDown(); }
                });
            } catch (Exception e) {
                err[0] = e.toString();
                latch.countDown();
            }
        });
        boolean finished = latch.await(300, TimeUnit.SECONDS);
        r.put("ms", System.currentTimeMillis() - t0);
        if (!finished) err[0] = "timeout";
        if (err[0] != null) { r.put("ok", false); r.put("error", err[0]); Log.e(TAG, tag + " " + err[0]); return r; }
        MediaMetadataRetriever mr = new MediaMetadataRetriever();
        mr.setDataSource(out.getAbsolutePath());
        double d = Long.parseLong(mr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)) / 1000.0;
        r.put("ok", out.length() > 20_000);
        r.put("bytes", out.length());
        r.put("duration", d);
        r.put("size", mr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH) + "x" + mr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT));
        r.put("hasAudio", mr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_HAS_AUDIO));
        r.put("rotation", mr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION));
        double[] ts = {0.35, 0.7, 1.6, d * 0.5, d - 1.6, d - 0.4};
        for (int i = 0; i < ts.length; i++) {
            Bitmap f = mr.getFrameAtTime((long) (Math.max(0, ts[i]) * 1e6), MediaMetadataRetriever.OPTION_CLOSEST);
            if (f == null) continue;
            Bitmap s = Bitmap.createScaledBitmap(f, 360, 640, true);
            java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
            s.compress(Bitmap.CompressFormat.JPEG, 80, bos);
            toDownloads(ctx, tag + "_" + i + ".jpg", "image/jpeg", bos.toByteArray());
        }
        mr.release();
        return r;
    }
}
