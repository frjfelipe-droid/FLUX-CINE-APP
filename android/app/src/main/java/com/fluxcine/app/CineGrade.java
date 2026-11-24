package com.fluxcine.app;

import android.content.Context;
import android.opengl.GLES20;

import androidx.media3.common.VideoFrameProcessingException;
import androidx.media3.common.util.GlProgram;
import androidx.media3.common.util.GlUtil;
import androidx.media3.common.util.Size;
import androidx.media3.effect.BaseGlShaderProgram;
import androidx.media3.effect.GlEffect;
import androidx.media3.effect.GlShaderProgram;

import org.json.JSONArray;
import org.json.JSONObject;

/** Color Cine: coloração de cinema, vinheta, granulação e faixas — o mesmo shader da prévia (www/grade.js). */
final class CineGrade implements GlEffect {
    final float[] lift, gamma, gain, shadow, high;
    final float sat, contrast, fade, mono, amount, grain, vignette, bars, fx, fxAmt;
    private final long globalStartUs;
    private final double[] bounds;
    private final int[] codes;

    /** Uma instância por trecho: o tempo global = início do trecho + tempo dentro dele. */
    CineGrade(JSONObject g, long globalStartUs, double[] bounds, int[] codes) {
        this.globalStartUs = globalStartUs;
        this.bounds = bounds;
        this.codes = codes;
        fx = (float) g.optDouble("fx", 0); fxAmt = (float) g.optDouble("fxAmt", 0.7);
        lift = v3(g.optJSONArray("lift"), 0); gamma = v3(g.optJSONArray("gamma"), 1); gain = v3(g.optJSONArray("gain"), 1);
        shadow = v3(g.optJSONArray("shadow"), 0); high = v3(g.optJSONArray("high"), 0);
        sat = (float) g.optDouble("sat", 1); contrast = (float) g.optDouble("contrast", 1); fade = (float) g.optDouble("fade", 0);
        mono = (float) g.optDouble("mono", 0); amount = (float) g.optDouble("amount", 0); grain = (float) g.optDouble("grain", 0);
        vignette = (float) g.optDouble("vignette", 0); bars = (float) g.optDouble("bars", 0);
    }

    private static float[] v3(JSONArray a, float d) {
        float[] r = {d, d, d};
        if (a != null) for (int i = 0; i < 3 && i < a.length(); i++) r[i] = (float) a.optDouble(i, d);
        return r;
    }

    static final String VS =
            "attribute vec4 aFramePosition; varying vec2 vUv; varying vec2 vScr;\n" +
            "void main(){ gl_Position = aFramePosition; vec2 uv = aFramePosition.xy * 0.5 + 0.5; vUv = uv; vScr = vec2(uv.x, 1.0 - uv.y); }";

    static final String FS =
            "precision mediump float;\n#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#endif\n" +
            "uniform sampler2D uTex;\nvarying vec2 vUv; varying vec2 vScr;\n" +
            "uniform vec3 uLift, uGamma, uGain, uShadow, uHigh;\n" +
            "uniform float uSat, uContrast, uFade, uMono, uAmount, uGrain, uVignette, uBars, uTime, uAspect;\n" +
            "uniform float uTrans, uTd, uFx, uFxAmt;\n" +
            "float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }\n" +
            "vec3 tap(vec2 u){ return texture2D(uTex, u).rgb; }\n" +
            "void main(){\n" +
            "  vec2 u = vec2(vScr.x, 1.0 - vScr.y);\n" +
            "  float w = clamp(1.0 - abs(uTd) / 0.22, 0.0, 1.0); w = w * w * (3.0 - 2.0 * w);\n" +
            "  if (uTrans < 0.5) w = 0.0;\n" +
            "  vec3 src;\n" +
            "  if (w > 0.001 && uTrans < 1.5) {\n" +
            "    vec2 c0 = (u - 0.5) / (1.0 + 0.22 * w) + 0.5; vec2 dir = (c0 - 0.5) * 0.07 * w;\n" +
            "    src = (tap(c0) + tap(c0 - dir) + tap(c0 - 2.0 * dir) + tap(c0 + dir)) * 0.25;\n" +
            "  } else if (w > 0.001 && uTrans < 2.5) {\n" +
            "    float sg = uTd < 0.0 ? 1.0 : -1.0; vec2 c0 = u + vec2(sg * 0.3 * w * w, 0.0); vec3 acc = vec3(0.0);\n" +
            "    for (int i = 0; i < 10; i++) { float f = float(i) / 9.0 - 0.5; acc += tap(c0 + vec2(f * 0.2 * w, 0.0)); }\n" +
            "    src = acc / 10.0;\n" +
            "  } else if (w > 0.001 && uTrans < 3.5) {\n" +
            "    float fr = floor(uTime * 24.0), row = floor(u.y * 28.0);\n" +
            "    float jt = (hash(vec2(row, fr)) - 0.5) * 0.14 * w * step(0.5, hash(vec2(row * 1.7, fr + 3.0)));\n" +
            "    vec2 c0 = u + vec2(jt, 0.0); float o = 0.025 * w;\n" +
            "    src = vec3(tap(c0 + vec2(o, 0.0)).r, tap(c0).g, tap(c0 - vec2(o, 0.0)).b);\n" +
            "  } else if (w > 0.001 && uTrans < 4.5) {\n" +
            "    vec2 off = vec2(sin(uTime * 83.0), cos(uTime * 97.0)) * 0.025 * w;\n" +
            "    src = tap((u - 0.5) / (1.0 + 0.07 * w) + 0.5 + off);\n" +
            "  } else src = tap(u);\n" +
            "  if (uFx > 2.5 && uFx < 3.5) { float o2 = 0.0035 * uFxAmt; src = vec3(tap(u + vec2(o2, 0.0)).r, src.g, tap(u - vec2(o2, 0.0)).b); }\n" +
            "  vec3 c = (src - 0.5) * uContrast + 0.5;\n" +
            "  c = uGain * (c + uLift * (1.0 - c));\n" +
            "  c = pow(clamp(c, 0.0, 1.0), 1.0 / uGamma);\n" +
            "  float l = dot(c, vec3(0.299, 0.587, 0.114));\n" +
            "  c += uShadow * (1.0 - l) * (1.0 - l) + uHigh * l * l;\n" +
            "  l = dot(c, vec3(0.299, 0.587, 0.114));\n" +
            "  c = mix(vec3(l), c, uSat);\n" +
            "  c = mix(c, vec3(l), uMono);\n" +
            "  c = c * (1.0 - uFade) + uFade * 0.12;\n" +
            "  c = mix(src, c, uAmount);\n" +
            "  vec2 d = (vScr - 0.5) * vec2(1.0, uAspect);\n" +
            "  float vg = smoothstep(0.42, 1.05, length(d) / max(1.0, uAspect * 0.62));\n" +
            "  c *= 1.0 - uVignette * vg;\n" +
            "  float fr2 = floor(uTime * 24.0);\n" +
            "  if (uFx > 0.5 && uFx < 1.5) {\n" +
            "    float tt = uTime * 0.35;\n" +
            "    float la = exp(-pow((vScr.x - 0.12 - 0.22 * sin(tt)) * 3.0, 2.0) - pow((vScr.y - 0.22) * 2.2, 2.0));\n" +
            "    float lb = exp(-pow((vScr.x - 0.9 - 0.1 * cos(tt * 1.3)) * 2.5, 2.0) - pow((vScr.y - 0.75 - 0.15 * sin(tt * 0.7)) * 2.0, 2.0));\n" +
            "    vec3 lk = clamp(vec3(1.0, 0.45, 0.15) * la * 0.9 + vec3(1.0, 0.75, 0.35) * lb * 0.6, 0.0, 1.0) * uFxAmt;\n" +
            "    c = 1.0 - (1.0 - c) * (1.0 - lk);\n" +
            "  } else if (uFx > 1.5 && uFx < 2.5) {\n" +
            "    float speck = step(0.9986, hash(floor(vScr * vec2(180.0, 320.0)) + fr2 * 7.13));\n" +
            "    float sx = hash(vec2(fr2, 3.1));\n" +
            "    float scr = step(abs(vScr.x - sx), 0.0012) * step(0.6, hash(vec2(fr2, 9.2)));\n" +
            "    c = mix(c, vec3(0.95, 0.93, 0.88), clamp(speck * 0.85 + scr * 0.4, 0.0, 1.0) * uFxAmt);\n" +
            "    c *= 1.0 - 0.07 * uFxAmt * hash(vec2(fr2, 1.0));\n" +
            "  } else if (uFx > 2.5 && uFx < 3.5) {\n" +
            "    c *= 1.0 - 0.13 * uFxAmt * (sin(vScr.y * 1500.0) * 0.5 + 0.5);\n" +
            "    float band = 1.0 - smoothstep(0.0, 0.025, abs(fract(vScr.y * 0.7 - uTime * 0.12) - 0.5));\n" +
            "    c += band * 0.08 * uFxAmt * (hash(vec2(floor(vScr.x * 300.0), fr2)) - 0.3);\n" +
            "    c = mix(c, c * vec3(1.04, 0.97, 1.07), uFxAmt);\n" +
            "  }\n" +
            "  float n = hash(floor(vScr * vec2(540.0, 960.0)) + fract(uTime * 7.0) * 113.0) - 0.5;\n" +
            "  float lum = dot(c, vec3(0.299, 0.587, 0.114));\n" +
            "  c += n * uGrain * 0.32 * (1.15 - lum);\n" +
            "  if (uTrans > 4.5 && uTrans < 5.5) {\n" +
            "    float x = vScr.x + vScr.y * 0.4, pos = 0.7 - uTd * 3.0;\n" +
            "    c += (vec3(1.0, 0.55, 0.22) * 1.3 * exp(-pow((x - pos) * 2.2, 2.0)) + vec3(1.0, 0.8, 0.5) * 0.25) * w;\n" +
            "  }\n" +
            "  if (uTrans > 5.5) c *= 1.0 - w;\n" +
            "  if (vScr.y < uBars || vScr.y > 1.0 - uBars) c = vec3(0.0);\n" +
            "  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);\n" +
            "}\n";

    @Override
    public GlShaderProgram toGlShaderProgram(Context context, boolean useHdr) throws VideoFrameProcessingException {
        return new Program(this, useHdr);
    }

    private static final class Program extends BaseGlShaderProgram {
        private final GlProgram gp;
        private final CineGrade g;
        private long basePts = Long.MIN_VALUE;

        Program(CineGrade g, boolean useHdr) throws VideoFrameProcessingException {
            super(useHdr, 1);
            this.g = g;
            try {
                gp = new GlProgram(VS, FS);
            } catch (GlUtil.GlException e) {
                throw new VideoFrameProcessingException(e);
            }
            gp.setBufferAttribute("aFramePosition", GlUtil.getNormalizedCoordinateBounds(), GlUtil.HOMOGENEOUS_COORDINATE_VECTOR_SIZE);
            gp.setFloatsUniform("uLift", g.lift); gp.setFloatsUniform("uGamma", g.gamma); gp.setFloatsUniform("uGain", g.gain);
            gp.setFloatsUniform("uShadow", g.shadow); gp.setFloatsUniform("uHigh", g.high);
            gp.setFloatUniform("uSat", g.sat); gp.setFloatUniform("uContrast", g.contrast); gp.setFloatUniform("uFade", g.fade);
            gp.setFloatUniform("uMono", g.mono); gp.setFloatUniform("uAmount", g.amount); gp.setFloatUniform("uGrain", g.grain);
            gp.setFloatUniform("uVignette", g.vignette); gp.setFloatUniform("uBars", g.bars);
            gp.setFloatUniform("uFx", g.fx); gp.setFloatUniform("uFxAmt", g.fxAmt);
        }

        @Override
        public Size configure(int w, int h) {
            gp.setFloatUniform("uAspect", h / (float) Math.max(1, w));
            return new Size(w, h);
        }

        @Override
        public void drawFrame(int inputTexId, long ptsUs) throws VideoFrameProcessingException {
            try {
                gp.use();
                gp.setSamplerTexIdUniform("uTex", inputTexId, 0);
                if (basePts == Long.MIN_VALUE) basePts = ptsUs;
                double t = (g.globalStartUs + (ptsUs - basePts)) / 1e6;
                double best = 9; int bi = -1;
                for (int i = 0; i < g.bounds.length; i++) { double d = t - g.bounds[i]; if (Math.abs(d) < Math.abs(best)) { best = d; bi = i; } }
                gp.setFloatUniform("uTd", (float) best);
                gp.setFloatUniform("uTrans", bi >= 0 && bi < g.codes.length ? g.codes[bi] : 0);
                gp.setFloatUniform("uTime", (float) (t % 1000.0));
                gp.bindAttributesAndUniforms();
                GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, 4);
            } catch (GlUtil.GlException e) {
                throw new VideoFrameProcessingException(e, ptsUs);
            }
        }

        @Override
        public void release() throws VideoFrameProcessingException {
            super.release();
            try { gp.delete(); } catch (GlUtil.GlException e) { throw new VideoFrameProcessingException(e); }
        }
    }
}
