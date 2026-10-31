import { healthMemoryStore } from '../db/healthMemoryStore.js';
import {
  HealthConditionEntity,
  AllergyEntity,
  MedicationEntity,
  SupplementEntity,
  HealthMeasurementEntity,
  SymptomObservationEntity,
  VerificationStatus,
} from '../types/healthMemory.js';

export class HealthHistoryService {
  /**
   * Adds or updates a medical condition with strict verification status.
   * Never promotes unverified symptoms to confirmed medical diagnoses without clinical source.
   */
  public static recordCondition(params: {
    userId: string;
    conditionName: string;
    category: HealthConditionEntity['category'];
    verificationStatus?: VerificationStatus;
    source?: HealthConditionEntity['source'];
    clinicalNotes?: string;
  }): HealthConditionEntity {
    const { userId, conditionName, category, verificationStatus = 'user_reported', source = 'user_intake', clinicalNotes } = params;

    const condition: HealthConditionEntity = {
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

    const conditions = healthMemoryStore.healthConditions.get(userId) || [];
    healthMemoryStore.healthConditions.set(userId, [...conditions, condition]);

    healthMemoryStore.logAudit({
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
  public static recordMeasurement(params: {
    userId: string;
    measurementType: HealthMeasurementEntity['measurementType'];
    value: number;
    unit: string;
    source?: 'user_entered' | 'smart_scale' | 'clinic_report';
    notes?: string;
  }): HealthMeasurementEntity {
    const { userId, measurementType, value, unit, source = 'user_entered', notes } = params;

    const measurement: HealthMeasurementEntity = {
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

    const list = healthMemoryStore.healthMeasurements.get(userId) || [];
    healthMemoryStore.healthMeasurements.set(userId, [...list, measurement]);

    return measurement;
  }

  /**
   * Calculates BMI from latest height and weight records.
   */
  public static calculateLatestBMI(userId: string): { bmi: number; category: string } | null {
    const profile = healthMemoryStore.profiles.get(userId);
    const measurements = healthMemoryStore.healthMeasurements.get(userId) || [];

    const latestWeight = [...measurements]
      .filter((m) => m.measurementType === 'weight_kg')
      .sort((a, b) => new Date(b.measuredDate).getTime() - new Date(a.measuredDate).getTime())[0];

    const heightCm = profile?.heightCm || 175;
    if (!latestWeight) return null;

    const heightM = heightCm / 100;
    const bmi = Math.round((latestWeight.value / (heightM * heightM)) * 10) / 10;

    let category = 'Normal';
    if (bmi < 18.5) category = 'Underweight';
    else if (bmi >= 25 && bmi < 29.9) category = 'Overweight';
    else if (bmi >= 30) category = 'Obese';

    return { bmi, category };
  }

  /**
   * Logs a symptom observation without turning it into an unverified diagnosis.
   */
  public static recordSymptom(params: {
    userId: string;
    symptomName: string;
    severity: number;
    location?: string;
    contextNotes?: string;
    sessionId?: string;
  }): SymptomObservationEntity {
    const { userId, symptomName, severity, location, contextNotes, sessionId } = params;

    const obs: SymptomObservationEntity = {
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

    const list = healthMemoryStore.symptomObservations.get(userId) || [];
    healthMemoryStore.symptomObservations.set(userId, [...list, obs]);

    return obs;
  }
}
