package com.nova.assistant;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.inputmethod.EditorInfo;
import android.widget.EditText;
import android.widget.ImageButton;

public class WidgetTextActivity extends Activity {
    private EditText editText;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_widget_text);

        editText = findViewById(R.id.widget_edit_text);
        ImageButton sendButton = findViewById(R.id.widget_send_button);

        // Auto show keyboard
        editText.requestFocus();
        getWindow().setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_STATE_VISIBLE);

        sendButton.setOnClickListener(v -> sendMessage());

        editText.setOnEditorActionListener((v, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_SEND || 
                (event != null && event.getKeyCode() == KeyEvent.KEYCODE_ENTER && event.getAction() == KeyEvent.ACTION_DOWN)) {
                sendMessage();
                return true;
            }
            return false;
        });

        // Close if tapped outside
        findViewById(android.R.id.content).setOnClickListener(v -> finish());
    }

    private void sendMessage() {
        String text = editText.getText().toString().trim();
        if (!text.isEmpty()) {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("nova://chat?message=" + Uri.encode(text)));
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(intent);
        }
        finish();
    }
}
