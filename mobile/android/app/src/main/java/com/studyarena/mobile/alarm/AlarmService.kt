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
import androidx.core.app.NotificationCompat
import com.studyarena.mobile.R

class AlarmService : Service() {

    private var mediaPlayer: MediaPlayer? = null
    private var wakeLock: PowerManager.WakeLock? = null

    companion object {
        const val ACTION_DISMISS = "com.studyarena.mobile.alarm.DISMISS"
        const val ACTION_SNOOZE = "com.studyarena.mobile.alarm.SNOOZE"
        const val NOTIFICATION_ID = 4242
        const val CHANNEL_ID = "study_arena_alarm_service_channel"
    }

    override fun onCreate() {
        super.onCreate()
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "StudyArena:AlarmWakeLock")
        wakeLock?.acquire(10 * 60 * 1000L /*10 minutes*/)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_DISMISS) {
            val id = intent.getStringExtra("id")
            // Mark as handled and stop
            stopAlarm()
            return START_NOT_STICKY
        }
        
        if (intent?.action == ACTION_SNOOZE) {
            val id = intent.getStringExtra("id") ?: ""
            val title = intent.getStringExtra("title") ?: ""
            val soundId = intent.getStringExtra("soundId") ?: ""
            
            // Re-schedule for 5 mins
            val newTime = System.currentTimeMillis() + (5 * 60 * 1000)
            
            val alarmIntent = Intent(this, AlarmReceiver::class.java).apply {
                putExtra("id", id)
                putExtra("title", title)
                putExtra("soundId", soundId)
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

        val id = intent?.getStringExtra("id") ?: ""
        val title = intent?.getStringExtra("title") ?: "Reminder"
        val soundId = intent?.getStringExtra("soundId") ?: "default_alarm"

        createNotificationChannel()

        val fullScreenIntent = Intent(this, AlarmActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
            putExtra("id", id)
            putExtra("title", title)
            putExtra("soundId", soundId)
        }
        val fullScreenPendingIntent = PendingIntent.getActivity(this, 0, fullScreenIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

        val dismissIntent = Intent(this, AlarmService::class.java).apply {
            action = ACTION_DISMISS
            putExtra("id", id)
        }
        val dismissPendingIntent = PendingIntent.getService(this, 1, dismissIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("StudyArena Reminder")
            .setContentText(title)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setOngoing(true)
            .addAction(0, "Dismiss", dismissPendingIntent)
            .build()

        startForeground(NOTIFICATION_ID, notification)

        playAlarmSound(soundId)
        
        // Launch activity explicitly to bring to front if unlocked
        startActivity(fullScreenIntent)

        return START_STICKY
    }

    private fun playAlarmSound(soundId: String) {
        if (mediaPlayer != null) return

        try {
            val resId = resources.getIdentifier(soundId, "raw", packageName)
            val uri = if (resId != 0) {
                Uri.parse("android.resource://$packageName/$resId")
            } else {
                Uri.parse("android.resource://$packageName/raw/default_alarm")
            }

            mediaPlayer = MediaPlayer().apply {
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
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun stopAlarm() {
        mediaPlayer?.stop()
        mediaPlayer?.release()
        mediaPlayer = null
        stopForeground(true)
        stopSelf()
    }

    override fun onDestroy() {
        super.onDestroy()
        stopAlarm()
        if (wakeLock?.isHeld == true) {
            wakeLock?.release()
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
