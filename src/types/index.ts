export type TabType = 'home' | 'plan' | 'coach' | 'progress' | 'profile';

export type ModalType =
  | null
  | 'splash'
  | 'onboarding'
  | 'checkin'
  | 'activity_session'
  | 'lab_report'
  | 'voice_overlay';

export type WellnessGoal =
  | 'weight_management'
  | 'pcos_pcod'
  | 'thyroid_health'
  | 'metabolic_fitness'
  | 'hair_health'
  | 'energy_vitality';

export type LanguagePreference = 'English' | 'Hindi' | 'Hinglish';

export type CheckInMood = 'lowEnergy' | 'tense' | 'calm' | 'balanced' | 'energized';

export interface UserProfile {
  id?: string;
  name: string;
  avatarUrl?: string;
  streakDays: number;
  selectedGoal: WellnessGoal;
  goalLabel: string;
  language: LanguagePreference;
  onboardingCompleted: boolean;
  currentMood: CheckInMood;
  lastCheckInTime?: string;
  healthConditions: string[];
}

export interface DailyActivityItem {
  id: string;
  title: string;
  category: 'nutrition' | 'movement' | 'habit' | 'symptom';
  time: string;
  duration?: string;
  intensity?: 'Gentle' | 'Moderate' | 'High intensity';
  tags: string[];
  completed: boolean;
  description: string;
  calories?: number;
  iconName: string;
}

export interface ActivitySessionStep {
  title: string;
  durationSeconds: number;
  instructions: string;
  postureTip?: string;
}

export interface ActivitySession {
  id: string;
  title: string;
  subtitle: string;
  timeSlot: string;
  intensity: string;
  durationMinutes: number;
  tags: string[];
  trainerName: string;
  steps: ActivitySessionStep[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  timestamp: string;
  isQuickReply?: boolean;
  suggestions?: string[];
  actionLink?: {
    type: 'open_plan' | 'open_checkin' | 'open_labs';
    label: string;
  };
}

export interface ProgressMetric {
  id: string;
  title: string;
  value: string;
  target: string;
  percentage: number;
  unit: string;
  trend: 'up' | 'down' | 'steady';
  trendLabel: string;
  color: string;
}

export interface BiomarkerResult {
  id: string;
  name: string;
  value: number;
  unit: string;
  referenceRange: string;
  status: 'optimal' | 'normal' | 'borderline' | 'attention';
  category: string;
  insight: string;
}

export interface LabReport {
  id: string;
  title: string;
  date: string;
  labName: string;
  summary: string;
  biomarkers: BiomarkerResult[];
  coachRecommendation: string;
}

