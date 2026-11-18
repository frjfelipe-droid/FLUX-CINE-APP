package com.fluxcine.app;

/** Ponte para o whisper.cpp (biblioteca nativa libfluxwhisper.so). */
final class Whisper {
    interface Progress { void onProgress(int percent); }

    static { System.loadLibrary("fluxwhisper"); }

    static native long nativeInit(String modelPath);
    static native void nativeFree(long ctx);
    static native String nativeTranscribe(long ctx, float[] samples16k, int threads, String lang, String prompt, Progress cb);

    private Whisper() {}
}
