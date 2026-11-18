package com.fluxcine.app;

import android.graphics.Bitmap;

import androidx.media3.effect.BitmapOverlay;

/** Camada gráfica de um trecho; converte o tempo do trecho para o tempo do vídeo final. */
final class CineOverlay extends BitmapOverlay {
    private final CineRenderer renderer;
    private final long globalStartUs;
    private long basePts = Long.MIN_VALUE;

    CineOverlay(CineRenderer renderer, long globalStartUs) {
        this.renderer = renderer;
        this.globalStartUs = globalStartUs;
    }

    @Override
    public Bitmap getBitmap(long presentationTimeUs) {
        if (basePts == Long.MIN_VALUE) basePts = presentationTimeUs;
        double t = (globalStartUs + (presentationTimeUs - basePts)) / 1e6;
        return renderer.frame(t);
    }
}
