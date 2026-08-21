package com.studyarena.mobile.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.*
import org.json.JSONObject
import java.io.File

class AlarmModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var previewPlayer: MediaPlayer? = null

    companion object {
        private const val TAG = "AlarmModule"
        private const val PREFS_NAME = "StudyArenaAlarms"
    }

    override fun getName(): String {
        return "AlarmModule"
    }

    private fun getPrefs(): SharedPreferences {
        return reactApplicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    @ReactMethod
    fun checkExactAlarmPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val alarmManager = reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
                val canSchedule = alarmManager?.canScheduleExactAlarms() ?: true
                promise.resolve(canSchedule)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking exact alarm permission", e)
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun openExactAlarmSettings(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error opening exact alarm settings", e)
            promise.reject("SETTINGS_ERROR", e.message)
        }
    }

    @ReactMethod
    fun scheduleAlarm(id: String, timestamp: Double, title: String, soundId: String, soundUri: String?, promise: Promise) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            if (alarmManager == null) {
                promise.reject("ALARM_SERVICE_NULL", "AlarmManager service is unavailable")
                return
            }

            // Check exact alarm permission on Android 12+ (API 31+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
                promise.reject("PERMISSION_DENIED", "Exact alarm permission not granted.")
                return
            }

            // Calculate trigger time in milliseconds
            val triggerAtMillis = timestamp.toLong()

            // Defensive check: Do not schedule alarms in the past
            if (triggerAtMillis <= System.currentTimeMillis()) {
                Log.w(TAG, "Refusing to schedule alarm in the past: $triggerAtMillis <= ${System.currentTimeMillis()}")
                promise.reject("INVALID_TIMESTAMP", "Alarm trigger time must be strictly in the future.")
                return
            }

            val intent = Intent(context, AlarmReceiver::class.java).apply {
                putExtra("id", id)
                putExtra("title", title)
                putExtra("soundId", soundId)
                if (!soundUri.isNullOrBlank()) {
                    putExtra("soundUri", soundUri)
                }
            }

            val requestCode = id.hashCode()

            val pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Schedule the alarm using setAlarmClock for high reliability
            val info = AlarmManager.AlarmClockInfo(triggerAtMillis, pendingIntent)
            alarmManager.setAlarmClock(info, pendingIntent)

            // Persist the alarm state for device reboot recovery
            val prefs = getPrefs()
            val alarmData = JSONObject().apply {
                put("id", id)
                put("timestamp", timestamp)
                put("title", title)
                put("soundId", soundId)
                if (!soundUri.isNullOrBlank()) {
                    put("soundUri", soundUri)
                }
            }
            prefs.edit().putString(id, alarmData.toString()).apply()

            Log.d(TAG, "Successfully scheduled alarm for id=$id at $triggerAtMillis with soundId=$soundId")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error scheduling alarm", e)
            promise.reject("ALARM_ERROR", e.message)
        }
    }

    @ReactMethod
    fun cancelAlarm(id: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager

            val intent = Intent(context, AlarmReceiver::class.java)
            val requestCode = id.hashCode()

            val pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            alarmManager?.cancel(pendingIntent)

            // Remove from persistence
            val prefs = getPrefs()
            prefs.edit().remove(id).apply()

            Log.d(TAG, "Cancelled alarm id=$id")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error cancelling alarm", e)
            promise.reject("CANCEL_ERROR", e.message)
        }
    }

    @ReactMethod
    fun playAudioPreview(soundId: String, soundUri: String?, promise: Promise) {
        try {
            stopPreviewInternal()

            val context = reactApplicationContext
            var player: MediaPlayer? = null

            // 1. Try custom soundUri if provided and file exists
            if (!soundUri.isNullOrBlank()) {
                try {
                    val uri = if (soundUri.startsWith("content://") || soundUri.startsWith("file://")) {
                        Uri.parse(soundUri)
                    } else {
                        val file = File(soundUri)
                        if (file.exists()) Uri.fromFile(file) else Uri.parse(soundUri)
                    }

                    val mp = MediaPlayer().apply {
                        setDataSource(context, uri)
                        setAudioAttributes(
                            AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_MEDIA)
                                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                                .build()
                        )
                        isLooping = false
                        prepare()
                        start()
                    }
                    player = mp
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to preview custom soundUri: $soundUri", e)
                }
            }

            // 2. Fallback to built-in raw sound resources if custom sound couldn't be loaded
            if (player == null) {
                val cleanSoundId = when {
                    soundId.isBlank() || soundId == "default" || soundId == "custom" -> "default_alarm"
                    else -> soundId
                }

                var resId = context.resources.getIdentifier(cleanSoundId, "raw", context.packageName)
                if (resId == 0) {
                    resId = context.resources.getIdentifier("default_alarm", "raw", context.packageName)
                }

                if (resId != 0) {
                    val fallbackUri = Uri.parse("android.resource://${context.packageName}/$resId")
                    val mp = MediaPlayer().apply {
                        setDataSource(context, fallbackUri)
                        setAudioAttributes(
                            AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_MEDIA)
                                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                                .build()
                        )
                        isLooping = false
                        prepare()
                        start()
                    }
                    player = mp
                }
            }

            if (player != null) {
                previewPlayer = player
                promise.resolve(true)
            } else {
                promise.reject("AUDIO_PREVIEW_FAILED", "Could not initialize audio player for sound preview.")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to play preview", e)
            promise.reject("PREVIEW_ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopAudioPreview(promise: Promise) {
        try {
            stopPreviewInternal()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("PREVIEW_STOP_ERROR", e.message)
        }
    }

    private fun stopPreviewInternal() {
        try {
            previewPlayer?.stop()
            previewPlayer?.release()
        } catch (_: Exception) {}
        previewPlayer = null
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        stopPreviewInternal()
    }
}
