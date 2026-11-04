package com.lyam.biometricgate;

import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
    private TextToSpeech tts;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        try {
            tts = new TextToSpeech(this, status -> {
                if (status == TextToSpeech.SUCCESS && tts != null) {
                    tts.setLanguage(Locale.US);
                    tts.setPitch(1.0f);
                    tts.setSpeechRate(1.0f);
                }
            });
        } catch (Exception e) {}

        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                WebSettings settings = webView.getSettings();
                settings.setMediaPlaybackRequiresUserGesture(false);
                webView.addJavascriptInterface(new Object() {
                    @JavascriptInterface
                    public void speak(String text) {
                        if (tts != null && text != null && !text.trim().isEmpty()) {
                            runOnUiThread(() -> {
                                try {
                                    tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "ShifTrackTTS_" + System.currentTimeMillis());
                                } catch (Exception ex) {}
                            });
                        }
                    }
                    @JavascriptInterface
                    public void stop() {
                        if (tts != null) {
                            runOnUiThread(() -> {
                                try {
                                    tts.stop();
                                } catch (Exception ex) {}
                            });
                        }
                    }
                }, "AndroidNativeTTS");
            }
        } catch (Exception e) {}
    }

    @Override
    public void onDestroy() {
        if (tts != null) {
            try {
                tts.stop();
                tts.shutdown();
            } catch (Exception e) {}
        }
        super.onDestroy();
    }
}
