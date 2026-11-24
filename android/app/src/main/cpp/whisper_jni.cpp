// FLUX CINE — ponte Java <-> whisper.cpp (transcrição offline com tempo de cada palavra)
#include <jni.h>
#include <string>
#include <android/log.h>
#include "whisper.h"

#define TAG "FluxWhisper"

namespace {
struct ProgressCtx { JNIEnv *env; jobject cb; jmethodID mid; };

void on_progress(struct whisper_context *, struct whisper_state *, int progress, void *user) {
    auto *p = static_cast<ProgressCtx *>(user);
    if (p && p->cb && p->mid) p->env->CallVoidMethod(p->cb, p->mid, (jint) progress);
}

void json_escape(std::string &out, const char *s) {
    for (const unsigned char *c = (const unsigned char *) s; *c; ++c) {
        switch (*c) {
            case '"': out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\n': case '\r': case '\t': out += ' '; break;
            default:
                if (*c < 0x20) out += ' '; else out += (char) *c;
        }
    }
}
}

extern "C" JNIEXPORT jlong JNICALL
Java_com_fluxcine_app_Whisper_nativeInit(JNIEnv *env, jclass, jstring jpath) {
    const char *path = env->GetStringUTFChars(jpath, nullptr);
    whisper_context_params cp = whisper_context_default_params();
    cp.use_gpu = false;
    cp.flash_attn = true;   // atenção rápida: transcreve bem mais rápido no processador
    whisper_context *ctx = whisper_init_from_file_with_params(path, cp);
    env->ReleaseStringUTFChars(jpath, path);
    if (!ctx) __android_log_print(ANDROID_LOG_ERROR, TAG, "falha ao carregar o modelo");
    return (jlong) ctx;
}

extern "C" JNIEXPORT void JNICALL
Java_com_fluxcine_app_Whisper_nativeFree(JNIEnv *, jclass, jlong ptr) {
    if (ptr) whisper_free((whisper_context *) ptr);
}

// Devolve JSON: [{"w":"palavra","s":0.00,"e":0.00,"c":0.00}, ...]
extern "C" JNIEXPORT jstring JNICALL
Java_com_fluxcine_app_Whisper_nativeTranscribe(JNIEnv *env, jclass, jlong ptr, jfloatArray jsamples,
                                               jint threads, jstring jlang, jstring jprompt, jobject cb) {
    auto *ctx = (whisper_context *) ptr;
    if (!ctx) return env->NewStringUTF("[]");
    const char *lang = env->GetStringUTFChars(jlang, nullptr);
    const char *prompt = env->GetStringUTFChars(jprompt, nullptr);

    whisper_full_params wp = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
    wp.n_threads = threads;
    wp.language = lang;
    wp.translate = false;
    wp.print_progress = false;
    wp.print_realtime = false;
    wp.print_timestamps = false;
    wp.print_special = false;
    wp.no_context = true;
    wp.token_timestamps = true;   // tempo por palavra
    wp.max_len = 1;               // um segmento por palavra
    wp.split_on_word = true;
    wp.suppress_blank = true;
    wp.suppress_nst = true;       // ignora [música], (risos)...
    wp.initial_prompt = prompt;   // ajuda a pontuar em português

    ProgressCtx pctx{env, cb, nullptr};
    if (cb) {
        jclass k = env->GetObjectClass(cb);
        pctx.mid = env->GetMethodID(k, "onProgress", "(I)V");
        wp.progress_callback = on_progress;
        wp.progress_callback_user_data = &pctx;
    }

    jsize n = env->GetArrayLength(jsamples);
    jfloat *data = env->GetFloatArrayElements(jsamples, nullptr);
    int rc = whisper_full(ctx, wp, data, n);
    env->ReleaseFloatArrayElements(jsamples, data, JNI_ABORT);
    env->ReleaseStringUTFChars(jlang, lang);
    env->ReleaseStringUTFChars(jprompt, prompt);
    if (rc != 0) return env->NewStringUTF("[]");

    std::string out = "[";
    bool first = true;
    const int ns = whisper_full_n_segments(ctx);
    const whisper_token eot = whisper_token_eot(ctx);
    char num[96];
    for (int i = 0; i < ns; ++i) {
        const char *txt = whisper_full_get_segment_text(ctx, i);
        if (!txt) continue;
        while (*txt == ' ') ++txt;
        if (!*txt) continue;
        double t0 = whisper_full_get_segment_t0(ctx, i) * 0.01, t1 = whisper_full_get_segment_t1(ctx, i) * 0.01;
        double psum = 0; int pn = 0;
        const int nt = whisper_full_n_tokens(ctx, i);
        for (int j = 0; j < nt; ++j) {
            if (whisper_full_get_token_id(ctx, i, j) >= eot) continue;
            psum += whisper_full_get_token_p(ctx, i, j); ++pn;
        }
        if (!first) out += ",";
        first = false;
        out += "{\"w\":\"";
        json_escape(out, txt);
        snprintf(num, sizeof(num), "\",\"s\":%.3f,\"e\":%.3f,\"c\":%.3f}", t0, t1, pn ? psum / pn : 0.5);
        out += num;
    }
    out += "]";
    return env->NewStringUTF(out.c_str());
}
