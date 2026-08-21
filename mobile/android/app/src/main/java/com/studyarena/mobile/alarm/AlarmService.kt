package com.studyarena.mobile.alarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.studyarena.mobile.R
import java.io.File

class AlarmService : Service() {

    private var mediaPlayer: MediaPlayer? = null
    private var wakeLock: PowerManager.WakeLock? = null

    companion object {
        const val ACTION_DISMISS = "com.studyarena.mobile.alarm.DISMISS"
        const val ACTION_SNOOZE = "com.studyarena.mobile.alarm.SNOOZE"
        const val NOTIFICATION_ID = 4242
        const val CHANNEL_ID = "study_arena_alarm_service_channel"
        private const val TAG = "AlarmService"
    }

    override fun onCreate() {
        super.onCreate()
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "StudyArena:AlarmWakeLock")
        wakeLock?.acquire(10 * 60 * 1000L /*10 minutes*/)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Defensive check: Do not execute or ring on null intents (e.g. system restarts)
        if (intent == null) {
            Log.d(TAG, "onStartCommand received null intent. Stopping service.")
            stopSelf()
            return START_NOT_STICKY
        }

        if (intent.action == ACTION_DISMISS) {
            val id = intent.getStringExtra("id")
            Log.d(TAG, "Dismiss action received for reminder: $id")
            stopAlarm()
            return START_NOT_STICKY
        }

        if (intent.action == ACTION_SNOOZE) {
            val id = intent.getStringExtra("id") ?: ""
            val title = intent.getStringExtra("title") ?: "Study Reminder"
            val soundId = intent.getStringExtra("soundId") ?: "default_alarm"
            val soundUri = intent.getStringExtra("soundUri")

            // Re-schedule for 5 mins
            val newTime = System.currentTimeMillis() + (5 * 60 * 1000)
            Log.d(TAG, "Snooze action received for reminder $id. Rescheduling at $newTime")

            val alarmIntent = Intent(this, AlarmReceiver::class.java).apply {
                putExtra("id", id)
                putExtra("title", title)
                putExtra("soundId", soundId)
                if (!soundUri.isNullOrBlank()) {
                    putExtra("soundUri", soundUri)
                }
            }

            val pendingIntent = PendingIntent.getBroadcast(
                this,
                id.hashCode(),
                alarmIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val alarmManager = getSystemService(Context.ALARM_SERVICE) as android.app.AlarmManager
            alarmManager.setAlarmClock(android.app.AlarmManager.AlarmClockInfo(newTime, pendingIntent), pendingIntent)

            stopAlarm()
            return START_NOT_STICKY
        }

        val id = intent.getStringExtra("id")
        if (id.isNullOrBlank()) {
            Log.w(TAG, "onStartCommand received intent with blank id. Stopping service.")
            stopSelf()
            return START_NOT_STICKY
        }

        val title = intent.getStringExtra("title") ?: "Study Reminder"
        val soundId = intent.getStringExtra("soundId") ?: "default_alarm"
        val soundUri = intent.getStringExtra("soundUri")

        createNotificationChannel()

        val fullScreenIntent = Intent(this, AlarmActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
            putExtra("id", id)
            putExtra("title", title)
            putExtra("soundId", soundId)
            if (!soundUri.isNullOrBlank()) {
                putExtra("soundUri", soundUri)
            }
        }
        val fullScreenPendingIntent = PendingIntent.getActivity(
            this,
            id.hashCode(),
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val dismissIntent = Intent(this, AlarmService::class.java).apply {
            action = ACTION_DISMISS
            putExtra("id", id)
        }
        val dismissPendingIntent = PendingIntent.getService(
            this,
            (id + "_dismiss").hashCode(),
            dismissIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("StudyArena Reminder")
            .setContentText(title)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setOngoing(true)
            .addAction(0, "Dismiss", dismissPendingIntent)
            .build()

        startForeground(NOTIFICATION_ID, notification)

        playAlarmSound(soundId, soundUri)

        // Launch activity explicitly to bring to front
        startActivity(fullScreenIntent)

        return START_NOT_STICKY
    }

    private fun playAlarmSound(soundId: String, soundUri: String?) {
        if (mediaPlayer != null) return

        try {
            var player: MediaPlayer? = null

            // 1. Try custom soundUri if provided
            if (!soundUri.isNullOrBlank()) {
                try {
                    val uri = if (soundUri.startsWith("content://") || soundUri.startsWith("file://")) {
                        Uri.parse(soundUri)
                    } else {
                        Uri.fromFile(File(soundUri))
                    }
                    val mp = MediaPlayer().apply {
                        setDataSource(this@AlarmService, uri)
                        setAudioAttributes(
                            AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_ALARM)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                .build()
                        )
                        isLooping = true
                        prepare()
                        start()
                    }
                    player = mp
                    Log.d(TAG, "Playing custom audio from $soundUri")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to play custom soundUri: $soundUri", e)
                }
            }

            // 2. If no custom player, load built-in raw resources
            if (player == null) {
                val cleanSoundId = when {
                    soundId.isBlank() || soundId == "default" || soundId == "custom" -> "default_alarm"
                    else -> soundId
                }

                val resId = resources.getIdentifier(cleanSoundId, "raw", packageName)
                val fallbackUri = if (resId != 0) {
                    Uri.parse("android.resource://$packageName/$resId")
                } else {
                    Uri.parse("android.resource://$packageName/raw/default_alarm")
                }

                player = MediaPlayer().apply {
                    setDataSource(this@AlarmService, fallbackUri)
                    setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
                    )
                    isLooping = true
                    prepare()
                    start()
                }
                Log.d(TAG, "Playing built-in raw sound $cleanSoundId (resId=$resId)")
            }

            mediaPlayer = player
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize MediaPlayer for alarm", e)
        }
    }

    private fun stopAlarm() {
        try {
            mediaPlayer?.stop()
            mediaPlayer?.release()
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping mediaPlayer", e)
        } finally {
            mediaPlayer = null
            stopForeground(true)
            stopSelf()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        stopAlarm()
        if (wakeLock?.isHeld == true) {
            try {
                wakeLock?.release()
            } catch (e: Exception) {
                Log.e(TAG, "Error releasing wakeLock", e)
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Alarm Service Channel",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                setSound(null, null) // Sound is handled by MediaPlayer
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 500, 500)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }
}
