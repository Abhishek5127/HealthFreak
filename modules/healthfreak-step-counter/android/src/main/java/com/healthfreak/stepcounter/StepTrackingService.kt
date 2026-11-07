package com.healthfreak.stepcounter

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import java.text.NumberFormat
import java.util.Locale

class StepTrackingService : Service(), SensorEventListener {

  private lateinit var sensorManager: SensorManager
  private var stepSensor: Sensor? = null
  private lateinit var notificationManager: NotificationManager

  companion object {
    const val NOTIFICATION_ID = 8841
    const val CHANNEL_ID = "healthfreak_step_tracker_channel"
    var isRunning: Boolean = false
      private set
    private var instance: StepTrackingService? = null

    fun flush() {
      try {
        instance?.let { s ->
          s.sensorManager.flush(s)
        }
      } catch (_: Exception) {}
    }

    fun start(context: Context) {
      val intent = Intent(context, StepTrackingService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    fun stop(context: Context) {
      val intent = Intent(context, StepTrackingService::class.java)
      context.stopService(intent)
    }
  }

  override fun onCreate() {
    super.onCreate()
    instance = this
    isRunning = true
    notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
    // Prioritize wake-up sensor variant so steps count reliably 24/7 even in deep Doze mode
    stepSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER, true)
      ?: sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)

    createNotificationChannel()

    if (stepSensor != null) {
      // 30-second batching latency balances CPU sleep with responsive step updates
      sensorManager.registerListener(
        this,
        stepSensor,
        SensorManager.SENSOR_DELAY_NORMAL,
        30_000_000
      )
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val steps = StepStorage.getTodaySteps(this)
    val notification = buildNotification(steps)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) { // Android 14+
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }

    return START_STICKY
  }

  override fun onSensorChanged(event: SensorEvent?) {
    if (event == null || event.values.isEmpty()) return
    val rawSteps = event.values[0].toLong()
    val todaySteps = StepStorage.onRawSensorReading(this, rawSteps)

    // Update ongoing persistent notification
    notificationManager.notify(NOTIFICATION_ID, buildNotification(todaySteps))

    // Notify any active module listener
    HealthfreakStepCounterModule.notifyStepUpdate(todaySteps)
  }

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
    // No-op for step counter
  }

  override fun onTaskRemoved(rootIntent: Intent?) {
    super.onTaskRemoved(rootIntent)
    // Keep foreground step counter service running even if user swipes app away from recents
    if (StepStorage.isBackgroundTrackingEnabled(this)) {
      val restartServiceIntent = Intent(applicationContext, StepTrackingService::class.java).also {
        it.setPackage(packageName)
      }
      val restartServicePendingIntent = PendingIntent.getService(
        this, 1, restartServiceIntent,
        PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
      )
      val alarmService = getSystemService(Context.ALARM_SERVICE) as? android.app.AlarmManager
      alarmService?.set(
        android.app.AlarmManager.ELAPSED_REALTIME,
        android.os.SystemClock.elapsedRealtime() + 1500,
        restartServicePendingIntent
      )
    }
  }

  override fun onDestroy() {
    if (instance == this) {
      instance = null
    }
    isRunning = false
    try {
      sensorManager.unregisterListener(this)
    } catch (_: Exception) {}
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? {
    return null
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "HealthFreak Step Counter",
        NotificationManager.IMPORTANCE_LOW
      ).apply {
        description = "Shows live step count and runs background step tracking"
        setShowBadge(false)
      }
      notificationManager.createNotificationChannel(channel)
    }
  }

  private fun buildNotification(steps: Long): Notification {
    val formattedSteps = NumberFormat.getNumberInstance(Locale.US).format(steps)
    val goal = StepStorage.getStepGoal(this)
    val formattedGoal = NumberFormat.getNumberInstance(Locale.US).format(goal)

    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
      flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    val pendingIntent = if (launchIntent != null) {
      PendingIntent.getActivity(
        this,
        0,
        launchIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    } else null

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("HealthFreak Step Tracker")
      .setContentText("$formattedSteps / $formattedGoal steps today")
      .setSmallIcon(android.R.drawable.ic_menu_directions)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setContentIntent(pendingIntent)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setCategory(NotificationCompat.CATEGORY_STATUS)
      .build()
  }
}

