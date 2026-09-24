package com.wasilah.widgetalarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequest
import androidx.work.OutOfQuotaPolicy
import androidx.work.WorkManager
import com.reactnativeandroidwidget.RNWidgetBackgroundTaskWorker

/** Must match the widget name in app.config.ts and WIDGET_NAME in JS. */
const val WIDGET_NAME = "Streak"

/**
 * The alarm has fired: run the widget's background task.
 *
 * Enqueued directly rather than through the widget library's own
 * `requestWidgetUpdate`, which does nothing when no widget is placed. This
 * task must run either way — it is also what notices that rain has started
 * and raises the alert — so it is queued with a widget id of -1, which the JS
 * handler reads as "no widget to draw, but do the rest".
 */
class WidgetAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    enqueueWidgetTask(context, "WIDGET_UPDATE")
  }
}

class WidgetBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    enqueueWidgetTask(context, "WIDGET_UPDATE")
  }
}

fun enqueueWidgetTask(context: Context, action: String) {
  val data = Data.Builder()
    .putString("widgetName", WIDGET_NAME)
    .putInt("widgetId", -1)
    .putInt("width", 0)
    .putInt("height", 0)
    .putString("widgetAction", action)
    .build()

  val builder = OneTimeWorkRequest.Builder(RNWidgetBackgroundTaskWorker::class.java)
    .setInputData(data)
  if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
    builder.setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
  }

  WorkManager.getInstance(context).enqueueUniqueWork(
    context.packageName + ".WIDGET_ALARM_TICK",
    ExistingWorkPolicy.REPLACE,
    builder.build()
  )
}
