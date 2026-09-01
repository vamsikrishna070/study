package com.studyarena.mobile.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.*
import org.json.JSONObject
import java.io.File
import java.io.FileInputStream

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

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
                promise.reject("PERMISSION_DENIED", "Exact alarm permission not granted.")
                return
            }

            val triggerAtMillis = timestamp.toLong()

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

            val info = AlarmManager.AlarmClockInfo(triggerAtMillis, pendingIntent)
            alarmManager.setAlarmClock(info, pendingIntent)

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

            if (!soundUri.isNullOrBlank()) {
                try {
                    val cleanPath = when {
                        soundUri.startsWith("file://") -> Uri.parse(soundUri).path ?: soundUri.removePrefix("file://")
                        else -> soundUri
                    }
                    val file = File(cleanPath)

                    if (file.exists() && file.canRead()) {
                        val mp = MediaPlayer()
                        FileInputStream(file).use { fis ->
                            mp.setDataSource(fis.fd)
                        }
                        mp.setAudioAttributes(
                            AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_MEDIA)
                                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                                .build()
                        )
                        mp.isLooping = false
                        mp.prepare()
                        mp.start()
                        player = mp
                        Log.d(TAG, "Successfully started preview for file: $cleanPath")
                    } else if (soundUri.startsWith("content://")) {
                        context.contentResolver.openFileDescriptor(Uri.parse(soundUri), "r")?.use { pfd ->
                            val mp = MediaPlayer().apply {
                                setDataSource(pfd.fileDescriptor)
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
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to preview custom soundUri: $soundUri", e)
                }
            }

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

    @ReactMethod
    fun openDocument(fileUri: String, mimeType: String, promise: Promise) {
        try {
            val context = reactApplicationContext.currentActivity ?: reactApplicationContext
            val cleanMimeType = if (mimeType.isBlank()) "application/pdf" else mimeType

            val contentUri: Uri = if (fileUri.startsWith("content://")) {
                Uri.parse(fileUri)
            } else {
                val cleanPath = when {
                    fileUri.startsWith("file://") -> Uri.parse(fileUri).path ?: fileUri.removePrefix("file://")
                    else -> fileUri
                }
                val file = File(cleanPath)
                if (!file.exists() || file.length() == 0L) {
                    promise.resolve(false)
                    return
                }
                androidx.core.content.FileProvider.getUriForFile(
                    context,
                    "${context.packageName}.FileSystemFileProvider",
                    file
                )
            }

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(contentUri, cleanMimeType)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            val packageManager = context.packageManager
            val resList = packageManager.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY)

            for (resolveInfo in resList) {
                val packageName = resolveInfo.activityInfo.packageName
                context.grantUriPermission(packageName, contentUri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            if (resList.isNotEmpty()) {
                context.startActivity(intent)
                promise.resolve(true)
            } else {
                val genericIntent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(contentUri, "*/*")
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                val genericList = packageManager.queryIntentActivities(genericIntent, 0)
                for (resolveInfo in genericList) {
                    val packageName = resolveInfo.activityInfo.packageName
                    context.grantUriPermission(packageName, contentUri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }

                if (genericList.isNotEmpty()) {
                    val chooser = Intent.createChooser(genericIntent, "Open with").apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(chooser)
                    promise.resolve(true)
                } else {
                    Log.d(TAG, "No activity available on device to open document mimeType=$cleanMimeType")
                    promise.resolve(false)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error opening document via native intent: $fileUri", e)
            promise.resolve(false)
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
