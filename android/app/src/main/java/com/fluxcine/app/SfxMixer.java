package com.fluxcine.app;

import androidx.media3.common.C;
import androidx.media3.common.audio.AudioProcessor;
import androidx.media3.common.audio.BaseAudioProcessor;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.List;

/** Mistura os efeitos sonoros por cima da voz, no tempo certo do vídeo final. */
final class SfxMixer extends BaseAudioProcessor {
    private final long globalStartUs;
    private final List<long[]> events; // {timeUs, type}
    private float[][] sounds;
    private long[] startFrame;
    private int rate, channels, encoding;
    private long framesDone;

    SfxMixer(long globalStartUs, List<long[]> events) {
        this.globalStartUs = globalStartUs;
        this.events = events;
    }

    @Override
    protected AudioFormat onConfigure(AudioFormat in) throws UnhandledAudioFormatException {
        if (in.encoding != C.ENCODING_PCM_16BIT && in.encoding != C.ENCODING_PCM_FLOAT) {
            throw new UnhandledAudioFormatException(in);
        }
        rate = in.sampleRate;
        channels = in.channelCount;
        encoding = in.encoding;
        sounds = new float[events.size()][];
        startFrame = new long[events.size()];
        for (int i = 0; i < events.size(); i++) {
            sounds[i] = SfxSynth.make((int) events.get(i)[1], rate);
            startFrame[i] = (events.get(i)[0] * rate) / 1_000_000L;
        }
        return in;
    }

    @Override
    public void queueInput(ByteBuffer input) {
        int bytes = input.remaining();
        if (bytes == 0) return;
        int bps = encoding == C.ENCODING_PCM_FLOAT ? 4 : 2;
        int frames = bytes / (bps * channels);
        ByteBuffer out = replaceOutputBuffer(bytes);
        input.order(ByteOrder.nativeOrder());
        long base = (globalStartUs * rate) / 1_000_000L + framesDone;
        for (int f = 0; f < frames; f++) {
            float add = 0;
            long g = base + f;
            for (int k = 0; k < sounds.length; k++) {
                long idx = g - startFrame[k];
                if (idx >= 0 && idx < sounds[k].length) add += sounds[k][(int) idx];
            }
            for (int c = 0; c < channels; c++) {
                if (bps == 4) {
                    float v = input.getFloat() + add;
                    out.putFloat(Math.max(-1f, Math.min(1f, v)));
                } else {
                    float v = input.getShort() + add * 32767f;
                    out.putShort((short) Math.max(-32768, Math.min(32767, v)));
                }
            }
        }
        framesDone += frames;
        input.position(input.limit());
        out.flip();
    }

    @Override
    protected void onReset() {
        framesDone = 0;
    }
}
