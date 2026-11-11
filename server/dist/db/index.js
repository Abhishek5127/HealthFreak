"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
class InMemoryDatabase {
    users = new Map();
    userMemory = new Map();
    plans = new Map(); // userId -> plans
    callSessions = new Map();
    constructor() {
        // Database starts clean - real users only
    }
    seedSyntheticUsers() {
        // Clean initial state
    }
    // User queries
    getUser(id) {
        return this.users.get(id);
    }
    getUserByPhone(phone) {
        for (const u of this.users.values()) {
            if (u.phone === phone)
                return u;
        }
        return undefined;
    }
    saveUser(user) {
        this.users.set(user.id, user);
    }
    setUserConsent(userId, consent) {
        const user = this.users.get(userId);
        if (!user)
            return false;
        user.callingConsent = consent;
        user.consentTimestamp = new Date().toISOString();
        if (consent)
            user.optedOut = false;
        this.users.set(userId, user);
        return true;
    }
    optOutUser(userId) {
        const user = this.users.get(userId);
        if (!user)
            return false;
        user.optedOut = true;
        user.callingConsent = false;
        this.users.set(userId, user);
        return true;
    }
    // Memory queries
    getUserMemory(userId) {
        const facts = this.userMemory.get(userId);
        if (!facts)
            return {};
        const res = {};
        for (const [k, v] of facts.entries()) {
            res[k] = v.value;
        }
        return res;
    }
    getRawMemoryFacts(userId) {
        const facts = this.userMemory.get(userId);
        if (!facts)
            return [];
        return Array.from(facts.values());
    }
    updateMemoryFact(userId, key, value, confidence = 0.9, sourceCallId) {
        if (!this.userMemory.has(userId)) {
            this.userMemory.set(userId, new Map());
        }
        const facts = this.userMemory.get(userId);
        facts.set(key, {
            key,
            value,
            confidence,
            lastUpdated: new Date().toISOString(),
            sourceCallId,
        });
    }
    // Plans
    getActivePlan(userId) {
        const userPlans = this.plans.get(userId);
        if (!userPlans)
            return undefined;
        return userPlans.find((p) => p.status === 'active');
    }
    getDraftPlan(userId) {
        const userPlans = this.plans.get(userId);
        if (!userPlans)
            return undefined;
        return userPlans.find((p) => p.status === 'draft');
    }
    saveDraftPlan(userId, plan) {
        if (!this.plans.has(userId)) {
            this.plans.set(userId, []);
        }
        const userPlans = this.plans.get(userId);
        const currentActive = userPlans.find((p) => p.status === 'active');
        const newVersion = currentActive ? currentActive.version + 1 : 1;
        // Archive any previous draft
        for (const p of userPlans) {
            if (p.status === 'draft')
                p.status = 'archived';
        }
        const draftPlan = {
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
    confirmPlan(userId, planId) {
        const userPlans = this.plans.get(userId);
        if (!userPlans)
            return undefined;
        const draft = userPlans.find((p) => p.id === planId && p.status === 'draft');
        if (!draft)
            return undefined;
        // Mark current active as archived
        for (const p of userPlans) {
            if (p.status === 'active')
                p.status = 'archived';
        }
        draft.status = 'active';
        draft.confirmedAt = new Date().toISOString();
        return draft;
    }
    // Calls
    createCallSession(session) {
        this.callSessions.set(session.id, session);
    }
    getCallSession(id) {
        return this.callSessions.get(id);
    }
    getCallSessionByRoom(roomName) {
        for (const s of this.callSessions.values()) {
            if (s.roomName === roomName)
                return s;
        }
        return undefined;
    }
    updateCallSession(id, updates) {
        const s = this.callSessions.get(id);
        if (!s)
            return undefined;
        const updated = { ...s, ...updates };
        this.callSessions.set(id, updated);
        return updated;
    }
    appendTranscript(id, speaker, text) {
        const s = this.callSessions.get(id);
        if (!s)
            return;
        s.transcript.push({
            speaker,
            text,
            timestamp: Date.now(),
        });
    }
    getActiveCallsCount() {
        let count = 0;
        for (const s of this.callSessions.values()) {
            if (s.status === 'initiating' || s.status === 'ringing' || s.status === 'connected') {
                count++;
            }
        }
        return count;
    }
    getUserCallsToday(userId) {
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
    findCallByIdempotencyKey(key) {
        for (const s of this.callSessions.values()) {
            if (s.idempotencyKey === key)
                return s;
        }
        return undefined;
    }
}
exports.db = new InMemoryDatabase();
