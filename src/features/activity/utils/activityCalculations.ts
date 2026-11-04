import { StepSummary, ActivityInsight } from '../types/pedometer.types';
import { formatShortDate, isToday } from './stepDateUtils';

/**
 * Calculates stride length in meters based on height (cm) and biological sex.
 * Male: height * 0.415
 * Female: height * 0.413
 * Default: 0.74m
 */
export function calculateStrideLengthMeters(heightCm?: number, sex?: string): number {
  if (!heightCm || heightCm < 50 || heightCm > 250) {
    return 0.74; // Standard adult average stride in meters
  }

  const factor = sex?.toLowerCase() === 'female' ? 0.413 : 0.415;
  return (heightCm * factor) / 100;
}

/**
 * Calculates estimated walking distance in meters from step count.
 */
export function calculateDistanceMeters(
  steps: number,
  heightCm?: number,
  sex?: string
): number {
  if (steps <= 0) return 0;
  const stride = calculateStrideLengthMeters(heightCm, sex);
  return Math.round(steps * stride);
}

/**
 * Formats distance in meters into human-readable string (km or m).
 */
export function formatDistance(meters: number): string {
  if (meters <= 0) return '0 m';
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
}

/**
 * Calculates estimated active calories burned from walking steps.
 * Formula: steps * weightKg * 0.0005 (MET ~3.3 brisk walking).
 * Returns null if weightKg is not provided, so UI can display "Calories unavailable".
 */
export function calculateActiveCalories(
  steps: number,
  weightKg?: number
): number | null {
  if (steps <= 0) return 0;
  if (!weightKg || weightKg <= 20 || weightKg > 300) {
    return null;
  }
  // Formula: kcal = steps * weight(kg) * 0.0005
  return Math.round(steps * weightKg * 0.0005);
}

/**
 * Calculates active movement minutes based on standard brisk walking cadence (~105 steps/min).
 */
export function calculateActiveMinutes(steps: number): number {
  if (steps <= 0) return 0;
  return Math.max(1, Math.round(steps / 105));
}

/**
 * Formats minutes into human-readable duration (e.g. "45m" or "1h 15m").
 */
export function formatActiveTime(minutes: number): string {
  if (minutes <= 0) return '0m';
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hrs = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hrs}h ${remainingMins}m` : `${hrs}h`;
}

/**
 * Generates deterministic insights strictly from real activity records.
 * Never fabricates numbers or patterns if data is insufficient.
 */
export function generateActivityInsights(
  history: StepSummary[],
  todaySummary: StepSummary
): ActivityInsight[] {
  const insights: ActivityInsight[] = [];

  // 1. Goal Achievement Check for Today
  if (todaySummary.steps >= todaySummary.stepGoal && todaySummary.stepGoal > 0) {
    insights.push({
      id: 'insight_goal_today',
      type: 'achievement',
      title: 'Daily Goal Achieved! 🎯',
      description: `You surpassed your ${todaySummary.stepGoal.toLocaleString()} step goal today by ${(todaySummary.steps - todaySummary.stepGoal).toLocaleString()} steps.`,
      iconName: 'Award',
    });
  }

  // 2. Comparison with Yesterday
  const yesterdayRecord = history.find((h) => !isToday(h.date));
  if (yesterdayRecord && yesterdayRecord.steps > 0 && todaySummary.steps > 0) {
    const diff = todaySummary.steps - yesterdayRecord.steps;
    if (diff > 500) {
      insights.push({
        id: 'insight_vs_yesterday_more',
        type: 'comparison',
        title: 'Ahead of Yesterday',
        description: `You have walked ${diff.toLocaleString()} more steps today than yesterday at this time.`,
        iconName: 'TrendingUp',
      });
    } else if (diff < -1500) {
      insights.push({
        id: 'insight_vs_yesterday_less',
        type: 'recommendation',
        title: 'Step Up the Rhythm',
        description: `You are ${Math.abs(diff).toLocaleString()} steps behind yesterday's pace. A short 15-minute evening walk can close the gap.`,
        iconName: 'Footprints',
      });
    }
  }

  // 3. Weekly Goal Consistency
  const validHistory = history.filter((h) => h.steps > 0);
  if (validHistory.length >= 3) {
    const goalMetCount = validHistory.filter((h) => h.steps >= h.stepGoal).length;
    if (goalMetCount >= 2) {
      insights.push({
        id: 'insight_weekly_consistency',
        type: 'streak',
        title: 'Consistent Mover',
        description: `You hit your step target on ${goalMetCount} of the past ${validHistory.length} tracked days.`,
        iconName: 'Zap',
      });
    }

    // 4. Most active day
    const mostActive = [...validHistory].sort((a, b) => b.steps - a.steps)[0];
    if (mostActive && mostActive.steps > 2000) {
      insights.push({
        id: 'insight_most_active',
        type: 'achievement',
        title: 'Peak Activity Day',
        description: `Your highest count this week was ${mostActive.steps.toLocaleString()} steps on ${formatShortDate(mostActive.date)}.`,
        iconName: 'Flame',
      });
    }
  }

  return insights;
}

