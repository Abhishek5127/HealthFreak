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
  provider: 'sarvam' | 'gemini' | 'openai';
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
    // Database starts clean - real users only
  }

  private seedSyntheticUsers() {
    // Clean initial state
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

