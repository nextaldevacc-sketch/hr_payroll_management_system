import { complianceService } from '../services/complianceService.js';

/**
 * Nightly compliance job (Asia/Dubai time)
 * Evaluates document status: Valid, Expiring Soon, Expired, Missing Data
 * Dispatches milestone reminders at 90, 60, 30 days to owner and HR.
 * Idempotent: each milestone is sent once.
 */
export async function runComplianceJob(referenceDate = new Date()) {
  return await complianceService.runComplianceJob({ referenceDate });
}

export const runNightlyExpiryJob = runComplianceJob;

export default {
  runComplianceJob,
  runNightlyExpiryJob,
};

