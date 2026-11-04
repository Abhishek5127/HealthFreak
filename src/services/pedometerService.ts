/**
 * HealthFreak Unified Pedometer Service
 *
 * Re-exports the unified master implementation from features/activity/services/pedometerService.
 * Single source of truth across the application with zero duplicated code.
 */

export {
  pedometerService,
  PedometerService,
  StepUpdateListener as PedometerListener,
} from '../features/activity/services/pedometerService';

export type {
  PedometerState,
  StepSummary,
  PedometerPermissionState,
} from '../features/activity/types/pedometer.types';
