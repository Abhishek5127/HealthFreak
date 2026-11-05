package com.healthfreak.stepcounter

import android.content.Context
import android.content.SharedPreferences
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object StepStorage {
  private const val PREFS_NAME = "healthfreak_steps_prefs"
  private const val KEY_TODAY_DATE = "today_date"
  private const val KEY_TODAY_BASELINE_RAW = "today_baseline_raw"
  private const val KEY_LAST_RAW_READING = "last_raw_reading"
  private const val KEY_REBOOT_OFFSET = "reboot_offset"
  private const val KEY_TODAY_STEPS = "today_steps"
  private const val KEY_STEP_GOAL = "step_goal"
  private const val KEY_BG_ENABLED = "bg_tracking_enabled"

  private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)

  fun getPreferences(context: Context): SharedPreferences {
    return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
  }

  fun getTodayDate(): String {
    return dateFormat.format(Date())
  }

  /**
   * Processes a raw sensor reading from Sensor.TYPE_STEP_COUNTER.
   * Handles midnight rollover and phone reboot events accurately.
   */
  @Synchronized
  fun onRawSensorReading(context: Context, rawSteps: Long): Long {
    val prefs = getPreferences(context)
    val todayStr = getTodayDate()
    val storedDate = prefs.getString(KEY_TODAY_DATE, null)
    var baselineRaw = prefs.getLong(KEY_TODAY_BASELINE_RAW, -1L)
    var lastRaw = prefs.getLong(KEY_LAST_RAW_READING, -1L)
    var rebootOffset = prefs.getLong(KEY_REBOOT_OFFSET, 0L)

    // Midnight rollover detection
    if (storedDate == null || storedDate != todayStr) {
      baselineRaw = rawSteps
      lastRaw = rawSteps
      rebootOffset = 0L
      prefs.edit()
        .putString(KEY_TODAY_DATE, todayStr)
        .putLong(KEY_TODAY_BASELINE_RAW, baselineRaw)
        .putLong(KEY_LAST_RAW_READING, lastRaw)
        .putLong(KEY_REBOOT_OFFSET, 0L)
        .putLong(KEY_TODAY_STEPS, 0L)
        .apply()
      return 0L
    }

    // Phone reboot detection (hardware counter resets to 0 on boot)
    if (lastRaw > 0L && rawSteps < lastRaw) {
      val stepsBeforeReboot = if (lastRaw >= baselineRaw) (lastRaw - baselineRaw) else 0L
      rebootOffset += stepsBeforeReboot
      baselineRaw = rawSteps
    }

    if (baselineRaw < 0L) {
      baselineRaw = rawSteps
    }

    val delta = if (rawSteps >= baselineRaw) (rawSteps - baselineRaw) else 0L
    val computedSteps = delta + rebootOffset

    prefs.edit()
      .putLong(KEY_TODAY_BASELINE_RAW, baselineRaw)
      .putLong(KEY_LAST_RAW_READING, rawSteps)
      .putLong(KEY_REBOOT_OFFSET, rebootOffset)
      .putLong(KEY_TODAY_STEPS, computedSteps)
      .apply()

    return computedSteps
  }

  fun getTodaySteps(context: Context): Long {
    val prefs = getPreferences(context)
    val todayStr = getTodayDate()
    val storedDate = prefs.getString(KEY_TODAY_DATE, null)
    if (storedDate != todayStr) {
      return 0L
    }
    return prefs.getLong(KEY_TODAY_STEPS, 0L)
  }

  fun getLastRawReading(context: Context): Long {
    return getPreferences(context).getLong(KEY_LAST_RAW_READING, 0L)
  }

  fun getStepGoal(context: Context): Int {
    return getPreferences(context).getInt(KEY_STEP_GOAL, 10000)
  }

  fun setStepGoal(context: Context, goal: Int) {
    getPreferences(context).edit().putInt(KEY_STEP_GOAL, goal).apply()
  }

  fun isBackgroundTrackingEnabled(context: Context): Boolean {
    // Default to true so steps count 24/7 in background out of the box
    return getPreferences(context).getBoolean(KEY_BG_ENABLED, true)
  }

  fun setBackgroundTrackingEnabled(context: Context, enabled: Boolean) {
    getPreferences(context).edit().putBoolean(KEY_BG_ENABLED, enabled).apply()
  }

  @Synchronized
  fun resetTodaySteps(context: Context, currentRaw: Long) {
    val prefs = getPreferences(context)
    val todayStr = getTodayDate()
    prefs.edit()
      .putString(KEY_TODAY_DATE, todayStr)
      .putLong(KEY_TODAY_BASELINE_RAW, currentRaw)
      .putLong(KEY_LAST_RAW_READING, currentRaw)
      .putLong(KEY_REBOOT_OFFSET, 0L)
      .putLong(KEY_TODAY_STEPS, 0L)
      .apply()
  }
}
