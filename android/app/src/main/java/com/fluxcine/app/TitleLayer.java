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
 * Uma camada do título cinematográfico. Desenho e animação espelham www/titles.js › draw(),
 * para o vídeo final sair igual à prévia do app.
 */
final class TitleLayer {
    String type, text, align = "center", animK = "fade";
    Typeface font;
    float size, x, y, ls, sx = 1, rot, alpha, x1, y1, x2, y2, w, h, r, cx, cy, rx, ry, outline;
    int color = Color.WHITE;
    boolean hasShadow, hasTextAlpha, hasGlow, hasRgb, hasCursor;
    float shDx, shDy, shSw, rgbOff, textAlpha = 1;
    int shColor, glowColor, rgbA, rgbB, cursorColor;
    float arc;
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
            if ("text".equals(l.type) && o.has("alpha")) { l.hasTextAlpha = true; l.textAlpha = (float) o.optDouble("alpha", 1); }
            l.x1 = (float) o.optDouble("x1", 0); l.y1 = (float) o.optDouble("y1", 0);
            l.x2 = (float) o.optDouble("x2", 0); l.y2 = (float) o.optDouble("y2", 0);
            l.w = (float) o.optDouble("w", 2); l.h = (float) o.optDouble("h", 10); l.r = (float) o.optDouble("r", 0);
            l.cx = (float) o.optDouble("cx", 540); l.cy = (float) o.optDouble("cy", 960);
            l.rx = (float) o.optDouble("rx", 100); l.ry = (float) o.optDouble("ry", 40);
            l.outline = (float) o.optDouble("outline", 0);
            l.arc = (float) o.optDouble("arc", 0);
            if (o.has("glow")) { l.hasGlow = true; l.glowColor = color(o.optString("glow")); }
            if (o.has("cursor")) { l.hasCursor = true; l.cursorColor = color(o.optString("cursor")); }
            JSONArray rgb = o.optJSONArray("rgb");
            if (rgb != null && rgb.length() >= 3) { l.hasRgb = true; l.rgbA = color(rgb.optString(0)); l.rgbB = color(rgb.optString(1)); l.rgbOff = (float) rgb.optDouble(2, 10); }
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
    private static double flick(double t) { long k = (long) Math.floor(t * 22); return ((k * 73 + 11) % 7) > 2 ? 1 : 0.25; }

    private static final Paint P = new Paint(Paint.ANTI_ALIAS_FLAG);
    private static final Paint Q = new Paint(Paint.ANTI_ALIAS_FLAG);

    private static int withAlpha(int color, double a) {
        return Color.argb((int) Math.round(Color.alpha(color) * clamp(a)), Color.red(color), Color.green(color), Color.blue(color));
    }

    /** Texto em arco (centro do círculo abaixo da linha), cada letra gira junto — igual ao arcText do app. */
    private static void arcText(Canvas c, String text, float r, float lsPx, float ox, float oy, Paint p) {
        float tot = 0;
        for (int i = 0; i < text.length(); i++) tot += p.measureText(text, i, i + 1) + lsPx;
        float x = -tot / 2;
        for (int i = 0; i < text.length(); i++) {
            float cw = p.measureText(text, i, i + 1) + lsPx;
            double ang = (x + cw / 2) / r;
            c.save();
            c.translate((float) (ox + r * Math.sin(ang)), (float) (oy + r - r * Math.cos(ang)));
            c.rotate((float) Math.toDegrees(ang));
            c.drawText(text, i, i + 1, -cw / 2 + lsPx / 2, 0, p);
            c.restore();
            x += cw;
        }
    }

    static void drawAll(Canvas c, List<TitleLayer> layers, double t, double tEnd, float ox, float oy, float s) {
        double out = inCubic(clamp((t - (tEnd - 0.45)) / 0.45));
        for (TitleLayer el : layers) el.draw(c, t, out, ox, oy, s);
    }

    private void textPaint(Paint p, float lsx) {
        p.reset();
        p.setAntiAlias(true);
        p.setTypeface(font);
        p.setTextSize(size);
        p.setLetterSpacing(lsx);
        p.setTextAlign(Paint.Align.LEFT);
    }

    private void draw(Canvas c, double t, double out, float ox, float oy, float s) {
        double p = clamp((t - animD) / animU), e = outCubic(p);
        double a = e * (1 - out) * (hasTextAlpha ? textAlpha : 1);
        if ("flicker".equals(animK) && p < 1) a *= flick(t);
        if ("glitch".equals(animK)) a = (p > 0 ? 1 : 0) * (1 - out) * (p < 1 ? flick(t + 0.3) : 1);
        if (a <= 0.004) return;
        P.reset();
        P.setAntiAlias(true);
        if ("dim".equals(type)) {
            P.setColor(Color.argb((int) (255 * alpha * a), 0, 0, 0));
            c.drawRect(0, 0, 1080, 1920, P);
            return;
        }
        if ("vignette".equals(type)) {
            int edge = Color.argb((int) (255 * alpha * a), 0, 0, 0), mid = Color.argb((int) (255 * alpha * 0.85 * a), 0, 0, 0);
            P.setShader(new RadialGradient(540, 960, 760, new int[]{0, 0, mid, edge}, new float[]{0f, 0.5f, 0.91f, 1f}, Shader.TileMode.CLAMP));
            c.drawRect(0, 0, 1080, 1920, P);
            return;
        }
        c.save();
        c.translate(540 + ox, 960 + oy);
        c.scale(s, s);
        c.translate(-540, -960);
        switch (type) {
            case "line": {
                float mx = (x1 + x2) / 2, half = (x2 - x1) / 2 * (float) ("draw".equals(animK) ? e : 1);
                P.setStyle(Paint.Style.STROKE);
                P.setStrokeWidth(w);
                P.setColor(withAlpha(color, a));
                c.drawLine(mx - half, y1, mx + half, y2, P);
                c.restore();
                return;
            }
            case "oval":
                P.setStyle(Paint.Style.STROKE);
                P.setStrokeWidth(w);
                P.setColor(withAlpha(color, a));
                c.drawOval(new RectF(cx - rx, cy - ry, cx + rx, cy + ry), P);
                c.restore();
                return;
            case "box": {
                float bw = Math.max(1, w * (float) ("wipe".equals(animK) ? e : 1));
                float rr = Math.min(r, bw / 2);
                P.setColor(withAlpha(color, a));
                c.drawRoundRect(new RectF(x, y, x + bw, y + h), rr, rr, P);
                c.restore();
                return;
            }
            default:
                break;
        }
        // texto
        double blur = 0, scale = 1, sy = 1, dx = 0, dy = 0, lsx = ls, reveal = 1;
        String txt = text;
        switch (animK) {
            case "blur": blur = 30 * (1 - e); scale = 1.12 - 0.12 * e; lsx += 0.25 * (1 - e); break;
            case "rise": dy = 70 * (1 - e); blur = 10 * (1 - e); break;
            case "reveal": reveal = e; break;
            case "stretch": sy = 0.35 + 0.65 * e; blur = 18 * (1 - e); break;
            case "track": lsx += 0.5 * (1 - e); blur = 8 * (1 - e); break;
            case "pop": scale = 0.55 + 0.45 * outBack(p); break;
            case "zoom": scale = 1.9 - 0.9 * e; blur = 20 * (1 - e); break;
            case "slideL": dx = -260 * (1 - e); blur = 12 * (1 - e); break;
            case "slideR": dx = 260 * (1 - e); blur = 12 * (1 - e); break;
            case "type": txt = text.substring(0, (int) Math.round(text.length() * p)); break;
            case "glitch": if (p < 1) dx = (flick(t * 1.7) - 0.6) * 30; break;
            default: break;
        }
        blur += 16 * out;
        dy -= 34 * out;

        textPaint(P, (float) lsx);
        float fullW = P.measureText(text) * sx;
        float x0 = "left".equals(align) ? x : ("right".equals(align) ? x - fullW : x - fullW / 2);
        float lx = (x0 - x) / sx;

        c.translate((float) (x + dx), (float) (y + dy));
        if (rot != 0) c.rotate(rot);
        c.scale((float) (scale * sx), (float) (scale * sy));
        if (reveal < 1) c.clipRect(lx - 40, -size * 1.4f, lx - 40 + (float) ((fullW / sx + 80) * reveal), size * 1.0f);
        BlurMaskFilter mf = blur > 0.5 ? new BlurMaskFilter((float) blur, BlurMaskFilter.Blur.NORMAL) : null;

        if (hasGlow) {
            textPaint(Q, (float) lsx);
            Q.setColor(withAlpha(glowColor, a));
            Q.setMaskFilter(new BlurMaskFilter((float) (18 + blur), BlurMaskFilter.Blur.NORMAL));
            if (outline > 0) { Q.setStyle(Paint.Style.STROKE); Q.setStrokeWidth(outline * 2); Q.setStrokeJoin(Paint.Join.ROUND); }
            c.drawText(txt, lx, 0, Q);
        }
        if (hasRgb) {
            float off = rgbOff * ("glitch".equals(animK) && p < 1 ? 2.2f : 1f);
            textPaint(Q, (float) lsx);
            Q.setMaskFilter(mf);
            Q.setColor(withAlpha(rgbA, a * 0.85));
            c.drawText(txt, lx - off, 0, Q);
            Q.setColor(withAlpha(rgbB, a * 0.85));
            c.drawText(txt, lx + off, 0, Q);
        }
        if (arc > 0) {
            if (hasShadow) { Q.reset(); Q.setAntiAlias(true); Q.setTypeface(P.getTypeface()); Q.setTextSize(size); Q.setColor(withAlpha(shColor, a)); Q.setMaskFilter(mf); arcText(c, txt, arc, (float) (lsx * size), shDx / sx, shDy, Q); }
            Q.reset(); Q.setAntiAlias(true); Q.setTypeface(P.getTypeface()); Q.setTextSize(size); Q.setColor(withAlpha(color, a)); Q.setMaskFilter(mf);
            arcText(c, txt, arc, (float) (lsx * size), 0, 0, Q);
            c.restore();
            return;
        }
        if (hasShadow) {
            if (shSw > 0) {
                textPaint(Q, (float) lsx);
                Q.setStyle(Paint.Style.STROKE);
                Q.setStrokeJoin(Paint.Join.ROUND);
                Q.setStrokeWidth(shSw * 2);
                Q.setColor(withAlpha(shColor, a));
                Q.setMaskFilter(mf);
                c.drawText(txt, lx, 0, Q);
            }
            textPaint(Q, (float) lsx);
            Q.setColor(withAlpha(shColor, a));
            Q.setMaskFilter(mf);
            c.drawText(txt, lx + shDx / sx, shDy, Q);
        }
        textPaint(P, (float) lsx);
        P.setColor(withAlpha(color, a));
        P.setMaskFilter(mf);
        if (outline > 0) { P.setStyle(Paint.Style.STROKE); P.setStrokeWidth(outline); P.setStrokeJoin(Paint.Join.ROUND); }
        c.drawText(txt, lx, 0, P);
        if (hasCursor && "type".equals(animK) && (p < 1 || ((long) Math.floor(t * 2.5)) % 2 == 0)) {
            textPaint(Q, (float) lsx);
            float cw = Q.measureText(txt);
            Q.setColor(withAlpha(cursorColor, a));
            c.drawRect(lx + cw + 8, -size * 0.78f, lx + cw + 8 + size * 0.5f, size * 0.12f, Q);
        }
        c.restore();
    }
}
