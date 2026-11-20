package com.fluxcine.app;

import android.content.Context;
import android.graphics.Bitmap;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.media.MediaMetadataRetriever;
import android.util.Log;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.junit.Assert.assertTrue;

/** Testes de ponta a ponta no aparelho: abre o app, escuta a fala, monta os vídeos e salva quadros. */
@RunWith(AndroidJUnit4.class)
public class ExportTest {
    private static final String TAG = "FLUXTEST";

    @Test
    public void appOpensAndShowsTemplates() throws Exception {
        Context target = InstrumentationRegistry.getInstrumentation().getTargetContext();
        try (androidx.test.core.app.ActivityScenario<MainActivity> sc = androidx.test.core.app.ActivityScenario.launch(MainActivity.class)) {
            String res = null;
            for (int i = 0; i < 20 && (res == null || !(res.contains("O que você mais gosta") || res.contains("títulos"))); i++) {
                Thread.sleep(1000);
                final String[] r = {null};
                final CountDownLatch l = new CountDownLatch(1);
                sc.onActivity(a -> a.getBridge().getWebView().evaluateJavascript(
                        "(window.__fluxReady||0) + '|' + document.getElementById('app').innerText.slice(0,120)",
                        v -> { r[0] = v; l.countDown(); }));
                l.await(5, TimeUnit.SECONDS);
                res = r[0];
            }
            Log.i(TAG, "ui=" + res);
            Thread.sleep(1500);
            Bitmap shot = InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
            if (shot != null) toDownloads(target, "ui_home.jpg", "image/jpeg", jpg(Bitmap.createScaledBitmap(shot, shot.getWidth() / 2, shot.getHeight() / 2, true)));
            assertTrue("tela inicial não carregou: " + res, res != null && (res.contains("O que você mais gosta") || res.contains("títulos")));
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
        JSONObject report = new JSONObject();
        long t0 = System.currentTimeMillis();
        JSONArray words = SpeechEngine.get(target).transcribe(in.getAbsolutePath(), null);
        report.put("transcribeMs", System.currentTimeMillis() - t0);
        report.put("words", words);
        Log.i(TAG, "words(" + words.length() + ")=" + words);
        StringBuilder heard = new StringBuilder();
        for (int i = 0; i < words.length(); i++) heard.append(words.getJSONObject(i).getString("w")).append(' ');
        report.put("heard", heard.toString().trim());

        MediaMetadataRetriever mr = new MediaMetadataRetriever();
        mr.setDataSource(in.getAbsolutePath());
        double dur = Long.parseLong(mr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)) / 1000.0;
        mr.release();

        // trechos de fala (sem silêncios); 2º trecho = gancho no início; último = final de impacto
        List<double[]> segs = new ArrayList<>();
        for (int i = 0; i < words.length(); i++) {
            JSONObject w = words.getJSONObject(i);
            double s = Math.max(0, w.getDouble("s") - 0.12), e = Math.min(dur, w.getDouble("e") + 0.2);
            if (!segs.isEmpty() && s - segs.get(segs.size() - 1)[1] < 0.45) segs.get(segs.size() - 1)[1] = Math.max(segs.get(segs.size() - 1)[1], e);
            else segs.add(new double[]{s, e});
        }
        if (segs.size() < 2) { segs.clear(); segs.add(new double[]{0, dur / 2}); segs.add(new double[]{dur / 2, dur}); }
        List<double[]> order = new ArrayList<>();
        order.add(segs.get(1)); order.add(segs.get(0));
        for (int i = 2; i < segs.size(); i++) order.add(segs.get(i));
        double hookDur = segs.get(1)[1] - segs.get(1)[0];

        String lj = new String(readAll(testCtx.getAssets().open("layouts.json")), "UTF-8");
        JSONObject layouts = new JSONObject(lj);
        JSONObject capBox = new JSONObject().put("fontFile", "Montserrat-800.ttf").put("upper", false).put("size", 1).put("ls", 0)
                .put("shadow", "outline").put("hl", "box").put("anim", "pop").put("y", 0.73).put("color", "#FFFFFF").put("accent", "#F2D13A");

        // A — cinemático: gancho no início, título Clássico, legenda caixa, final de impacto, CTA
        Plan pa = plan(in, words, new ArrayList<double[]>(), order, 0);
        for (int i = 1; i < pa.segments.length(); i += 2) pa.segments.getJSONObject(i).put("zoom", 1.08);
        JSONObject a = baseSpec(pa).put("titleLayout", layouts.getJSONArray("paraiso")).put("grade", layouts.getJSONObject("grade")).put("titleEnd", Math.max(2.6, Math.min(4.8, hookDur)))
                .put("captionStyle", capBox).put("cta", "Chama no WhatsApp").put("ending", "cut").put("sfx", "impact").put("quality", "hd");
        report.put("A", runExport(target, a, "A", new double[]{0.3, 1.2, a.getDouble("titleEnd") + 0.6, pa.finalStart + 0.05, pa.finalStart + 0.5, pa.total - 1.0}));

        // B — título Glitch, legenda Bangers com brilho e pulo, título movido para cima e menor
        JSONObject capGlow = new JSONObject(capBox.toString()).put("fontFile", "Bangers-400.ttf").put("upper", true).put("shadow", "glow").put("hl", "color").put("anim", "bounce").put("size", 1.25).put("ls", 0.04).put("y", 0.62).put("accent", "#00E5FF");
        JSONObject b = new JSONObject(a.toString()).put("titleLayout", layouts.getJSONArray("vlog")).put("captionStyle", capGlow)
                .put("titleTf", new JSONObject().put("ox", 0).put("oy", -420).put("s", 0.8)).put("cta", "").put("ending", "fade").put("sfx", "whoosh");
        report.put("B", runExport(target, b, "B", new double[]{0.25, 0.6, 1.5, b.getDouble("titleEnd") + 0.6, pa.finalStart + 0.3, pa.total - 0.5}));

        // D — dinâmico: chips (rápido, lento, pausa) sem áudio + mensagem + final de impacto
        List<double[]> chips = new ArrayList<>();
        chips.add(new double[]{1.0, 3.4, 2.0});
        chips.add(new double[]{5.0, 5.6, 0.5});
        chips.add(new double[]{8.0, 8.07, 0.1});
        chips.add(new double[]{11.0, 11.9, 1.0});
        Plan pd = plan(in, words, chips, segs, 1);
        JSONObject d = baseSpec(pd).put("titleLayout", layouts.getJSONArray("tudo")).put("titleEnd", Math.max(2.6, Math.min(6, pd.montage)))
                .put("captionStyle", new JSONObject(capBox.toString()).put("fontFile", "Anton-400.ttf").put("upper", true).put("shadow", "hard").put("anim", "type"))
                .put("cta", "").put("ending", "fade").put("sfx", "impact").put("quality", "hd");
        report.put("D", runExport(target, d, "D", new double[]{0.4, 1.3, 2.2, pd.montage - 0.3, pd.montage + 0.8, pd.finalStart + 0.3}));
        report.put("D_expected", pd.total);

        // K — 4K curto com o título Etiqueta
        JSONArray seg4 = new JSONArray().put(new JSONObject().put("path", in.getAbsolutePath()).put("startMs", 1500).put("endMs", 4000));
        JSONObject k = new JSONObject().put("segments", seg4).put("captions", new JSONArray()).put("boundaries", new JSONArray())
                .put("titleLayout", layouts.getJSONArray("caixa")).put("titleEnd", 2.4).put("quality", "4k").put("sfx", "pop").put("captionStyle", capBox);
        report.put("K", runExport(target, k, "K", new double[]{0.3, 0.8, 1.6, 2.2, 2.3, 2.4}));

        toDownloads(target, "report.json", "application/json", report.toString(2).getBytes("UTF-8"));
        assertTrue("Whisper não ouviu a fala: " + heard, words.length() >= 12);
        String low = heard.toString().toLowerCase();
        assertTrue("transcrição errada: " + heard, low.contains("todos os dias") && low.contains("?"));
        Log.i(TAG, "report=" + report);
        for (String key : new String[]{"A", "B", "D", "K"}) {
            assertTrue("export " + key + " falhou: " + report.getJSONObject(key).optString("error"), report.getJSONObject(key).optBoolean("ok"));
        }
    }

    /** Linha do tempo como o app monta: chips (com velocidade, sem áudio) e depois os trechos falados. */
    static final class Plan {
        JSONArray segments = new JSONArray(), captions = new JSONArray(), boundaries = new JSONArray();
        double total, montage, finalStart = -1;
    }

    private static Plan plan(File in, JSONArray words, List<double[]> chips, List<double[]> talk, int skip) throws Exception {
        Plan p = new Plan();
        double out = 0;
        for (int i = 0; i < chips.size(); i++) {
            double[] c = chips.get(i);
            if (i > 0) p.boundaries.put(out);
            p.segments.put(new JSONObject().put("path", in.getAbsolutePath()).put("startMs", Math.round(c[0] * 1000)).put("endMs", Math.round(c[1] * 1000)).put("speed", c[2]).put("removeAudio", true));
            out += (c[1] - c[0]) / c[2];
        }
        p.montage = out;
        if (out > 0) p.boundaries.put(out);
        else if (talk.size() > 1) p.boundaries.put(talk.get(0)[1] - talk.get(0)[0]);
        JSONObject cur = null;
        for (int g = 0; g < talk.size(); g++) {
            double[] s = talk.get(g);
            if (g == talk.size() - 1 && talk.size() > 1) p.finalStart = out;
            p.segments.put(new JSONObject().put("path", in.getAbsolutePath()).put("startMs", Math.round(s[0] * 1000)).put("endMs", Math.round(s[1] * 1000)));
            for (int i = 0; i < words.length(); i++) {
                JSONObject w = words.getJSONObject(i);
                if (w.getDouble("s") >= s[0] - 0.02 && w.getDouble("e") <= s[1] + 0.02) {
                    double ws = out + w.getDouble("s") - s[0], we = out + w.getDouble("e") - s[0];
                    if (cur == null || cur.getJSONArray("words").length() >= 3 || (p.finalStart >= 0 && ws >= p.finalStart && cur.getDouble("s") < p.finalStart)) {
                        cur = new JSONObject().put("s", ws).put("e", we).put("words", new JSONArray());
                        p.captions.put(cur);
                    }
                    cur.getJSONArray("words").put(new JSONObject().put("w", w.getString("w")).put("s", ws).put("e", we));
                    cur.put("e", we + 0.3);
                }
            }
            out += s[1] - s[0];
        }
        p.total = out;
        return p;
    }

    private static JSONObject baseSpec(Plan p) throws Exception {
        return new JSONObject().put("segments", p.segments).put("captions", p.captions).put("boundaries", p.boundaries).put("finalStart", p.finalStart);
    }

    private JSONObject runExport(Context ctx, JSONObject spec, String tag, double[] ts) throws Exception {
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
        boolean finished = latch.await(600, TimeUnit.SECONDS);
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
        r.put("rotation", mr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION));
        MediaExtractor ex = new MediaExtractor();
        ex.setDataSource(out.getAbsolutePath());
        for (int i = 0; i < ex.getTrackCount(); i++) {
            MediaFormat f = ex.getTrackFormat(i);
            String mime = f.getString(MediaFormat.KEY_MIME);
            if (f.containsKey(MediaFormat.KEY_DURATION)) r.put(mime.startsWith("audio") ? "audioDur" : "videoDur", f.getLong(MediaFormat.KEY_DURATION) / 1e6);
        }
        ex.release();
        for (int i = 0; i < ts.length; i++) {
            Bitmap f = mr.getFrameAtTime((long) (Math.max(0, Math.min(d - 0.05, ts[i])) * 1e6), MediaMetadataRetriever.OPTION_CLOSEST);
            if (f == null) continue;
            Bitmap s = f.getWidth() > f.getHeight() ? Bitmap.createScaledBitmap(f, 640, 360, true) : Bitmap.createScaledBitmap(f, 360, 640, true);
            toDownloads(ctx, tag + "_" + i + ".jpg", "image/jpeg", jpg(s));
        }
        mr.release();
        return r;
    }

    private static byte[] jpg(Bitmap b) {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        b.compress(Bitmap.CompressFormat.JPEG, 80, bos);
        return bos.toByteArray();
    }

    private static byte[] readAll(InputStream is) throws Exception {
        try (InputStream in = is) {
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            byte[] bb = new byte[8192];
            int k;
            while ((k = in.read(bb)) > 0) bo.write(bb, 0, k);
            return bo.toByteArray();
        }
    }

    private static void toDownloads(Context ctx, String name, String mime, byte[] data) throws Exception {
        android.content.ContentValues v = new android.content.ContentValues();
        v.put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, name);
        v.put(android.provider.MediaStore.MediaColumns.MIME_TYPE, mime);
        v.put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH, "Download/fluxtest");
        android.net.Uri uri = ctx.getContentResolver().insert(android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
        try (OutputStream os = ctx.getContentResolver().openOutputStream(uri)) { os.write(data); }
    }
}
