package com.studyarena.mobile.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra("id") ?: return
        val title = intent.getStringExtra("title") ?: "Study Reminder"
        val soundId = intent.getStringExtra("soundId") ?: "default_alarm"
        val soundUri = intent.getStringExtra("soundUri")

        val serviceIntent = Intent(context, AlarmService::class.java).apply {
            putExtra("id", id)
            putExtra("title", title)
            putExtra("soundId", soundId)
            if (!soundUri.isNullOrBlank()) {
                putExtra("soundUri", soundUri)
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent)
        } else {
            context.startService(serviceIntent)
        }
    }
}
