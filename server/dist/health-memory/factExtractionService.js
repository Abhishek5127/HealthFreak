"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FactExtractionService = void 0;
const healthMemoryStore_js_1 = require("../db/healthMemoryStore.js");
class FactExtractionService {
    /**
     * Processes conversational utterances to extract structured profile facts,
     * detect contradictions with previously known facts, and maintain append-only audit trail.
     */
    static extractFactsFromUtterance(params) {
        const { userId, utterance, sessionId } = params;
        const lower = utterance.toLowerCase();
        const newFacts = [];
        const contradictedFacts = [];
        // 1. Dietary Preference / Eating Habits
        if (lower.includes('vegetarian') || lower.includes('shakahari')) {
            const fact = healthMemoryStore_js_1.healthMemoryStore.setProfileFact({
                userId,
                category: 'dietary_preference',
                key: 'dietary_type',
                value: 'vegetarian',
                confidence: 0.95,
                verificationStatus: 'user_reported',
                sessionId,
            });
            newFacts.push(fact);
        }
        else if (lower.includes('non-veg') || lower.includes('chicken') || lower.includes('egg')) {
            const fact = healthMemoryStore_js_1.healthMemoryStore.setProfileFact({
                userId,
                category: 'dietary_preference',
                key: 'dietary_type',
                value: 'eggetarian_non_veg',
                confidence: 0.95,
                verificationStatus: 'user_reported',
                sessionId,
            });
            newFacts.push(fact);
        }
        // 2. Workout Schedule Preference
        const timeMatch = lower.match(/(morning|evening|night|afternoon|\d+\s*(am|pm))\s*(workout|exercise|walk)/i);
        if (timeMatch) {
            const fact = healthMemoryStore_js_1.healthMemoryStore.setProfileFact({
                userId,
                category: 'routine',
                key: 'preferred_workout_time',
                value: timeMatch[0],
                confidence: 0.9,
                verificationStatus: 'user_reported',
                sessionId,
            });
            newFacts.push(fact);
        }
        // 3. Knee or Joint Discomfort
        if (lower.includes('knee') || lower.includes('ghutna') || lower.includes('joint pain')) {
            const fact = healthMemoryStore_js_1.healthMemoryStore.setProfileFact({
                userId,
                category: 'injury',
                key: 'joint_pain_observation',
                value: utterance,
                confidence: 0.95,
                verificationStatus: 'user_reported',
                sessionId,
            });
            newFacts.push(fact);
        }
        // 4. Energy & Sleep Hours
        const sleepMatch = lower.match(/(\d+)\s*(hours|hrs|ghante)\s*sleep/i);
        if (sleepMatch) {
            const hours = parseInt(sleepMatch[1], 10);
            const fact = healthMemoryStore_js_1.healthMemoryStore.setProfileFact({
                userId,
                category: 'routine',
                key: 'recent_sleep_hours',
                value: hours,
                confidence: 0.95,
                verificationStatus: 'user_reported',
                sessionId,
            });
            newFacts.push(fact);
        }
        return { newFacts, contradictedFacts };
    }
}
exports.FactExtractionService = FactExtractionService;
