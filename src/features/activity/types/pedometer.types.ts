export type PedometerPermissionState =
  | 'unknown'
  | 'granted'
  | 'denied'
  | 'restricted'
  | 'unavailable';

export interface StepSummary {
  date: string; // Format: YYYY-MM-DD (local calendar date)
  steps: number;
  stepGoal: number;
  distanceMeters: number;
  caloriesBurned: number; // Estimated active calories (kcal)
  activeMinutes: number;
  source: 'device' | 'manual' | 'cloud';
  updatedAt: string;
}

export interface PedometerTrackingSession {
  date: string;
  accumulatedSteps: number; // Steps before current active listener session
  sessionSteps: number; // Steps reported by current active listener
  lastUpdated: string;
}

export interface PedometerState extends StepSummary {
  todaySteps: number; // Convenient alias for steps
  calories: number; // Convenient alias for caloriesBurned
  permissionStatus: PedometerPermissionState;
  hasPermission: boolean;
  isAvailable: boolean;
  isTracking: boolean;
  trackingEngine: 'hardware' | 'motion' | 'idle';
  history: StepSummary[];
  lastSyncedAt: string | null;
  lastUpdated: string;
}

export interface ActivityContext {
  todaySteps: number | null;
  dailyStepGoal: number;
  distanceMeters: number | null;
  activeMinutes: number | null;
  caloriesBurned: number | null;
  previousDaySteps: number | null;
  weeklySteps: number | null;
  weeklyGoalAchievementDays: number | null;
  trackingAvailable: boolean;
  lastSyncedAt: string | null;
}

export interface ActivityInsight {
  id: string;
  type: 'achievement' | 'comparison' | 'recommendation' | 'streak';
  title: string;
  description: string;
  iconName: string;
}
