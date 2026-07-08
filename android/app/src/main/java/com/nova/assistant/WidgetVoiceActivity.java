package com.nova.assistant;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.media.MediaRecorder;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.util.Log;
import android.webkit.CookieManager;
import android.widget.ImageButton;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;

public class WidgetVoiceActivity extends Activity implements TextToSpeech.OnInitListener {
    private static final int REQUEST_RECORD_AUDIO_PERMISSION = 200;
    private boolean permissionToRecordAccepted = false;
    private String [] permissions = {Manifest.permission.RECORD_AUDIO};
    
    private MediaRecorder recorder = null;
    private String fileName = null;
    private boolean isRecording = false;

    private TextView statusText;
    private TextToSpeech tts;
    private boolean isTtsReady = false;

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_RECORD_AUDIO_PERMISSION) {
            permissionToRecordAccepted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
        }
        if (!permissionToRecordAccepted) {
            Toast.makeText(this, "Microphone permission required", Toast.LENGTH_SHORT).show();
            finish();
        } else {
            startRecording();
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_widget_voice);

        fileName = getExternalCacheDir().getAbsolutePath() + "/nova_widget_audio.m4a";
        statusText = findViewById(R.id.widget_voice_status);
        ImageButton micButton = findViewById(R.id.widget_voice_mic_button);
        
        tts = new TextToSpeech(this, this);

        micButton.setOnClickListener(v -> {
            if (isRecording) {
                stopRecordingAndSend();
            } else {
                finishSafely();
            }
        });

        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(permissions, REQUEST_RECORD_AUDIO_PERMISSION);
        } else {
            startRecording();
        }
    }

    @Override
    public void onInit(int status) {
        if (status == TextToSpeech.SUCCESS) {
            tts.setLanguage(Locale.US);
            isTtsReady = true;
        }
    }

    private void startRecording() {
        recorder = new MediaRecorder();
        recorder.setAudioSource(MediaRecorder.AudioSource.MIC);
        recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
        recorder.setOutputFile(fileName);
        recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);

        try {
            recorder.prepare();
            recorder.start();
            isRecording = true;
            statusText.setText("Listening... (Tap to stop)");
        } catch (Exception e) {
            Log.e("WidgetVoice", "prepare() failed", e);
            finishSafely();
        }
    }

    private void stopRecordingAndSend() {
        if (recorder != null) {
            try {
                recorder.stop();
            } catch (Exception e) {
                Log.e("WidgetVoice", "stop() failed", e);
            }
            try {
                recorder.release();
            } catch (Exception e) {}
            recorder = null;
            isRecording = false;
            statusText.setText("Thinking...");
            sendAudioToBackend();
        }
    }

    private void sendAudioToBackend() {
        new Thread(() -> {
            try {
                CookieManager cookieManager = CookieManager.getInstance();
                String cookie = cookieManager.getCookie("https://virtual-assistant-hazel-phi.vercel.app/");

                File audioFile = new File(fileName);
                String boundary = "===" + System.currentTimeMillis() + "===";

                URL url = new URL("https://virtual-assistant-hazel-phi.vercel.app/api/voice");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setDoOutput(true);
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);
                if (cookie != null) {
                    conn.setRequestProperty("Cookie", cookie);
                }

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(("--" + boundary + "\r\n").getBytes());
                    os.write(("Content-Disposition: form-data; name=\"audio\"; filename=\"audio.m4a\"\r\n").getBytes());
                    os.write(("Content-Type: audio/mp4\r\n\r\n").getBytes());

                    FileInputStream inputStream = new FileInputStream(audioFile);
                    byte[] buffer = new byte[4096];
                    int bytesRead;
                    while ((bytesRead = inputStream.read(buffer)) != -1) {
                        os.write(buffer, 0, bytesRead);
                    }
                    inputStream.close();
                    
                    os.write(("\r\n--" + boundary + "--\r\n").getBytes());
                    os.flush();
                }

                int responseCode = conn.getResponseCode();
                if (responseCode == 200) {
                    java.util.Scanner s = new java.util.Scanner(conn.getInputStream()).useDelimiter("\\A");
                    String response = s.hasNext() ? s.next() : "";
                    JSONObject json = new JSONObject(response);
                    String reply = json.optString("reply", "");
                    
                    if (!reply.isEmpty()) {
                        runOnUiThread(() -> statusText.setText("Speaking..."));
                        speakOut(reply);
                    } else {
                        finishSafely();
                    }
                } else {
                    Log.e("WidgetVoice", "Server error: " + responseCode);
                    finishSafely();
                }
            } catch (Exception e) {
                Log.e("WidgetVoice", "Request failed", e);
                finishSafely();
            }
        }).start();
    }

    private void speakOut(String text) {
        if (isTtsReady && tts != null) {
            String cleanText = text.replaceAll("[*_#>]", "");
            tts.speak(cleanText, TextToSpeech.QUEUE_FLUSH, null, "TTS_ID");
            
            new Thread(() -> {
                try { Thread.sleep(500); } catch (Exception e) {}
                while (tts.isSpeaking()) {
                    try { Thread.sleep(500); } catch (Exception e) {}
                }
                finishSafely();
            }).start();
        } else {
            finishSafely();
        }
    }
    
    private void finishSafely() {
        runOnUiThread(this::finish);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        if (recorder != null) {
            try { recorder.release(); } catch (Exception e) {}
            recorder = null;
        }
    }
}
