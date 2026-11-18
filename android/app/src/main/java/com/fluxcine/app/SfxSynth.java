package com.fluxcine.app;

import java.util.Random;

/** Efeitos sonoros sintetizados no aparelho (sem arquivos de áudio). */
final class SfxSynth {
    static final int WHOOSH = 0, IMPACT = 1, RISER = 2, GLITCH = 3, POP = 4;

    static int type(String id) {
        switch (id) {
            case "whoosh": return WHOOSH;
            case "impact": return IMPACT;
            case "riser": return RISER;
            case "glitch": return GLITCH;
            case "pop": return POP;
            default: return -1;
        }
    }

    static float[] make(int type, int rate) {
        Random rnd = new Random(7 + type);
        switch (type) {
            case WHOOSH: {
                int n = (int) (0.9 * rate);
                float[] o = new float[n];
                double x1 = 0, x2 = 0, y1 = 0, y2 = 0;
                for (int i = 0; i < n; i++) {
                    double t = i / (double) rate;
                    double f = t < 0.45 ? 300 * Math.pow(4000 / 300.0, t / 0.45) : 4000 * Math.pow(600 / 4000.0, (t - 0.45) / 0.4);
                    double w0 = 2 * Math.PI * Math.min(f, rate * 0.45) / rate, alpha = Math.sin(w0) / (2 * 1.2);
                    double a0 = 1 + alpha, b0 = alpha / a0, b2 = -alpha / a0, a1 = -2 * Math.cos(w0) / a0, a2 = (1 - alpha) / a0;
                    double x = rnd.nextDouble() * 2 - 1;
                    double y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
                    x2 = x1; x1 = x; y2 = y1; y1 = y;
                    double env = t < 0.4 ? t / 0.4 : Math.max(0, 1 - (t - 0.4) / 0.48);
                    o[i] = (float) (y * env * 1.1);
                }
                return o;
            }
            case IMPACT: {
                int n = (int) (1.6 * rate);
                float[] o = new float[n];
                double ph = 0, lp = 0;
                for (int i = 0; i < n; i++) {
                    double t = i / (double) rate;
                    double f = 120 * Math.pow(32 / 120.0, Math.min(1, t / 1.2));
                    ph += 2 * Math.PI * f / rate;
                    double body = Math.sin(ph) * Math.exp(-t * 3.2);
                    lp += (rnd.nextDouble() * 2 - 1 - lp) * 0.12;
                    double hit = lp * Math.exp(-t * 16) * 1.6;
                    o[i] = (float) ((body * 0.85 + hit) * 0.8);
                }
                return o;
            }
            case RISER: {
                int n = (int) (1.7 * rate);
                float[] o = new float[n];
                double ph = 0, lp = 0;
                for (int i = 0; i < n; i++) {
                    double t = i / (double) rate;
                    double f = 110 * Math.pow(8, Math.min(1, t / 1.6));
                    ph += f / rate;
                    double saw = 2 * (ph - Math.floor(ph + 0.5));
                    double cut = 400 * Math.pow(12.5, Math.min(1, t / 1.6));
                    lp += (saw - lp) * Math.min(1, 2 * Math.PI * cut / rate);
                    double env = t < 1.5 ? 0.02 + 0.33 * Math.pow(t / 1.5, 2) : 0.35 * Math.max(0, 1 - (t - 1.5) / 0.2);
                    o[i] = (float) (lp * env);
                }
                return o;
            }
            case GLITCH: {
                int n = (int) (0.55 * rate);
                float[] o = new float[n];
                for (int b = 0; b < 7; b++) {
                    int st = (int) (b * 0.07 * rate), len = (int) (0.04 * rate);
                    double f = 200 + rnd.nextDouble() * 1800, ph = 0;
                    for (int i = 0; i < len && st + i < n; i++) {
                        ph += f / rate;
                        o[st + i] = (float) ((ph % 1 < 0.5 ? 1 : -1) * 0.18);
                    }
                }
                return o;
            }
            case POP: {
                int n = (int) (0.2 * rate);
                float[] o = new float[n];
                double ph = 0;
                for (int i = 0; i < n; i++) {
                    double t = i / (double) rate;
                    double f = 900 * Math.pow(260 / 900.0, Math.min(1, t / 0.12));
                    ph += 2 * Math.PI * f / rate;
                    o[i] = (float) (Math.sin(ph) * 0.7 * Math.exp(-t * 26));
                }
                return o;
            }
            default:
                return new float[0];
        }
    }
}
