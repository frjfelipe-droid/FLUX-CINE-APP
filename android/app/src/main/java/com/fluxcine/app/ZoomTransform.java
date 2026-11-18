package com.fluxcine.app;

import android.graphics.Matrix;

import androidx.media3.effect.MatrixTransformation;

/** Final "Zoom out": aproxima devagar durante o vídeo e afasta no fim, revelando a cena. */
final class ZoomTransform implements MatrixTransformation {
    private final long globalStartUs;
    private final double total;
    private long basePts = Long.MIN_VALUE;

    ZoomTransform(long globalStartUs, double totalSec) {
        this.globalStartUs = globalStartUs;
        this.total = totalSec;
    }

    @Override
    public Matrix getMatrix(long presentationTimeUs) {
        if (basePts == Long.MIN_VALUE) basePts = presentationTimeUs;
        double t = (globalStartUs + (presentationTimeUs - basePts)) / 1e6;
        double z = Math.max(0.1, total - 1.6);
        double s;
        if (t < z) s = 1.0 + 0.10 * (t / z);
        else {
            double a = Math.min(1, (t - z) / 1.6);
            double e = 1 - Math.pow(1 - a, 3);
            s = 1.10 - 0.10 * e;
        }
        Matrix m = new Matrix();
        m.setScale((float) s, (float) s);
        return m;
    }
}
