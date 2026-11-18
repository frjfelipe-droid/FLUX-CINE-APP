package com.fluxcine.app;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.media.MediaCodec;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.util.Base64;

import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.audio.AudioProcessor;
import androidx.media3.common.Effect;
import androidx.media3.effect.OverlayEffect;
import androidx.media3.effect.Presentation;
import androidx.media3.effect.TextureOverlay;
import androidx.media3.transformer.Composition;
import androidx.media3.transformer.EditedMediaItem;
import androidx.media3.transformer.EditedMediaItemSequence;
import androidx.media3.transformer.Effects;
import androidx.media3.transformer.ExportException;
import androidx.media3.transformer.ExportResult;
import androidx.media3.transformer.ProgressHolder;
import androidx.media3.transformer.Transformer;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.common.collect.ImmutableList;

import org.json.JSONArray;
import org.json.JSONObject;
import org.vosk.Model;
import org.vosk.Recognizer;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * FLUX CINE — editor de vídeo no aparelho.
 * pickVideo: escolhe um vídeo da galeria (copiado para o app).
 * transcribe: escuta a fala (Vosk, offline) e devolve as palavras com tempo.
 * render: corta, junta, anima títulos, legenda, mixa efeitos e exporta (Media3 Transformer).
 * saveToGallery / shareInstagram / share: entrega o vídeo.
 */
@CapacitorPlugin(name = "FluxEditor")
public class FluxEditorPlugin extends Plugin {

    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final Handler main = new Handler(Looper.getMainLooper());
    private CineExporter exporter;

    // ---------------------------------------------------------------- escolher vídeo

    @PluginMethod
    public void pickVideo(PluginCall call) {
        Intent i = new Intent(Intent.ACTION_GET_CONTENT);
        i.setType("video/*");
        i.addCategory(Intent.CATEGORY_OPENABLE);
        startActivityForResult(call, i, "onPicked");
    }

    @ActivityCallback
    private void onPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            call.reject("Nenhum vídeo escolhido", "CANCELLED");
            return;
        }
        final Uri uri = result.getData().getData();
        io.execute(() -> {
            try {
                Context ctx = getContext();
                String name = displayName(ctx.getContentResolver(), uri);
                File dir = new File(ctx.getFilesDir(), "clips");
                dir.mkdirs();
                File out = new File(dir, "clip_" + System.currentTimeMillis() + ".mp4");
                try (InputStream in = ctx.getContentResolver().openInputStream(uri); OutputStream os = new FileOutputStream(out)) {
                    byte[] buf = new byte[1 << 16];
                    int n;
                    while ((n = in.read(buf)) > 0) os.write(buf, 0, n);
                }
                JSObject ret = new JSObject();
                ret.put("path", out.getAbsolutePath());
                ret.put("name", name == null ? out.getName() : name);
                MediaMetadataRetriever r = new MediaMetadataRetriever();
                r.setDataSource(out.getAbsolutePath());
                ret.put("durationMs", parseLong(r.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)));
                Bitmap frame = r.getFrameAtTime(500_000, MediaMetadataRetriever.OPTION_CLOSEST_SYNC);
                if (frame != null) {
                    int w = 240, h = Math.max(1, frame.getHeight() * 240 / Math.max(1, frame.getWidth()));
                    Bitmap small = Bitmap.createScaledBitmap(frame, w, h, true);
                    ByteArrayOutputStream bos = new ByteArrayOutputStream();
                    small.compress(Bitmap.CompressFormat.JPEG, 72, bos);
                    ret.put("thumb", "data:image/jpeg;base64," + Base64.encodeToString(bos.toByteArray(), Base64.NO_WRAP));
                }
                r.release();
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Não consegui abrir o vídeo: " + e.getMessage());
            }
        });
    }

    private static String displayName(ContentResolver cr, Uri uri) {
        try (Cursor c = cr.query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (c != null && c.moveToFirst()) return c.getString(0);
        } catch (Exception ignored) { }
        return null;
    }

    private static long parseLong(String s) {
        try { return Long.parseLong(s); } catch (Exception e) { return 0; }
    }

    // ---------------------------------------------------------------- escutar a fala

    @PluginMethod
    public void transcribe(PluginCall call) {
        final String path = call.getString("path");
        final String id = call.getString("id", "");
        io.execute(() -> {
            try {
                JSONArray words = SpeechEngine.get(getContext()).transcribe(path, p -> {
                    JSObject ev = new JSObject();
                    ev.put("id", id);
                    ev.put("p", p);
                    notifyListeners("transcribeProgress", ev);
                });
                JSObject ret = new JSObject();
                ret.put("words", words);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Não consegui ouvir o vídeo: " + e.getMessage());
            }
        });
    }

    // ---------------------------------------------------------------- montar o vídeo

    @PluginMethod
    public void render(PluginCall call) {
        final JSONObject spec = call.getData();
        main.post(() -> {
            try {
                startRender(call, spec);
            } catch (Exception e) {
                call.reject("Falha ao montar o vídeo: " + e.getMessage());
            }
        });
    }

    private void startRender(PluginCall call, JSONObject o) throws Exception {
        // cada vídeo fica guardado no Perfil (pasta privada do app)
        File dir = new File(getContext().getFilesDir(), "projects");
        dir.mkdirs();
        final File out = new File(dir, "FLUX-CINE-" + System.currentTimeMillis() + ".mp4");
        exporter = new CineExporter();
        exporter.export(getContext(), o, out, new CineExporter.Listener() {
            @Override public void onProgress(int p) {
                JSObject ev = new JSObject();
                ev.put("p", p);
                notifyListeners("renderProgress", ev);
            }
            @Override public void onDone(long durationMs) {
                JSObject ret = new JSObject();
                ret.put("path", out.getAbsolutePath());
                long dms = durationMs;
                if (dms <= 0) {
                    try {
                        MediaMetadataRetriever mr = new MediaMetadataRetriever();
                        mr.setDataSource(out.getAbsolutePath());
                        dms = parseLong(mr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION));
                        mr.release();
                    } catch (Exception ignored) { }
                }
                ret.put("durationMs", dms);
                ret.put("thumb", thumbOf(out.getAbsolutePath(), Math.min(1_500_000L, dms * 500L)));
                call.resolve(ret);
            }
            @Override public void onError(String message) {
                call.reject(message);
            }
        });
    }

    private static String thumbOf(String path, long atUs) {
        try {
            MediaMetadataRetriever r = new MediaMetadataRetriever();
            r.setDataSource(path);
            Bitmap frame = r.getFrameAtTime(Math.max(0, atUs), MediaMetadataRetriever.OPTION_CLOSEST_SYNC);
            r.release();
            if (frame == null) return "";
            int w = frame.getWidth() > frame.getHeight() ? 427 : 240;
            int h = Math.max(1, frame.getHeight() * w / Math.max(1, frame.getWidth()));
            Bitmap small = Bitmap.createScaledBitmap(frame, w, h, true);
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            small.compress(Bitmap.CompressFormat.JPEG, 70, bos);
            return "data:image/jpeg;base64," + Base64.encodeToString(bos.toByteArray(), Base64.NO_WRAP);
        } catch (Exception e) {
            return "";
        }
    }

    @PluginMethod
    public void deleteFile(PluginCall call) {
        String path = call.getString("path", "");
        File f = new File(path);
        try {
            String base = getContext().getFilesDir().getCanonicalPath();
            if (f.getCanonicalPath().startsWith(base)) f.delete();
        } catch (Exception ignored) { }
        call.resolve();
    }

    @PluginMethod
    public void cancelRender(PluginCall call) {
        main.post(() -> {
            if (exporter != null) exporter.cancel();
            call.resolve();
        });
    }

    // ---------------------------------------------------------------- entregar

    @PluginMethod
    public void copyText(PluginCall call) {
        String t = call.getString("text", "");
        main.post(() -> {
            ClipboardManager cm = (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
            cm.setPrimaryClip(ClipData.newPlainText("Legenda FLUX CINE", t));
            call.resolve();
        });
    }

    @PluginMethod
    public void saveToGallery(PluginCall call) {
        final String path = call.getString("path");
        io.execute(() -> {
            try {
                Context ctx = getContext();
                File src = new File(path);
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues v = new ContentValues();
                    v.put(MediaStore.Video.Media.DISPLAY_NAME, src.getName());
                    v.put(MediaStore.Video.Media.MIME_TYPE, "video/mp4");
                    v.put(MediaStore.Video.Media.RELATIVE_PATH, Environment.DIRECTORY_MOVIES + "/FLUX CINE");
                    v.put(MediaStore.Video.Media.IS_PENDING, 1);
                    ContentResolver cr = ctx.getContentResolver();
                    Uri uri = cr.insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, v);
                    try (InputStream in = new FileInputStream(src); OutputStream os = cr.openOutputStream(uri)) {
                        byte[] buf = new byte[1 << 16];
                        int n;
                        while ((n = in.read(buf)) > 0) os.write(buf, 0, n);
                    }
                    v.clear();
                    v.put(MediaStore.Video.Media.IS_PENDING, 0);
                    cr.update(uri, v, null, null);
                    call.resolve();
                } else {
                    call.reject("Use o botão Compartilhar para salvar neste Android.", "UNSUPPORTED");
                }
            } catch (Exception e) {
                call.reject("Não consegui salvar: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void shareInstagram(PluginCall call) {
        share(call, true);
    }

    @PluginMethod
    public void share(PluginCall call) {
        share(call, false);
    }

    private void share(PluginCall call, boolean instagram) {
        final String path = call.getString("path");
        final String caption = call.getString("caption", "");
        main.post(() -> {
            try {
                Context ctx = getContext();
                if (!caption.isEmpty()) {
                    ClipboardManager cm = (ClipboardManager) ctx.getSystemService(Context.CLIPBOARD_SERVICE);
                    cm.setPrimaryClip(ClipData.newPlainText("Legenda FLUX CINE", caption));
                }
                Uri uri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", new File(path));
                Intent send = new Intent(Intent.ACTION_SEND);
                send.setType("video/mp4");
                send.putExtra(Intent.EXTRA_STREAM, uri);
                send.putExtra(Intent.EXTRA_TEXT, caption);
                send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                boolean hasInsta = false;
                if (instagram) {
                    try {
                        ctx.getPackageManager().getPackageInfo("com.instagram.android", 0);
                        hasInsta = true;
                    } catch (PackageManager.NameNotFoundException ignored) { }
                }
                if (instagram && hasInsta) {
                    send.setPackage("com.instagram.android");
                    getActivity().startActivity(send);
                } else {
                    getActivity().startActivity(Intent.createChooser(send, "Compartilhar vídeo"));
                }
                JSObject ret = new JSObject();
                ret.put("instagram", hasInsta);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Não consegui compartilhar: " + e.getMessage());
            }
        });
    }
}
