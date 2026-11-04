"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthHistoryService = void 0;
const healthMemoryStore_js_1 = require("../db/healthMemoryStore.js");
class HealthHistoryService {
    /**
     * Adds or updates a medical condition with strict verification status.
     * Never promotes unverified symptoms to confirmed medical diagnoses without clinical source.
     */
    static recordCondition(params) {
        const { userId, conditionName, category, verificationStatus = 'user_reported', source = 'user_intake', clinicalNotes } = params;
        const condition = {
            id: `hc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            userId,
            conditionName,
            category,
            verificationStatus,
            dateReported: new Date().toISOString(),
            clinicalNotes,
            source,
            confidence: verificationStatus === 'clinician_verified' ? 1.0 : 0.9,
            active: true,
        };
        const conditions = healthMemoryStore_js_1.healthMemoryStore.healthConditions.get(userId) || [];
        healthMemoryStore_js_1.healthMemoryStore.healthConditions.set(userId, [...conditions, condition]);
        healthMemoryStore_js_1.healthMemoryStore.logAudit({
            userId,
            actor: 'user',
            action: 'create',
            targetEntity: 'health_conditions',
            targetEntityId: condition.id,
            details: { conditionName, verificationStatus },
        });
        return condition;
    }
    /**
     * Logs physical measurements without overwriting historical records.
     */
    static recordMeasurement(params) {
        const { userId, measurementType, value, unit, source = 'user_entered', notes } = params;
        const measurement = {
            id: `meas_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            userId,
            measurementType,
            value,
            unit,
            measuredDate: new Date().toISOString(),
            source,
            verificationStatus: 'user_reported',
            notes,
        };
        const list = healthMemoryStore_js_1.healthMemoryStore.healthMeasurements.get(userId) || [];
        healthMemoryStore_js_1.healthMemoryStore.healthMeasurements.set(userId, [...list, measurement]);
        return measurement;
    }
    /**
     * Calculates BMI from latest height and weight records.
     */
    static calculateLatestBMI(userId) {
        const profile = healthMemoryStore_js_1.healthMemoryStore.profiles.get(userId);
        const measurements = healthMemoryStore_js_1.healthMemoryStore.healthMeasurements.get(userId) || [];
        const latestWeight = [...measurements]
            .filter((m) => m.measurementType === 'weight_kg')
            .sort((a, b) => new Date(b.measuredDate).getTime() - new Date(a.measuredDate).getTime())[0];
        const heightCm = profile?.heightCm || 175;
        if (!latestWeight)
            return null;
        const heightM = heightCm / 100;
        const bmi = Math.round((latestWeight.value / (heightM * heightM)) * 10) / 10;
        let category = 'Normal';
        if (bmi < 18.5)
            category = 'Underweight';
        else if (bmi >= 25 && bmi < 29.9)
            category = 'Overweight';
        else if (bmi >= 30)
            category = 'Obese';
        return { bmi, category };
    }
    /**
     * Logs a symptom observation without turning it into an unverified diagnosis.
     */
    static recordSymptom(params) {
        const { userId, symptomName, severity, location, contextNotes, sessionId } = params;
        const obs = {
            id: `symp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            userId,
            symptomName,
            severity,
            location,
            observedDate: new Date().toISOString(),
            contextNotes,
            verificationStatus: 'user_reported',
            sourceSessionId: sessionId,
        };
        const list = healthMemoryStore_js_1.healthMemoryStore.symptomObservations.get(userId) || [];
        healthMemoryStore_js_1.healthMemoryStore.symptomObservations.set(userId, [...list, obs]);
        return obs;
    }
}
exports.HealthHistoryService = HealthHistoryService;
