package com.studyarena.mobile.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra("id") ?: return
        val title = intent.getStringExtra("title") ?: "Reminder"
        val soundId = intent.getStringExtra("soundId") ?: "default_alarm"

        val serviceIntent = Intent(context, AlarmService::class.java).apply {
            putExtra("id", id)
            putExtra("title", title)
            putExtra("soundId", soundId)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent)
        } else {
            context.startService(serviceIntent)
        }
    }
}
