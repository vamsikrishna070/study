package com.studyarena.mobile.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import org.json.JSONObject

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            
            // Check exact alarm permission on Android 12+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
                return // Can't schedule
            }

            val prefs = context.getSharedPreferences("StudyArenaAlarms", Context.MODE_PRIVATE)
            val allAlarms = prefs.all

            for ((id, value) in allAlarms) {
                if (value is String) {
                    try {
                        val data = JSONObject(value)
                        val timestamp = data.getDouble("timestamp").toLong()
                        val title = data.getString("title")
                        val soundId = data.getString("soundId")

                        // If alarm is in the past, don't schedule one-time alarms
                        // Since JS handles recurrence calculations, if it's past, we wait for JS sync on app open.
                        if (timestamp > System.currentTimeMillis()) {
                            val alarmIntent = Intent(context, AlarmReceiver::class.java).apply {
                                putExtra("id", id)
                                putExtra("title", title)
                                putExtra("soundId", soundId)
                            }
                            
                            val pendingIntent = PendingIntent.getBroadcast(
                                context,
                                id.hashCode(),
                                alarmIntent,
                                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                            )

                            alarmManager.setAlarmClock(AlarmManager.AlarmClockInfo(timestamp, pendingIntent), pendingIntent)
                        } else {
                            // Optionally remove expired alarms
                            prefs.edit().remove(id).apply()
                        }
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
            }
        }
    }
}
