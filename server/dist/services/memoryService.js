"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryService = void 0;
const index_js_1 = require("../db/index.js");
const healthMemoryStore_js_1 = require("../db/healthMemoryStore.js");
class MemoryService {
    /**
     * Retrieves full context for an agent session: user info, memory facts, active plan.
     * Completely isolated per userId.
     */
    static getSessionContext(userId) {
        const user = index_js_1.db.getUser(userId);
        if (!user)
            return null;
        const memoryFacts = index_js_1.db.getUserMemory(userId);
        const activePlan = index_js_1.db.getActivePlan(userId);
        return {
            userId: user.id,
            name: user.name,
            languagePreference: user.languagePreference,
            healthGoals: user.healthGoals,
            knownConditions: user.knownConditions,
            currentEnergyLevel: user.currentEnergyLevel,
            memoryFacts,
            activePlan: activePlan
                ? {
                    id: activePlan.id,
                    title: activePlan.title,
                    overview: activePlan.overview,
                    items: activePlan.items,
                    safetyConstraints: activePlan.safetyConstraints,
                }
                : null,
        };
    }
    /**
     * Progressive memory extraction during or after a call.
     * Extracts relevant health & lifestyle parameters without cross-user leakage.
     */
    static processSessionTranscript(callId) {
        const session = index_js_1.db.getCallSession(callId);
        if (!session) {
            return { summary: '', extractedFacts: {} };
        }
        const transcript = session.transcript || [];
        const extractedFacts = {};
        // Analyze user messages for health preferences, symptoms, routine adherence
        const userUtterances = transcript
            .filter((t) => t.speaker === 'user')
            .map((t) => t.text.toLowerCase());
        for (const text of userUtterances) {
            // Knee / joint pain check
            if (text.includes('knee') || text.includes('joint') || text.includes('pain') || text.includes('dard')) {
                extractedFacts['symptom_knee_discomfort'] = 'Reported knee pain or soreness during movement';
                index_js_1.db.updateMemoryFact(session.userId, 'symptom_knee_discomfort', 'Reported knee pain or soreness during movement', 0.95, callId);
                healthMemoryStore_js_1.healthMemoryStore.setProfileFact({
                    userId: session.userId,
                    category: 'injury',
                    key: 'symptom_knee_discomfort',
                    value: 'Reported knee pain or soreness during movement',
                    confidence: 0.95,
                    verificationStatus: 'user_reported',
                    sessionId: callId,
                });
            }
            // Energy check
            if (text.includes('tired') || text.includes('fatigue') || text.includes('exhausted') || text.includes('thaka') || text.includes('thaki')) {
                extractedFacts['energy_status'] = 'Low energy / fatigued';
                index_js_1.db.updateMemoryFact(session.userId, 'energy_status', 'Low energy / fatigued', 0.9, callId);
            }
            else if (text.includes('energetic') || text.includes('good') || text.includes('great') || text.includes('fresh')) {
                extractedFacts['energy_status'] = 'High / energized';
                index_js_1.db.updateMemoryFact(session.userId, 'energy_status', 'High / energized', 0.9, callId);
            }
            // Sleep check
            const sleepMatch = text.match(/(\d+)\s*(hours|hrs|ghante)/);
            if (sleepMatch) {
                const hours = parseInt(sleepMatch[1], 10);
                extractedFacts['recent_sleep_hours'] = hours;
                index_js_1.db.updateMemoryFact(session.userId, 'recent_sleep_hours', hours, 0.95, callId);
                healthMemoryStore_js_1.healthMemoryStore.setProfileFact({
                    userId: session.userId,
                    category: 'routine',
                    key: 'recent_sleep_hours',
                    value: hours,
                    confidence: 0.95,
                    verificationStatus: 'user_reported',
                    sessionId: callId,
                });
            }
            // Diet adherence check
            if (text.includes('skip') && (text.includes('breakfast') || text.includes('meal') || text.includes('lunch') || text.includes('dinner'))) {
                extractedFacts['nutrition_adherence'] = 'Skipped a meal';
                index_js_1.db.updateMemoryFact(session.userId, 'nutrition_adherence', 'Skipped a scheduled meal', 0.85, callId);
            }
        }
        // Generate concise summary
        let summary = `Call with user ${session.userId} completed.`;
        if (transcript.length === 0) {
            summary = `Call was disconnected before conversation occurred.`;
        }
        else {
            const summaryParts = [];
            if (extractedFacts['energy_status'])
                summaryParts.push(`User energy: ${extractedFacts['energy_status']}`);
            if (extractedFacts['symptom_knee_discomfort'])
                summaryParts.push(`Reported knee/joint discomfort`);
            if (extractedFacts['recent_sleep_hours'])
                summaryParts.push(`Sleep logged: ${extractedFacts['recent_sleep_hours']} hours`);
            if (summaryParts.length > 0) {
                summary = `Disha Health Coaching Check-in: ${summaryParts.join('. ')}.`;
            }
            else {
                summary = `Disha Health Coaching Check-in: General routine review completed successfully.`;
            }
        }
        // Save to call session
        index_js_1.db.updateCallSession(callId, {
            summary,
            extractedMemoryFacts: extractedFacts,
        });
        return { summary, extractedFacts };
    }
}
exports.MemoryService = MemoryService;
