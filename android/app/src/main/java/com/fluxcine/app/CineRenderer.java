package com.fluxcine.app;

import android.graphics.Bitmap;
import android.graphics.BlurMaskFilter;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.PorterDuff;
import android.graphics.RectF;
import android.graphics.Shader;

import java.util.ArrayList;
import java.util.List;

/**
 * Desenha a camada gráfica de cada quadro: título cinematográfico com desfoque,
 * legenda palavra-por-palavra, flash de transição, CTA e final.
 * Uma instância é compartilhada por todos os trechos do vídeo.
 */
final class CineRenderer {
    private static final int W = CineSpec.W, H = CineSpec.H;
    private static final float LB = 150f; // faixas de cinema
    private final CineSpec s;
    private final Bitmap[] buf = new Bitmap[2];
    private int cur = 0;
    private String lastKey = null;
    private final Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint stroke = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint box = new Paint(Paint.ANTI_ALIAS_FLAG);

    CineRenderer(CineSpec spec) {
        s = spec;
        buf[0] = Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888);
        buf[1] = Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888);
        stroke.setStyle(Paint.Style.STROKE);
        stroke.setStrokeJoin(Paint.Join.ROUND);
        stroke.setColor(Color.BLACK);
    }

    synchronized Bitmap frame(double t) {
        boolean anim = false;
        StringBuilder key = new StringBuilder();
        if (t < 3.4) anim = true;
        int ci = chunkAt(t);
        int wi = -1;
        if (ci >= 0) {
            CineSpec.Chunk c = s.chunks.get(ci);
            if (t - c.s < 0.16) anim = true;
            for (int j = 0; j < c.words.length; j++) if (t >= c.ws[j] && t < c.we[j] + 0.08) wi = j;
        }
        double cs = s.ctaStart();
        if (t >= cs && t < cs + 0.7) anim = true;
        if (s.ending.equals("fade") && t > s.total - 1.0) anim = true;
        for (double b : s.boundaries) if (t > b - 0.08 && t < b + 0.22) anim = true;
        key.append(ci).append('/').append(wi).append('/').append(t >= cs ? 1 : 0);
        String k = key.toString();
        if (!anim && k.equals(lastKey)) return buf[cur];

        cur ^= 1;
        Bitmap bmp = buf[cur];
        Canvas c = new Canvas(bmp);
        c.drawColor(Color.TRANSPARENT, PorterDuff.Mode.CLEAR);
        draw(c, t, ci, wi);
        lastKey = anim ? null : k;
        return bmp;
    }

    private int chunkAt(double t) {
        if (t >= s.ctaStart() && s.ending.equals("logo")) return -1;
        for (int i = 0; i < s.chunks.size(); i++) {
            CineSpec.Chunk c = s.chunks.get(i);
            if (t >= c.s && t < c.e + 0.12) return i;
        }
        return -1;
    }

    private static double clamp(double v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
    private static double outCubic(double a) { double b = 1 - a; return 1 - b * b * b; }
    private static double inCubic(double a) { return a * a * a; }

    private void draw(Canvas c, double t, int ci, int wi) {
        if (s.letterbox) {
            box.setMaskFilter(null);
            box.setShader(null);
            box.setColor(Color.BLACK);
            c.drawRect(0, 0, W, LB, box);
            c.drawRect(0, H - LB, W, H, box);
        }
        if (t < 3.4 && !s.title.isEmpty()) drawTitle(c, t);
        if (ci >= 0) drawCaption(c, t, s.chunks.get(ci), wi);
        for (double b : s.boundaries) {
            double d = t - b;
            if (d > -0.06 && d < 0.2) {
                double a = d < 0 ? (d + 0.06) / 0.06 : 1 - d / 0.2;
                box.setShader(null);
                box.setMaskFilter(null);
                box.setColor(Color.argb((int) (150 * clamp(a)), 255, 255, 255));
                c.drawRect(0, 0, W, H, box);
            }
        }
        double cs = s.ctaStart();
        if (t >= cs) {
            if (s.ending.equals("logo")) drawEndCard(c, t - cs);
            else if (!s.cta.isEmpty()) drawCtaPill(c, t - cs);
        }
        if (s.ending.equals("fade")) {
            double a = clamp((t - (s.total - 0.9)) / 0.9);
            if (a > 0) {
                box.setShader(null);
                box.setMaskFilter(null);
                box.setColor(Color.argb((int) (255 * a), 0, 0, 0));
                c.drawRect(0, 0, W, H, box);
            }
        }
    }

    // ---- título: entra desfocado, abre o espaçamento e foca; sai subindo e desfocando
    private void drawTitle(Canvas c, double t) {
        double a = outCubic(clamp((t - 0.12) / 0.8));
        double o = inCubic(clamp((t - 2.8) / 0.5));
        double alpha = a * (1 - o);
        if (alpha <= 0.01) return;
        float blur = (float) (36 * (1 - a) + 22 * o);
        float scale = (float) (1.16 - 0.16 * a + 0.04 * o);
        float dy = (float) (-48 * o);

        // véu escuro para leitura
        box.setMaskFilter(null);
        box.setShader(new LinearGradient(0, 520, 0, 1220,
                new int[]{0, Color.argb((int) (120 * alpha), 0, 0, 0), 0}, null, Shader.TileMode.CLAMP));
        c.drawRect(0, 520, W, 1220, box);
        box.setShader(null);

        String text = s.upper ? s.title.toUpperCase() : s.title;
        float size = s.upper ? 128 : 92;
        fill.setTypeface(s.font);
        fill.setTextAlign(Paint.Align.CENTER);
        List<String> lines;
        while (true) {
            fill.setTextSize(size);
            fill.setLetterSpacing(0);
            lines = wrap(text, fill, 900);
            if (lines.size() <= 3 || size < 56) break;
            size *= 0.88f;
        }
        fill.setLetterSpacing((float) (0.24 * (1 - a) + (s.upper ? 0.03 : -0.01)));
        float lh = size * 1.08f;
        float top = 860 - lh * lines.size() / 2f;

        c.save();
        c.translate(W / 2f, dy);
        c.scale(scale, scale, 0, 860);
        fill.setColor(Color.WHITE);
        fill.setAlpha((int) (255 * alpha));
        fill.setMaskFilter(blur > 0.6f ? new BlurMaskFilter(blur, BlurMaskFilter.Blur.NORMAL) : null);
        for (int i = 0; i < lines.size(); i++) {
            c.drawText(lines.get(i), 0, top + lh * (i + 0.8f), fill);
        }
        fill.setMaskFilter(null);
        // traço de destaque
        float bw = (float) (180 * a * (1 - o));
        box.setColor(s.accent);
        box.setAlpha((int) (255 * alpha));
        float by = top + lh * lines.size() + 34;
        c.drawRoundRect(new RectF(-bw / 2, by, bw / 2, by + 10), 5, 5, box);
        box.setAlpha(255);
        c.restore();
        fill.setLetterSpacing(0);
    }

    // ---- legenda: palavra falada em destaque
    private void drawCaption(Canvas c, double t, CineSpec.Chunk k, int wi) {
        double a = outCubic(clamp((t - k.s) / 0.14));
        float size = s.upper ? 98 : 80;
        fill.setTypeface(s.font);
        fill.setTextAlign(Paint.Align.LEFT);
        fill.setTextSize(size);
        fill.setLetterSpacing(s.upper ? 0.02f : -0.01f);
        fill.setMaskFilter(null);
        stroke.setTypeface(s.font);
        stroke.setTextSize(size);
        stroke.setLetterSpacing(fill.getLetterSpacing());
        stroke.setStrokeWidth(size * 0.16f);

        String[] words = new String[k.words.length];
        for (int i = 0; i < words.length; i++) words[i] = s.upper ? k.words[i].toUpperCase() : k.words[i];
        float space = fill.measureText(" ") * 1.1f;
        float maxW = 940;
        List<int[]> lines = new ArrayList<>(); // {from, to}
        float lw = 0;
        int from = 0;
        for (int i = 0; i < words.length; i++) {
            float w = fill.measureText(words[i]);
            if (i > from && lw + space + w > maxW) { lines.add(new int[]{from, i}); from = i; lw = w; }
            else lw += (i > from ? space : 0) + w;
        }
        lines.add(new int[]{from, words.length});

        float lh = size * 1.28f;
        float baseY = 1400 - lh * (lines.size() - 1) / 2f;
        float sc = (float) (0.86 + 0.14 * a);
        c.save();
        c.scale(sc, sc, W / 2f, baseY);
        int alpha = (int) (255 * a);
        for (int li = 0; li < lines.size(); li++) {
            int[] L = lines.get(li);
            float total = 0;
            for (int i = L[0]; i < L[1]; i++) total += fill.measureText(words[i]) + (i > L[0] ? space : 0);
            float x = W / 2f - total / 2f;
            float y = baseY + li * lh;
            for (int i = L[0]; i < L[1]; i++) {
                float w = fill.measureText(words[i]);
                boolean on = i == wi;
                int textColor = Color.WHITE;
                if (on && s.hlMode.equals("box")) {
                    box.setShader(null);
                    box.setColor(s.accent);
                    box.setAlpha(alpha);
                    c.drawRoundRect(new RectF(x - 14, y - size * 0.86f, x + w + 14, y + size * 0.24f), 16, 16, box);
                    textColor = Color.rgb(10, 10, 10);
                } else if (on) {
                    textColor = s.accent;
                }
                if (!(on && s.hlMode.equals("box"))) {
                    stroke.setAlpha(alpha);
                    c.drawText(words[i], x, y, stroke);
                }
                fill.setColor(textColor);
                fill.setAlpha(alpha);
                c.drawText(words[i], x, y, fill);
                if (on && s.hlMode.equals("underline")) {
                    box.setColor(s.accent);
                    box.setAlpha(alpha);
                    c.drawRoundRect(new RectF(x, y + 14, x + w, y + 24), 5, 5, box);
                }
                x += w + space;
            }
        }
        c.restore();
        fill.setLetterSpacing(0);
        box.setAlpha(255);
    }

    // ---- CTA em pílula, sobe com desfoque
    private void drawCtaPill(Canvas c, double d) {
        double a = outCubic(clamp(d / 0.55));
        fill.setTypeface(s.labelFont);
        fill.setTextAlign(Paint.Align.CENTER);
        fill.setTextSize(52);
        fill.setLetterSpacing(0);
        float tw = fill.measureText(s.cta);
        float y = (s.letterbox ? H - LB - 120 : 1640) + (float) (50 * (1 - a));
        RectF r = new RectF(W / 2f - tw / 2 - 52, y - 62, W / 2f + tw / 2 + 52, y + 34);
        box.setShader(null);
        box.setColor(s.accent);
        box.setAlpha((int) (255 * a));
        box.setMaskFilter(a < 0.95 ? new BlurMaskFilter((float) (18 * (1 - a)) + 0.1f, BlurMaskFilter.Blur.NORMAL) : null);
        c.drawRoundRect(r, 60, 60, box);
        box.setMaskFilter(null);
        box.setAlpha(255);
        fill.setColor(Color.rgb(10, 10, 10));
        fill.setAlpha((int) (255 * a));
        fill.setMaskFilter(a < 0.95 ? new BlurMaskFilter((float) (14 * (1 - a)) + 0.1f, BlurMaskFilter.Blur.NORMAL) : null);
        c.drawText(s.cta, W / 2f, y, fill);
        fill.setMaskFilter(null);
    }

    // ---- final "Logo + CTA": tela escura, CTA grande entrando com desfoque
    private void drawEndCard(Canvas c, double d) {
        double bg = outCubic(clamp(d / 0.45));
        box.setShader(null);
        box.setMaskFilter(null);
        box.setColor(Color.argb((int) (230 * bg), 5, 5, 5));
        c.drawRect(0, 0, W, H, box);
        double a = outCubic(clamp((d - 0.2) / 0.7));
        String text = s.cta.isEmpty() ? s.title : s.cta;
        if (s.upper) text = text.toUpperCase();
        fill.setTypeface(s.font);
        fill.setTextAlign(Paint.Align.CENTER);
        float size = s.upper ? 120 : 88;
        List<String> lines;
        while (true) {
            fill.setTextSize(size);
            lines = wrap(text, fill, 900);
            if (lines.size() <= 3 || size < 56) break;
            size *= 0.88f;
        }
        fill.setLetterSpacing((float) (0.2 * (1 - a)));
        fill.setColor(Color.WHITE);
        fill.setAlpha((int) (255 * a));
        float blur = (float) (30 * (1 - a));
        fill.setMaskFilter(blur > 0.6f ? new BlurMaskFilter(blur, BlurMaskFilter.Blur.NORMAL) : null);
        float lh = size * 1.1f;
        float top = 900 - lh * lines.size() / 2f;
        for (int i = 0; i < lines.size(); i++) c.drawText(lines.get(i), W / 2f, top + lh * (i + 0.8f), fill);
        fill.setMaskFilter(null);
        fill.setLetterSpacing(0);
        float bw = (float) (220 * a);
        box.setColor(s.accent);
        float by = top + lh * lines.size() + 40;
        c.drawRoundRect(new RectF(W / 2f - bw / 2, by, W / 2f + bw / 2, by + 12), 6, 6, box);
    }

    private static List<String> wrap(String text, Paint p, float maxW) {
        List<String> out = new ArrayList<>();
        String[] ws = text.trim().split("\\s+");
        StringBuilder line = new StringBuilder();
        for (String w : ws) {
            String test = line.length() == 0 ? w : line + " " + w;
            if (line.length() > 0 && p.measureText(test) > maxW) {
                out.add(line.toString());
                line = new StringBuilder(w);
            } else {
                line = new StringBuilder(test);
            }
        }
        if (line.length() > 0) out.add(line.toString());
        return out;
    }
}
