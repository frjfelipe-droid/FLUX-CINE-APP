package com.fluxcine.app;

import android.content.Context;
import android.graphics.BlurMaskFilter;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Uma camada do título cinematográfico (texto, linha, oval, escurecer, vinheta).
 * Desenho e animação espelham www/titles.js › draw(), para o vídeo sair igual à prévia.
 */
final class TitleLayer {
    String type, text, align = "center", animK = "fade";
    Typeface font;
    float size, x, y, ls, sx = 1, rot, alpha, x1, y1, x2, y2, w, cx, cy, rx, ry;
    int color = Color.WHITE;
    boolean hasShadow;
    float shDx, shDy, shSw;
    int shColor;
    double animD, animU = 0.5;

    private static final Map<String, Typeface> FONTS = new HashMap<>();

    static synchronized Typeface font(Context ctx, String stem) {
        Typeface t = FONTS.get(stem);
        if (t == null) {
            try { t = Typeface.createFromAsset(ctx.getAssets(), "fonts/" + stem + ".ttf"); }
            catch (Exception e) { t = Typeface.DEFAULT_BOLD; }
            FONTS.put(stem, t);
        }
        return t;
    }

    static int color(String s) {
        if (s == null) return Color.WHITE;
        s = s.trim();
        try {
            if (s.startsWith("rgba(") || s.startsWith("rgb(")) {
                String[] p = s.substring(s.indexOf('(') + 1, s.indexOf(')')).split(",");
                int r = Integer.parseInt(p[0].trim()), g = Integer.parseInt(p[1].trim()), b = Integer.parseInt(p[2].trim());
                float a = p.length > 3 ? Float.parseFloat(p[3].trim()) : 1f;
                return Color.argb(Math.round(a * 255), r, g, b);
            }
            return Color.parseColor(s);
        } catch (Exception e) {
            return Color.WHITE;
        }
    }

    static List<TitleLayer> parse(Context ctx, JSONArray arr) {
        List<TitleLayer> out = new ArrayList<>();
        if (arr == null) return out;
        for (int i = 0; i < arr.length(); i++) {
            JSONObject o = arr.optJSONObject(i);
            if (o == null) continue;
            TitleLayer l = new TitleLayer();
            l.type = o.optString("type", "text");
            l.text = o.optString("text", "");
            l.font = font(ctx, o.optString("font", "Inter-700"));
            l.size = (float) o.optDouble("size", 40);
            l.x = (float) o.optDouble("x", 540);
            l.y = (float) o.optDouble("y", 960);
            l.align = o.optString("align", "center");
            l.color = color(o.optString("color", "#FFFFFF"));
            l.ls = (float) o.optDouble("ls", 0);
            l.sx = (float) o.optDouble("sx", 1);
            l.rot = (float) o.optDouble("rot", 0);
            l.alpha = (float) o.optDouble("alpha", 0.4);
            l.x1 = (float) o.optDouble("x1", 0); l.y1 = (float) o.optDouble("y1", 0);
            l.x2 = (float) o.optDouble("x2", 0); l.y2 = (float) o.optDouble("y2", 0);
            l.w = (float) o.optDouble("w", 2);
            l.cx = (float) o.optDouble("cx", 540); l.cy = (float) o.optDouble("cy", 960);
            l.rx = (float) o.optDouble("rx", 100); l.ry = (float) o.optDouble("ry", 40);
            JSONObject sh = o.optJSONObject("shadow");
            if (sh != null) {
                l.hasShadow = true;
                l.shDx = (float) sh.optDouble("dx", 0); l.shDy = (float) sh.optDouble("dy", 0);
                l.shSw = (float) sh.optDouble("sw", 0); l.shColor = color(sh.optString("color", "#000000"));
            }
            JSONObject an = o.optJSONObject("anim");
            if (an != null) {
                l.animK = an.optString("k", "fade");
                l.animD = an.optDouble("d", 0);
                l.animU = Math.max(0.01, an.optDouble("u", 0.5));
            }
            out.add(l);
        }
        return out;
    }

    private static double clamp(double v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
    private static double outCubic(double a) { double b = 1 - a; return 1 - b * b * b; }
    private static double inCubic(double a) { return a * a * a; }
    private static double outBack(double a) { double c = 1.7; a -= 1; return 1 + a * a * ((c + 1) * a + c); }

    private static final Paint P = new Paint(Paint.ANTI_ALIAS_FLAG);
    private static final Paint ST = new Paint(Paint.ANTI_ALIAS_FLAG);

    private static int withAlpha(int color, double a) {
        return Color.argb((int) Math.round(Color.alpha(color) * clamp(a)), Color.red(color), Color.green(color), Color.blue(color));
    }

    static void drawAll(Canvas c, List<TitleLayer> layers, double t, double tEnd) {
        double out = inCubic(clamp((t - (tEnd - 0.45)) / 0.45));
        for (TitleLayer el : layers) el.draw(c, t, out);
    }

    private void draw(Canvas c, double t, double out) {
        double p = clamp((t - animD) / animU), e = outCubic(p);
        double a = e * (1 - out);
        if (a <= 0.004) return;
        P.reset();
        P.setAntiAlias(true);
        switch (type) {
            case "dim":
                P.setColor(Color.argb((int) (255 * alpha * a), 0, 0, 0));
                c.drawRect(0, 0, 1080, 1920, P);
                return;
            case "vignette": {
                int edge = Color.argb((int) (255 * alpha * a), 0, 0, 0), mid = Color.argb((int) (255 * alpha * 0.85 * a), 0, 0, 0);
                P.setShader(new RadialGradient(540, 960, 760, new int[]{0, 0, mid, edge}, new float[]{0f, 0.5f, 0.91f, 1f}, Shader.TileMode.CLAMP));
                c.drawRect(0, 0, 1080, 1920, P);
                return;
            }
            case "line": {
                float mx = (x1 + x2) / 2, half = (x2 - x1) / 2 * (float) ("draw".equals(animK) ? e : 1);
                P.setStyle(Paint.Style.STROKE);
                P.setStrokeWidth(w);
                P.setColor(withAlpha(color, a));
                c.drawLine(mx - half, y1, mx + half, y2, P);
                return;
            }
            case "oval":
                P.setStyle(Paint.Style.STROKE);
                P.setStrokeWidth(w);
                P.setColor(withAlpha(color, a));
                c.drawOval(new RectF(cx - rx, cy - ry, cx + rx, cy + ry), P);
                return;
            default:
                break;
        }
        // texto
        double blur = 0, scale = 1, sy = 1, dy = 0, lsx = ls, reveal = 1;
        switch (animK) {
            case "blur": blur = 30 * (1 - e); scale = 1.12 - 0.12 * e; lsx += 0.25 * (1 - e); break;
            case "rise": dy = 70 * (1 - e); blur = 10 * (1 - e); break;
            case "reveal": reveal = e; break;
            case "stretch": sy = 0.35 + 0.65 * e; blur = 18 * (1 - e); break;
            case "track": lsx += 0.5 * (1 - e); blur = 8 * (1 - e); break;
            case "pop": scale = 0.55 + 0.45 * outBack(p); break;
            default: break;
        }
        blur += 16 * out;
        dy -= 34 * out;

        P.setTypeface(font);
        P.setTextSize(size);
        P.setLetterSpacing((float) lsx);
        P.setTextAlign(Paint.Align.LEFT);
        float tw = P.measureText(text) * sx;
        float x0 = "left".equals(align) ? x : ("right".equals(align) ? x - tw : x - tw / 2);
        float lx = (x0 - x) / sx;

        c.save();
        c.translate(x, (float) (y + dy));
        if (rot != 0) c.rotate(rot);
        c.scale((float) (scale * sx), (float) (scale * sy));
        if (reveal < 1) c.clipRect(lx - 40, -size * 1.4f, lx - 40 + (float) ((tw / sx + 80) * reveal), size * 1.0f);
        BlurMaskFilter mf = blur > 0.5 ? new BlurMaskFilter((float) blur, BlurMaskFilter.Blur.NORMAL) : null;
        if (hasShadow) {
            if (shSw > 0) {
                ST.reset();
                ST.setAntiAlias(true);
                ST.setTypeface(font);
                ST.setTextSize(size);
                ST.setLetterSpacing((float) lsx);
                ST.setStyle(Paint.Style.STROKE);
                ST.setStrokeJoin(Paint.Join.ROUND);
                ST.setStrokeWidth(shSw * 2);
                ST.setColor(withAlpha(shColor, a));
                ST.setMaskFilter(mf);
                c.drawText(text, lx, 0, ST);
            }
            P.setColor(withAlpha(shColor, a));
            P.setMaskFilter(mf);
            c.drawText(text, lx + shDx / sx, shDy, P);
        }
        P.setColor(withAlpha(color, a));
        P.setMaskFilter(mf);
        c.drawText(text, lx, 0, P);
        c.restore();
    }
}
