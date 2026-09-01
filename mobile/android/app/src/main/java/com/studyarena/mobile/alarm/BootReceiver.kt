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

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
                return
            }

            val prefs = context.getSharedPreferences("StudyArenaAlarms", Context.MODE_PRIVATE)
            val allAlarms = prefs.all

            for ((id, value) in allAlarms) {
                if (value is String) {
                    try {
                        val data = JSONObject(value)
                        val timestamp = data.getDouble("timestamp").toLong()
                        val title = data.getString("title")
                        val soundId = data.optString("soundId", "default_alarm")
                        val soundUri = data.optString("soundUri", null)

                        if (timestamp > System.currentTimeMillis()) {
                            val alarmIntent = Intent(context, AlarmReceiver::class.java).apply {
                                putExtra("id", id)
                                putExtra("title", title)
                                putExtra("soundId", soundId)
                                if (!soundUri.isNullOrBlank()) {
                                    putExtra("soundUri", soundUri)
                                }
                            }

                            val pendingIntent = PendingIntent.getBroadcast(
                                context,
                                id.hashCode(),
                                alarmIntent,
                                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                            )

                            alarmManager.setAlarmClock(AlarmManager.AlarmClockInfo(timestamp, pendingIntent), pendingIntent)
                        } else {

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
