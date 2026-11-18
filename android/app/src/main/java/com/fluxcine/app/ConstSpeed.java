package com.fluxcine.app;

import androidx.media3.common.C;
import androidx.media3.common.audio.SpeedProvider;

/** Velocidade fixa de um trecho (rápido 2x, lento 0,5x, pausa 0,1x). */
final class ConstSpeed implements SpeedProvider {
    private final float speed;

    ConstSpeed(float speed) { this.speed = speed; }

    @Override
    public float getSpeed(long timeUs) { return speed; }

    @Override
    public long getNextSpeedChangeTimeUs(long timeUs) { return C.TIME_UNSET; }
}
