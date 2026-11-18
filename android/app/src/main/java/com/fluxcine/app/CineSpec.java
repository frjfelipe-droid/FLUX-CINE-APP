package com.fluxcine.app;

import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/** Tudo o que o vídeo final precisa saber: título, legendas, CTA, final e estilo. */
final class CineSpec {
    static final int W = 1080, H = 1920;

    static final class Chunk {
        double s, e;
        String[] words;
        double[] ws, we;
    }

    String title = "";
    String cta = "";
    String ending = "logo";
    String hlMode = "box";
    boolean upper, letterbox;
    int accent = Color.rgb(255, 122, 26);
    Typeface font, labelFont;
    double total;
    double[] boundaries = new double[0];
    final List<Chunk> chunks = new ArrayList<>();
    List<TitleLayer> layers = new ArrayList<>();
    double titleEnd = 0;
    int outW = W, outH = H;

    double ctaStart() {
        return Math.max(0.6, total - (ending.equals("logo") ? 2.4 : 3.2));
    }

    static CineSpec from(Context ctx, JSONObject o) throws Exception {
        CineSpec s = new CineSpec();
        s.title = o.optString("title", "");
        s.cta = o.optString("cta", "");
        s.ending = o.optString("ending", "logo");
        s.hlMode = o.optString("hlMode", "box");
        s.upper = o.optBoolean("upper", false);
        s.letterbox = o.optBoolean("letterbox", false);
        try { s.accent = Color.parseColor(o.optString("accent", "#FF7A1A")); } catch (Exception ignored) { }
        try {
            s.font = Typeface.createFromAsset(ctx.getAssets(), "fonts/" + o.optString("fontFile", "Unbounded-800.ttf"));
        } catch (Exception e) {
            s.font = Typeface.DEFAULT_BOLD;
        }
        try {
            s.labelFont = Typeface.createFromAsset(ctx.getAssets(), "fonts/Inter-700.ttf");
        } catch (Exception e) {
            s.labelFont = Typeface.DEFAULT_BOLD;
        }
        s.layers = TitleLayer.parse(ctx, o.optJSONArray("titleLayout"));
        s.titleEnd = o.optDouble("titleEnd", s.layers.isEmpty() ? 0 : 3.4);
        if ("4k".equals(o.optString("quality", "hd"))) { s.outW = W * 2; s.outH = H * 2; }
        JSONArray segs = o.getJSONArray("segments");
        double t = 0;
        for (int i = 0; i < segs.length(); i++) {
            JSONObject g = segs.getJSONObject(i);
            t += (g.getLong("endMs") - g.getLong("startMs")) / 1000.0;
        }
        s.total = t;
        JSONArray b = o.optJSONArray("boundaries");
        if (b != null) {
            s.boundaries = new double[b.length()];
            for (int i = 0; i < b.length(); i++) s.boundaries[i] = b.getDouble(i);
        }
        JSONArray caps = o.optJSONArray("captions");
        if (caps != null) {
            for (int i = 0; i < caps.length(); i++) {
                JSONObject c = caps.getJSONObject(i);
                JSONArray w = c.getJSONArray("words");
                Chunk k = new Chunk();
                k.s = c.getDouble("s");
                k.e = c.getDouble("e");
                k.words = new String[w.length()];
                k.ws = new double[w.length()];
                k.we = new double[w.length()];
                for (int j = 0; j < w.length(); j++) {
                    JSONObject x = w.getJSONObject(j);
                    k.words[j] = x.getString("w");
                    k.ws[j] = x.getDouble("s");
                    k.we[j] = x.getDouble("e");
                }
                s.chunks.add(k);
            }
        }
        return s;
    }
}
