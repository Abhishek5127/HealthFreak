export interface User {
  id: string;
  name: string;
  phone: string; // Indian E.164 +91...
  languagePreference: 'en' | 'hi' | 'hinglish';
  callingConsent: boolean;
  consentTimestamp: string;
  optedOut: boolean;
  preferredCallHourIST: number; // 9 - 19
  healthGoals: string[];
  knownConditions: string[];
  currentEnergyLevel: string;
}

export interface MemoryFact {
  key: string;
  value: any;
  confidence: number;
  lastUpdated: string;
  sourceCallId?: string;
}

export interface PlanItem {
  id: string;
  name: string;
  category: 'nutrition' | 'movement' | 'recovery';
  timing: string;
  details: string;
  contraindications?: string[];
}

export interface HealthPlan {
  id: string;
  userId: string;
  version: number;
  status: 'active' | 'draft' | 'archived';
  title: string;
  overview: string;
  dailyCalories: number;
  waterIntakeMl: number;
  items: PlanItem[];
  safetyConstraints: string[];
  generatedAt: string;
  confirmedAt?: string;
  clinicalReviewStatus: 'approved' | 'pending' | 'flagged';
}

export interface TranscriptEntry {
  speaker: 'coach' | 'user';
  text: string;
  timestamp: number;
}

export interface CallSession {
  id: string;
  roomName: string;
  userId: string;
  type: 'in_app' | 'pstn_outbound';
  status: 'scheduled' | 'initiating' | 'ringing' | 'connected' | 'completed' | 'busy' | 'rejected' | 'failed' | 'unanswered';
  provider: 'gemini' | 'openai';
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  transcript: TranscriptEntry[];
  summary?: string;
  extractedMemoryFacts?: Record<string, any>;
  idempotencyKey?: string;
  attemptNumber: number;
  failureReason?: string;
  sipCallSid?: string;
}

class InMemoryDatabase {
  private users: Map<string, User> = new Map();
  private userMemory: Map<string, Map<string, MemoryFact>> = new Map();
  private plans: Map<string, HealthPlan[]> = new Map(); // userId -> plans
  private callSessions: Map<string, CallSession> = new Map();

  constructor() {
    this.seedSyntheticUsers();
  }

  private seedSyntheticUsers() {
    // 1. Alex - Hinglish speaker, mild knee soreness
    const alex: User = {
      id: 'usr_synthetic_alex',
      name: 'Alex Sharma',
      phone: '+919876543210',
      languagePreference: 'hinglish',
      callingConsent: true,
      consentTimestamp: new Date().toISOString(),
      optedOut: false,
      preferredCallHourIST: 10,
      healthGoals: ['Weight management', 'Cardiovascular endurance'],
      knownConditions: ['patellofemoral_knee_pain', 'sedentary_desk_job'],
      currentEnergyLevel: 'moderate',
    };
    this.users.set(alex.id, alex);

    // Initial memory for Alex
    const alexMem = new Map<string, MemoryFact>();
    alexMem.set('preferred_workout_time', {
      key: 'preferred_workout_time',
      value: 'morning 7 AM',
      confidence: 0.95,
      lastUpdated: new Date().toISOString(),
    });
    alexMem.set('joint_pain', {
      key: 'joint_pain',
      value: 'right knee soreness after high impact jumping',
      confidence: 0.9,
      lastUpdated: new Date().toISOString(),
    });
    this.userMemory.set(alex.id, alexMem);

    // Alex's initial plan
    const alexPlan: HealthPlan = {
      id: 'plan_alex_v1',
      userId: alex.id,
      version: 1,
      status: 'active',
      title: 'Low-Impact Metabolic Foundation',
      overview: 'Joint-friendly functional mobility and steady cardio without high-impact squats.',
      dailyCalories: 2100,
      waterIntakeMl: 3000,
      safetyConstraints: ['No jumping squats', 'No high-impact burpees', 'Low-impact plyometrics only'],
      generatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      confirmedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      clinicalReviewStatus: 'approved',
      items: [
        { id: 'item_1', name: 'Oatmeal & Almond Milk Bowl', category: 'nutrition', timing: '8:30 AM', details: 'With chia seeds and unsweetened protein' },
        { id: 'item_2', name: 'Glute & Quadriceps Isometric Activation', category: 'movement', timing: '9:30 AM', details: '15 mins bodyweight wall sits and glute bridges' },
        { id: 'item_3', name: 'Grilled Paneer Salad', category: 'nutrition', timing: '1:30 PM', details: 'Mixed greens, olive oil, lemon dressing' },
        { id: 'item_4', name: 'Evening Brisk Walk', category: 'movement', timing: '6:30 PM', details: '30 mins low-intensity outdoor walking' },
      ],
    };
    this.plans.set(alex.id, [alexPlan]);

    // 2. Priya - Hindi speaker with hormonal wellness focus
    const priya: User = {
      id: 'usr_synthetic_priya',
      name: 'Priya Patel',
      phone: '+919812345678',
      languagePreference: 'hi',
      callingConsent: true,
      consentTimestamp: new Date().toISOString(),
      optedOut: false,
      preferredCallHourIST: 17,
      healthGoals: ['Hormonal balance', 'Deep sleep restoration'],
      knownConditions: ['pcos_tendency', 'cortisol_evening_spikes'],
      currentEnergyLevel: 'low',
    };
    this.users.set(priya.id, priya);

    // 3. Rahul - English speaker, NO calling consent
    const rahul: User = {
      id: 'usr_synthetic_rahul',
      name: 'Rahul Verma',
      phone: '+919900112233',
      languagePreference: 'en',
      callingConsent: false, // Explicitly no consent for outbound PSTN
      consentTimestamp: new Date().toISOString(),
      optedOut: false,
      preferredCallHourIST: 11,
      healthGoals: ['Muscle hypertrophy'],
      knownConditions: [],
      currentEnergyLevel: 'energized',
    };
    this.users.set(rahul.id, rahul);
  }

  // User queries
  public getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  public getUserByPhone(phone: string): User | undefined {
    for (const u of this.users.values()) {
      if (u.phone === phone) return u;
    }
    return undefined;
  }

  public saveUser(user: User): void {
    this.users.set(user.id, user);
  }

  public setUserConsent(userId: string, consent: boolean): boolean {
    const user = this.users.get(userId);
    if (!user) return false;
    user.callingConsent = consent;
    user.consentTimestamp = new Date().toISOString();
    if (consent) user.optedOut = false;
    this.users.set(userId, user);
    return true;
  }

  public optOutUser(userId: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;
    user.optedOut = true;
    user.callingConsent = false;
    this.users.set(userId, user);
    return true;
  }

  // Memory queries
  public getUserMemory(userId: string): Record<string, any> {
    const facts = this.userMemory.get(userId);
    if (!facts) return {};
    const res: Record<string, any> = {};
    for (const [k, v] of facts.entries()) {
      res[k] = v.value;
    }
    return res;
  }

  public getRawMemoryFacts(userId: string): MemoryFact[] {
    const facts = this.userMemory.get(userId);
    if (!facts) return [];
    return Array.from(facts.values());
  }

  public updateMemoryFact(userId: string, key: string, value: any, confidence = 0.9, sourceCallId?: string): void {
    if (!this.userMemory.has(userId)) {
      this.userMemory.set(userId, new Map());
    }
    const facts = this.userMemory.get(userId)!;
    facts.set(key, {
      key,
      value,
      confidence,
      lastUpdated: new Date().toISOString(),
      sourceCallId,
    });
  }

  // Plans
  public getActivePlan(userId: string): HealthPlan | undefined {
    const userPlans = this.plans.get(userId);
    if (!userPlans) return undefined;
    return userPlans.find((p) => p.status === 'active');
  }

  public getDraftPlan(userId: string): HealthPlan | undefined {
    const userPlans = this.plans.get(userId);
    if (!userPlans) return undefined;
    return userPlans.find((p) => p.status === 'draft');
  }

  public saveDraftPlan(userId: string, plan: Omit<HealthPlan, 'id' | 'userId' | 'version' | 'status' | 'generatedAt' | 'clinicalReviewStatus'>): HealthPlan {
    if (!this.plans.has(userId)) {
      this.plans.set(userId, []);
    }
    const userPlans = this.plans.get(userId)!;
    const currentActive = userPlans.find((p) => p.status === 'active');
    const newVersion = currentActive ? currentActive.version + 1 : 1;

    // Archive any previous draft
    for (const p of userPlans) {
      if (p.status === 'draft') p.status = 'archived';
    }

    const draftPlan: HealthPlan = {
      ...plan,
      id: `plan_${userId}_v${newVersion}_draft`,
      userId,
      version: newVersion,
      status: 'draft',
      generatedAt: new Date().toISOString(),
      clinicalReviewStatus: 'approved',
    };
    userPlans.push(draftPlan);
    return draftPlan;
  }

  public confirmPlan(userId: string, planId: string): HealthPlan | undefined {
    const userPlans = this.plans.get(userId);
    if (!userPlans) return undefined;

    const draft = userPlans.find((p) => p.id === planId && p.status === 'draft');
    if (!draft) return undefined;

    // Mark current active as archived
    for (const p of userPlans) {
      if (p.status === 'active') p.status = 'archived';
    }

    draft.status = 'active';
    draft.confirmedAt = new Date().toISOString();
    return draft;
  }

  // Calls
  public createCallSession(session: CallSession): void {
    this.callSessions.set(session.id, session);
  }

  public getCallSession(id: string): CallSession | undefined {
    return this.callSessions.get(id);
  }

  public getCallSessionByRoom(roomName: string): CallSession | undefined {
    for (const s of this.callSessions.values()) {
      if (s.roomName === roomName) return s;
    }
    return undefined;
  }

  public updateCallSession(id: string, updates: Partial<CallSession>): CallSession | undefined {
    const s = this.callSessions.get(id);
    if (!s) return undefined;
    const updated = { ...s, ...updates };
    this.callSessions.set(id, updated);
    return updated;
  }

  public appendTranscript(id: string, speaker: 'coach' | 'user', text: string): void {
    const s = this.callSessions.get(id);
    if (!s) return;
    s.transcript.push({
      speaker,
      text,
      timestamp: Date.now(),
    });
  }

  public getActiveCallsCount(): number {
    let count = 0;
    for (const s of this.callSessions.values()) {
      if (s.status === 'initiating' || s.status === 'ringing' || s.status === 'connected') {
        count++;
      }
    }
    return count;
  }

  public getUserCallsToday(userId: string): number {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    let count = 0;
    for (const s of this.callSessions.values()) {
      if (s.userId === userId && s.startedAt && s.startedAt.startsWith(todayStr)) {
        count++;
      }
    }
    return count;
  }

  public findCallByIdempotencyKey(key: string): CallSession | undefined {
    for (const s of this.callSessions.values()) {
      if (s.idempotencyKey === key) return s;
    }
    return undefined;
  }
}

export const db = new InMemoryDatabase();

