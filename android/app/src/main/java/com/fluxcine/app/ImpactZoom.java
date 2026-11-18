package com.fluxcine.app;

import android.graphics.Matrix;

import androidx.media3.effect.MatrixTransformation;

/** Final de impacto: um "soco" de zoom quando começa a frase final (mesma curva da prévia do app). */
final class ImpactZoom implements MatrixTransformation {
    private final long globalStartUs;
    private final double finalStart;
    private long basePts = Long.MIN_VALUE;

    ImpactZoom(long globalStartUs, double finalStart) {
        this.globalStartUs = globalStartUs;
        this.finalStart = finalStart;
    }

    static double scaleAt(double t, double finalStart) {
        if (finalStart < 0 || t < finalStart) return 1;
        double d = t - finalStart;
        if (d < 0.12) return 1 + 0.14 * (d / 0.12);
        double e = Math.min(1, (d - 0.12) / 0.6);
        return 1.14 - 0.08 * (1 - Math.pow(1 - e, 3));
    }

    @Override
    public Matrix getMatrix(long presentationTimeUs) {
        if (basePts == Long.MIN_VALUE) basePts = presentationTimeUs;
        double t = (globalStartUs + (presentationTimeUs - basePts)) / 1e6;
        float s = (float) scaleAt(t, finalStart);
        Matrix m = new Matrix();
        m.setScale(s, s);
        return m;
    }
}
