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
    final float sat, contrast, fade, mono, amount, grain, vignette, bars;

    CineGrade(JSONObject g) {
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
            "float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }\n" +
            "void main(){\n" +
            "  vec3 src = texture2D(uTex, vUv).rgb;\n" +
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
            "  float n = hash(floor(vScr * vec2(540.0, 960.0)) + fract(uTime * 7.0) * 113.0) - 0.5;\n" +
            "  float lum = dot(c, vec3(0.299, 0.587, 0.114));\n" +
            "  c += n * uGrain * 0.32 * (1.15 - lum);\n" +
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
                gp.setFloatUniform("uTime", (float) ((ptsUs / 1e6) % 1000.0));
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
