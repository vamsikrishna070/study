package com.studyarena.mobile.alarm

import android.app.Activity
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import com.studyarena.mobile.R

class AlarmActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Ensure the activity wakes the screen and shows even when locked
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )
        }

        setContentView(R.layout.activity_alarm)

        val id = intent.getStringExtra("id")
        val title = intent.getStringExtra("title")
        val soundId = intent.getStringExtra("soundId")
        val soundUri = intent.getStringExtra("soundUri")

        findViewById<TextView>(R.id.tvAlarmTitle).text = title ?: "Time to study"

        findViewById<Button>(R.id.btnDismiss).setOnClickListener {
            val serviceIntent = Intent(this, AlarmService::class.java).apply {
                action = AlarmService.ACTION_DISMISS
                putExtra("id", id)
            }
            startService(serviceIntent)
            finish()
        }

        findViewById<Button>(R.id.btnSnooze).setOnClickListener {
            val serviceIntent = Intent(this, AlarmService::class.java).apply {
                action = AlarmService.ACTION_SNOOZE
                putExtra("id", id)
                putExtra("title", title)
                putExtra("soundId", soundId)
                if (!soundUri.isNullOrBlank()) {
                    putExtra("soundUri", soundUri)
                }
            }
            startService(serviceIntent)
            finish()
        }
    }
}
