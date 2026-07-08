package com.nova.assistant;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

public class NovaWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.nova_widget);

            // Intent for Voice Interaction (Mic Button)
            Intent voiceIntent = new Intent(context, WidgetVoiceActivity.class);
            PendingIntent voicePendingIntent = PendingIntent.getActivity(context, 0, voiceIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_mic_button, voicePendingIntent);

            // Intent for Text Interaction (Search Bar)
            Intent textIntent = new Intent(context, WidgetTextActivity.class);
            PendingIntent textPendingIntent = PendingIntent.getActivity(context, 1, textIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_text_bar, textPendingIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}
