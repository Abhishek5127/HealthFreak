package com.healthfreak.stepcounter

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.atomic.AtomicBoolean

class HealthfreakStepCounterModule : Module() {

  companion object {
    private var instance: HealthfreakStepCounterModule? = null

    fun notifyStepUpdate(steps: Long) {
      try {
        instance?.sendEvent("onStepCountChange", mapOf("steps" to steps.toDouble()))
      } catch (_: Exception) {}
    }
  }

  override fun definition() = ModuleDefinition {
    Name("HealthfreakStepCounter")

    Events("onStepCountChange")

    OnCreate {
      instance = this@HealthfreakStepCounterModule
    }

    OnDestroy {
      if (instance == this@HealthfreakStepCounterModule) {
        instance = null
      }
    }

    AsyncFunction("isSensorAvailable") {
      val context = appContext.reactContext ?: return@AsyncFunction false
      val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
      val sensor = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
      return@AsyncFunction sensor != null
    }

    AsyncFunction("getTodaySteps") { promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.resolve(0.0)
        return@AsyncFunction
      }

      val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
      val stepSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
      if (sensorManager == null || stepSensor == null) {
        promise.resolve(StepStorage.getTodaySteps(context).toDouble())
        return@AsyncFunction
      }

      val resolved = AtomicBoolean(false)
      val listener = object : SensorEventListener {
        override fun onSensorChanged(event: SensorEvent?) {
          if (event != null && event.values.isNotEmpty()) {
            if (resolved.compareAndSet(false, true)) {
              try {
                sensorManager.unregisterListener(this)
              } catch (_: Exception) {}
              val raw = event.values[0].toLong()
              val steps = StepStorage.onRawSensorReading(context, raw)
              promise.resolve(steps.toDouble())
            }
          }
        }

        override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
      }

      val registered = sensorManager.registerListener(
        listener,
        stepSensor,
        SensorManager.SENSOR_DELAY_FASTEST
      )

      if (!registered) {
        promise.resolve(StepStorage.getTodaySteps(context).toDouble())
      } else {
        // Fallback after 1 second if sensor is sleeping
        Handler(Looper.getMainLooper()).postDelayed({
          if (resolved.compareAndSet(false, true)) {
            try {
              sensorManager.unregisterListener(listener)
            } catch (_: Exception) {}
            promise.resolve(StepStorage.getTodaySteps(context).toDouble())
          }
        }, 1000)
      }
    }

    AsyncFunction("startBackgroundService") {
      val context = appContext.reactContext ?: return@AsyncFunction false
      StepStorage.setBackgroundTrackingEnabled(context, true)
      StepTrackingService.start(context)
      return@AsyncFunction true
    }

    AsyncFunction("stopBackgroundService") {
      val context = appContext.reactContext ?: return@AsyncFunction false
      StepStorage.setBackgroundTrackingEnabled(context, false)
      StepTrackingService.stop(context)
      return@AsyncFunction true
    }

    AsyncFunction("isBackgroundServiceRunning") {
      return@AsyncFunction StepTrackingService.isRunning
    }

    AsyncFunction("setDailyStepGoal") { goal: Int ->
      val context = appContext.reactContext ?: return@AsyncFunction
      StepStorage.setStepGoal(context, goal)
    }

    AsyncFunction("resetTodaySteps") { promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.resolve(null)
        return@AsyncFunction
      }

      val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
      val stepSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)

      if (sensorManager == null || stepSensor == null) {
        StepStorage.resetTodaySteps(context, StepStorage.getLastRawReading(context))
        promise.resolve(null)
        return@AsyncFunction
      }

      val resolved = AtomicBoolean(false)
      val listener = object : SensorEventListener {
        override fun onSensorChanged(event: SensorEvent?) {
          if (event != null && event.values.isNotEmpty()) {
            if (resolved.compareAndSet(false, true)) {
              try {
                sensorManager.unregisterListener(this)
              } catch (_: Exception) {}
              val raw = event.values[0].toLong()
              StepStorage.resetTodaySteps(context, raw)
              promise.resolve(null)
            }
          }
        }

        override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
      }

      val registered = sensorManager.registerListener(
        listener,
        stepSensor,
        SensorManager.SENSOR_DELAY_FASTEST
      )

      if (!registered) {
        StepStorage.resetTodaySteps(context, StepStorage.getLastRawReading(context))
        promise.resolve(null)
      } else {
        Handler(Looper.getMainLooper()).postDelayed({
          if (resolved.compareAndSet(false, true)) {
            try {
              sensorManager.unregisterListener(listener)
            } catch (_: Exception) {}
            StepStorage.resetTodaySteps(context, StepStorage.getLastRawReading(context))
            promise.resolve(null)
          }
        }, 1000)
      }
    }
  }
}

