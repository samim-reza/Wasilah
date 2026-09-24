package com.wasilah.widgetalarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Wakes the home-screen widget at chosen instants.
 *
 * Android redraws a widget on its own no more often than every half hour,
 * which is useless for "it is now Maghrib". This module sets alarms for the
 * instants the widget's card will change, and each alarm asks the widget
 * library for a redraw — the same background task, the same JS handler.
 *
 * Exact alarms need the "Alarms & reminders" special access on Android 12
 * and later. When it is granted the alarm lands on the minute; when it is
 * not, the alarm is windowed and Android may deliver it up to ten minutes
 * late, which is still far better than thirty.
 */
class WidgetAlarmModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("WidgetAlarm")

    /** Replaces every pending alarm with the given instants (epoch millis). */
    Function("schedule") { times: List<Double> ->
      val context = appContext.reactContext ?: return@Function false
      WidgetAlarmScheduler.schedule(context, times.map { it.toLong() })
      true
    }

    Function("cancelAll") {
      val context = appContext.reactContext ?: return@Function false
      WidgetAlarmScheduler.cancelAll(context)
      true
    }

    Function("canScheduleExact") {
      val context = appContext.reactContext ?: return@Function false
      WidgetAlarmScheduler.canScheduleExact(context)
    }

    /** Opens the system page where the user can allow exact alarms. */
    Function("openExactAlarmSettings") {
      val context = appContext.reactContext ?: return@Function false
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@Function false
      try {
        val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
          data = Uri.parse("package:" + context.packageName)
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
        true
      } catch (e: Exception) {
        false
      }
    }
  }
}

object WidgetAlarmScheduler {
  /** How many wake-ups may be pending at once. Enough for a day of moments. */
  const val MAX_ALARMS = 24
  private const val REQUEST_BASE = 41000
  private const val WINDOW_MS = 10L * 60 * 1000

  fun canScheduleExact(context: Context): Boolean {
    val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    return Build.VERSION.SDK_INT < Build.VERSION_CODES.S || manager.canScheduleExactAlarms()
  }

  fun schedule(context: Context, times: List<Long>) {
    cancelAll(context)
    val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val exact = canScheduleExact(context)
    val now = System.currentTimeMillis()

    times.filter { it > now }.sorted().take(MAX_ALARMS).forEachIndexed { index, at ->
      val pending = pendingIntent(context, index)
      try {
        if (exact) {
          manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
        } else {
          manager.setWindow(AlarmManager.RTC_WAKEUP, at, WINDOW_MS, pending)
        }
      } catch (e: SecurityException) {
        // Exact permission revoked between the check and the call.
        manager.setWindow(AlarmManager.RTC_WAKEUP, at, WINDOW_MS, pending)
      }
    }
  }

  fun cancelAll(context: Context) {
    val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    for (index in 0 until MAX_ALARMS) {
      manager.cancel(pendingIntent(context, index))
    }
  }

  private fun pendingIntent(context: Context, index: Int): PendingIntent {
    val intent = Intent(context, WidgetAlarmReceiver::class.java).apply {
      action = context.packageName + ".WIDGET_ALARM"
      putExtra("index", index)
    }
    return PendingIntent.getBroadcast(
      context,
      REQUEST_BASE + index,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }
}
