import { runComplianceJob } from './complianceJob.js';

export { runComplianceJob };
export const runNightlyExpiryJob = runComplianceJob;

export default {
  runNightlyExpiryJob,
  runComplianceJob,
};
