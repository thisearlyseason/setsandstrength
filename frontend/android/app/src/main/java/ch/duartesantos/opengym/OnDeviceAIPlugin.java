package ch.duartesantos.opengym;

import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.common.util.concurrent.FutureCallback;
import com.google.common.util.concurrent.Futures;
import com.google.common.util.concurrent.ListenableFuture;
import com.google.common.util.concurrent.MoreExecutors;
import com.google.mlkit.genai.common.FeatureStatus;
import com.google.mlkit.genai.prompt.Generation;
import com.google.mlkit.genai.prompt.GenerateContentResponse;
import com.google.mlkit.genai.common.GenAiException;
import com.google.mlkit.genai.common.DownloadCallback;
import com.google.mlkit.genai.prompt.java.GenerativeModelFutures;

/** Explicitly on-device Gemini Nano access. No prompt or result is logged. */
@CapacitorPlugin(name = "OnDeviceAI")
public class OnDeviceAIPlugin extends Plugin {
    private GenerativeModelFutures model() {
        if (Build.VERSION.SDK_INT < 26) return null;
        return GenerativeModelFutures.from(Generation.INSTANCE.getClient());
    }

    @PluginMethod
    public void availability(PluginCall call) {
        GenerativeModelFutures m;
        try { m = model(); } catch (Throwable e) { call.resolve(state("interrupted")); return; }
        if (m == null) { call.resolve(state("unsupported")); return; }
        Futures.addCallback(m.checkStatus(), new FutureCallback<Integer>() {
            @Override public void onSuccess(Integer status) {
                String value = status == FeatureStatus.AVAILABLE ? "ready"
                        : status == FeatureStatus.DOWNLOADABLE ? "download-needed"
                        : status == FeatureStatus.DOWNLOADING ? "download-needed" : "unsupported";
                call.resolve(state(value));
            }
            @Override public void onFailure(@NonNull Throwable t) { call.resolve(state("interrupted")); }
        }, ContextCompat.getMainExecutor(getContext()));
    }

    @PluginMethod
    public void download(PluginCall call) {
        GenerativeModelFutures m;
        try { m = model(); } catch (Throwable e) { call.reject("On-device model unavailable", "unavailable"); return; }
        if (m == null) { call.reject("On-device model unsupported", "unavailable"); return; }
        ListenableFuture<Integer> status = m.checkStatus();
        Futures.addCallback(status, new FutureCallback<Integer>() {
            @Override public void onSuccess(Integer featureStatus) {
                if (featureStatus != FeatureStatus.DOWNLOADABLE) {
                    call.resolve(state(featureStatus == FeatureStatus.AVAILABLE ? "ready" : featureStatus == FeatureStatus.DOWNLOADING ? "download-needed" : "unsupported"));
                    return;
                }
                m.download(new DownloadCallback() {
                    @Override public void onDownloadStarted(long bytes) { }
                    @Override public void onDownloadProgress(long bytes) { }
                    @Override public void onDownloadCompleted() { call.resolve(state("ready")); }
                    @Override public void onDownloadFailed(@NonNull GenAiException e) { call.resolve(state("interrupted")); }
                });
            }
            @Override public void onFailure(@NonNull Throwable t) { call.resolve(state("interrupted")); }
        }, MoreExecutors.directExecutor());
    }

    @PluginMethod
    public void generate(PluginCall call) {
        String prompt = call.getString("prompt", "");
        if (prompt.isEmpty() || prompt.length() > 12000) { call.reject("Prompt must be between 1 and 12000 characters", "invalid_prompt"); return; }
        GenerativeModelFutures m;
        try { m = model(); } catch (Throwable e) { call.reject("On-device model unavailable", "unavailable"); return; }
        if (m == null) { call.reject("On-device model unsupported", "unavailable"); return; }
        Futures.addCallback(m.checkStatus(), new FutureCallback<Integer>() {
            @Override public void onSuccess(Integer status) {
                if (status != FeatureStatus.AVAILABLE) { call.reject("On-device model is not ready", "unavailable"); return; }
                Futures.addCallback(m.generateContent(prompt), new FutureCallback<GenerateContentResponse>() {
                    @Override public void onSuccess(GenerateContentResponse result) {
                        String text = result.getCandidates().isEmpty() ? "" : result.getCandidates().get(0).getText();
                        JSObject out = new JSObject(); out.put("text", text); call.resolve(out);
                    }
                    @Override public void onFailure(@NonNull Throwable t) { call.reject("On-device inference was interrupted", "inference_interrupted"); }
                }, ContextCompat.getMainExecutor(getContext()));
            }
            @Override public void onFailure(@NonNull Throwable t) { call.reject("On-device model unavailable", "unavailable"); }
        }, ContextCompat.getMainExecutor(getContext()));
    }

    private JSObject state(String value) { JSObject result = new JSObject(); result.put("state", value); return result; }
}
