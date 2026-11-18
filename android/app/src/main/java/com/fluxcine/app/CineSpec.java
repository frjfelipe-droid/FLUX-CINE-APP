package com.fluxcine.app;

import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/** Tudo o que o vídeo final precisa saber: título, legendas e estilo, CTA, final, cortes e qualidade. */
final class CineSpec {
    static final int W = 1080, H = 1920;

    static final class Chunk {
        double s, e;
        String[] words;
        double[] ws, we;
    }

    /** Estilo da legenda escolhido no app (fonte, tamanho, espaçamento, sombra, efeito, destaque, posição, cor). */
    static final class CapStyle {
        Typeface font;
        boolean upper;
        float size = 1, ls = 0, y = 0.73f;
        String shadow = "outline", hl = "box", anim = "pop";
        int color = Color.WHITE, accent = Color.rgb(255, 122, 26);
    }

    String cta = "";
    String ending = "fade";
    int accent = Color.rgb(255, 122, 26);
    Typeface labelFont;
    double total;
    double[] boundaries = new double[0];
    final List<Chunk> chunks = new ArrayList<>();
    List<TitleLayer> layers = new ArrayList<>();
    double titleEnd = 0, finalStart = -1;
    float tfX = 0, tfY = 0, tfS = 1;
    int outW = W, outH = H;
    final CapStyle cap = new CapStyle();

    double ctaStart() {
        return Math.max(0.6, total - 3.2);
    }

    static double segDuration(JSONObject g) {
        double sp = g.optDouble("speed", 1);
        if (sp <= 0) sp = 1;
        return (g.optLong("endMs") - g.optLong("startMs")) / 1000.0 / sp;
    }

    static CineSpec from(Context ctx, JSONObject o) throws Exception {
        CineSpec s = new CineSpec();
        s.cta = o.optString("cta", "");
        s.ending = o.optString("ending", "fade");
        try { s.accent = Color.parseColor(o.optString("accent", "#FF7A1A")); } catch (Exception ignored) { }
        s.labelFont = TitleLayer.font(ctx, "Inter-700");

        // estilo da legenda (valores antigos como reserva)
        s.cap.font = TitleLayer.font(ctx, o.optString("fontFile", "Montserrat-800.ttf").replace(".ttf", ""));
        s.cap.upper = o.optBoolean("upper", false);
        s.cap.hl = o.optString("hlMode", "box");
        s.cap.accent = s.accent;
        JSONObject cs = o.optJSONObject("captionStyle");
        if (cs != null) {
            s.cap.font = TitleLayer.font(ctx, cs.optString("fontFile", "Montserrat-800.ttf").replace(".ttf", ""));
            s.cap.upper = cs.optBoolean("upper", false);
            s.cap.size = (float) cs.optDouble("size", 1);
            s.cap.ls = (float) cs.optDouble("ls", 0);
            s.cap.y = (float) cs.optDouble("y", 0.73);
            s.cap.shadow = cs.optString("shadow", "outline");
            s.cap.hl = cs.optString("hl", "box");
            s.cap.anim = cs.optString("anim", "pop");
            s.cap.color = TitleLayer.color(cs.optString("color", "#FFFFFF"));
            s.cap.accent = TitleLayer.color(cs.optString("accent", "#FF7A1A"));
        }

        s.layers = TitleLayer.parse(ctx, o.optJSONArray("titleLayout"));
        s.titleEnd = o.optDouble("titleEnd", s.layers.isEmpty() ? 0 : 3.4);
        s.finalStart = o.optDouble("finalStart", -1);
        JSONObject tf = o.optJSONObject("titleTf");
        if (tf != null) { s.tfX = (float) tf.optDouble("ox", 0); s.tfY = (float) tf.optDouble("oy", 0); s.tfS = (float) tf.optDouble("s", 1); }
        if ("4k".equals(o.optString("quality", "hd"))) { s.outW = W * 2; s.outH = H * 2; }

        JSONArray segs = o.getJSONArray("segments");
        double t = 0;
        for (int i = 0; i < segs.length(); i++) t += segDuration(segs.getJSONObject(i));
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
                if (w.length() == 0) continue;
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
