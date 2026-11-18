package com.fluxcine.app;

import android.graphics.Bitmap;
import android.graphics.BlurMaskFilter;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.PorterDuff;
import android.graphics.RectF;

import java.util.ArrayList;
import java.util.List;

/**
 * Desenha a camada gráfica de cada quadro do vídeo final: título cinematográfico (camadas),
 * legenda no estilo escolhido, flash nos cortes, CTA e fade final.
 * A legenda espelha www/titles.js › drawCaption().
 */
final class CineRenderer {
    private static final int W = CineSpec.W, H = CineSpec.H;
    private final CineSpec s;
    private final Bitmap[] buf = new Bitmap[2];
    private int cur = 0;
    private String lastKey = null;
    private final Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint fx = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint box = new Paint(Paint.ANTI_ALIAS_FLAG);

    CineRenderer(CineSpec spec) {
        s = spec;
        buf[0] = Bitmap.createBitmap(spec.outW, spec.outH, Bitmap.Config.ARGB_8888);
        buf[1] = Bitmap.createBitmap(spec.outW, spec.outH, Bitmap.Config.ARGB_8888);
    }

    synchronized Bitmap frame(double t) {
        boolean anim = t < s.titleEnd + 0.05;
        int ci = chunkAt(t), wi = -1, vis = 0;
        if (ci >= 0) {
            CineSpec.Chunk c = s.chunks.get(ci);
            if (t - c.s < 0.4) anim = true;
            for (int j = 0; j < c.words.length; j++) {
                if (t >= c.ws[j] && t < c.we[j] + 0.08) wi = j;
                if (t >= c.ws[j] - 0.05) vis = j + 1;
            }
        }
        double cs = s.ctaStart();
        if (t >= cs && t < cs + 0.7) anim = true;
        if (s.ending.equals("fade") && t > s.total - 1.0) anim = true;
        for (double b : s.boundaries) if (t > b - 0.08 && t < b + 0.22) anim = true;
        String k = ci + "/" + wi + "/" + vis + "/" + (t >= cs ? 1 : 0);
        if (!anim && k.equals(lastKey)) return buf[cur];

        cur ^= 1;
        Bitmap bmp = buf[cur];
        Canvas c = new Canvas(bmp);
        c.drawColor(Color.TRANSPARENT, PorterDuff.Mode.CLEAR);
        c.save();
        c.scale(s.outW / (float) W, s.outH / (float) H);
        draw(c, t, ci);
        c.restore();
        lastKey = anim ? null : k;
        return bmp;
    }

    private int chunkAt(double t) {
        if (!s.layers.isEmpty() && t < s.titleEnd - 0.05) return -1;
        for (int i = 0; i < s.chunks.size(); i++) {
            CineSpec.Chunk c = s.chunks.get(i);
            if (t >= c.s && t < c.e + 0.1) return i;
        }
        return -1;
    }

    private static double clamp(double v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
    private static double outCubic(double a) { double b = 1 - a; return 1 - b * b * b; }
    private static double outBack(double a) { double c = 1.7; a -= 1; return 1 + a * a * ((c + 1) * a + c); }

    private void draw(Canvas c, double t, int ci) {
        for (double b : s.boundaries) {
            double d = t - b;
            if (d > -0.06 && d < 0.2) {
                double a = d < 0 ? (d + 0.06) / 0.06 : 1 - d / 0.2;
                box.reset();
                box.setColor(Color.argb((int) (140 * clamp(a)), 255, 255, 255));
                c.drawRect(0, 0, W, H, box);
            }
        }
        if (!s.layers.isEmpty() && t < s.titleEnd + 0.02) TitleLayer.drawAll(c, s.layers, t, s.titleEnd, s.tfX, s.tfY, s.tfS);
        if (ci >= 0) {
            CineSpec.Chunk k = s.chunks.get(ci);
            drawCaption(c, t, k, s.finalStart >= 0 && k.s >= s.finalStart - 0.01);
        }
        double cs = s.ctaStart();
        if (t >= cs && !s.cta.isEmpty()) drawCtaPill(c, t - cs);
        if (s.ending.equals("fade")) {
            double a = clamp((t - (s.total - 0.9)) / 0.9);
            if (a > 0) {
                box.reset();
                box.setColor(Color.argb((int) (255 * a), 0, 0, 0));
                c.drawRect(0, 0, W, H, box);
            }
        }
    }

    private static int alpha(int color, double a) {
        return Color.argb((int) Math.round(Color.alpha(color) * clamp(a)), Color.red(color), Color.green(color), Color.blue(color));
    }

    private void textPaint(Paint p, float size) {
        CineSpec.CapStyle cs = s.cap;
        p.reset();
        p.setAntiAlias(true);
        p.setTypeface(cs.font);
        p.setTextSize(size);
        p.setLetterSpacing(cs.ls);
        p.setTextAlign(Paint.Align.LEFT);
    }

    // ---- legenda no estilo escolhido; a palavra falada ganha destaque; o final de impacto fica maior
    private void drawCaption(Canvas c, double t, CineSpec.Chunk k, boolean emph) {
        CineSpec.CapStyle cs = s.cap;
        double p = clamp((t - k.s) / 0.16), a = outCubic(p), sc = 1, al = a;
        if ("pop".equals(cs.anim)) sc = 0.86 + 0.14 * a;
        else if ("bounce".equals(cs.anim)) sc = 0.6 + 0.4 * outBack(p);
        else if ("none".equals(cs.anim) || "type".equals(cs.anim)) al = 1;
        float size = 76 * cs.size * (emph ? 1.22f : 1f);
        textPaint(fill, size);
        String[] words = new String[k.words.length];
        for (int i = 0; i < words.length; i++) words[i] = cs.upper ? k.words[i].toUpperCase() : k.words[i];
        float space = fill.measureText(" ") * 1.1f + cs.ls * size;
        List<int[]> lines = new ArrayList<>();
        float lw = 0;
        int from = 0;
        for (int i = 0; i < words.length; i++) {
            float w = fill.measureText(words[i]);
            if (i > from && lw + space + w > 940) { lines.add(new int[]{from, i}); from = i; lw = w; }
            else lw += (i > from ? space : 0) + w;
        }
        lines.add(new int[]{from, words.length});
        float lh = size * 1.28f;
        float baseY = H * cs.y - lh * (lines.size() - 1) / 2f;
        c.save();
        c.scale((float) sc, (float) sc, W / 2f, baseY);
        for (int li = 0; li < lines.size(); li++) {
            int[] L = lines.get(li);
            float tot = 0;
            for (int i = L[0]; i < L[1]; i++) tot += fill.measureText(words[i]) + (i > L[0] ? space : 0);
            float x = W / 2f - tot / 2f, y = baseY + li * lh;
            for (int j = L[0]; j < L[1]; j++) {
                float ww = fill.measureText(words[j]);
                boolean visible = !"type".equals(cs.anim) || t >= k.ws[j] - 0.05;
                if (visible) {
                    boolean on = t >= k.ws[j] && t < k.we[j] + 0.08, boxed = on && "box".equals(cs.hl);
                    int color = cs.color;
                    if (boxed) {
                        box.reset();
                        box.setAntiAlias(true);
                        box.setColor(alpha(cs.accent, al));
                        c.drawRoundRect(new RectF(x - 14, y - size * 0.86f, x + ww + 14, y + size * 0.24f), 16, 16, box);
                        color = Color.rgb(10, 10, 10);
                    } else if (on && "color".equals(cs.hl)) color = cs.accent;
                    if (!boxed) {
                        switch (cs.shadow) {
                            case "outline":
                                textPaint(fx, size);
                                fx.setStyle(Paint.Style.STROKE);
                                fx.setStrokeJoin(Paint.Join.ROUND);
                                fx.setStrokeWidth(size * 0.16f);
                                fx.setColor(alpha(Color.BLACK, al));
                                c.drawText(words[j], x, y, fx);
                                break;
                            case "hard":
                                textPaint(fx, size);
                                fx.setColor(alpha(Color.BLACK, al));
                                c.drawText(words[j], x + size * 0.07f, y + size * 0.07f, fx);
                                break;
                            case "soft":
                                textPaint(fx, size);
                                fx.setColor(alpha(Color.argb(217, 0, 0, 0), al));
                                fx.setMaskFilter(new BlurMaskFilter(size * 0.14f, BlurMaskFilter.Blur.NORMAL));
                                c.drawText(words[j], x, y + size * 0.06f, fx);
                                break;
                            case "glow":
                                textPaint(fx, size);
                                fx.setColor(alpha(cs.accent, al));
                                fx.setMaskFilter(new BlurMaskFilter(size * 0.18f, BlurMaskFilter.Blur.NORMAL));
                                c.drawText(words[j], x, y, fx);
                                break;
                            default:
                                break;
                        }
                    }
                    textPaint(fill, size);
                    fill.setColor(alpha(color, al));
                    c.drawText(words[j], x, y, fill);
                    if (on && "underline".equals(cs.hl)) {
                        box.reset();
                        box.setAntiAlias(true);
                        box.setColor(alpha(cs.accent, al));
                        c.drawRoundRect(new RectF(x, y + 14, x + ww, y + 24), 5, 5, box);
                    }
                }
                x += ww + space;
            }
        }
        c.restore();
    }

    // ---- CTA em pílula, sobe com desfoque
    private void drawCtaPill(Canvas c, double d) {
        double a = outCubic(clamp(d / 0.55));
        fill.reset();
        fill.setAntiAlias(true);
        fill.setTypeface(s.labelFont);
        fill.setTextAlign(Paint.Align.CENTER);
        fill.setTextSize(52);
        float tw = fill.measureText(s.cta);
        float y = 1640 + (float) (50 * (1 - a));
        RectF r = new RectF(W / 2f - tw / 2 - 52, y - 62, W / 2f + tw / 2 + 52, y + 34);
        box.reset();
        box.setAntiAlias(true);
        box.setColor(alpha(s.cap.accent, a));
        if (a < 0.95) box.setMaskFilter(new BlurMaskFilter((float) (18 * (1 - a)) + 0.1f, BlurMaskFilter.Blur.NORMAL));
        c.drawRoundRect(r, 60, 60, box);
        fill.setColor(alpha(Color.rgb(10, 10, 10), a));
        if (a < 0.95) fill.setMaskFilter(new BlurMaskFilter((float) (14 * (1 - a)) + 0.1f, BlurMaskFilter.Blur.NORMAL));
        c.drawText(s.cta, W / 2f, y, fill);
    }
}
