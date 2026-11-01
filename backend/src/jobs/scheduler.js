import cron from 'node-cron';
import prisma from '../lib/prisma.js';
import auditService from '../services/auditService.js';
import { runComplianceJob } from './complianceJob.js';
import { runDeactivationJob } from './deactivationJob.js';
import { runMonthlyAccrualJob } from './accruals.js';

const TIMEZONE = 'Asia/Dubai';

export const REGISTERED_JOBS = {
  expiry: {
    name: 'expiry',
    description: 'Document expiry status & 90/60/30 reminders (FR-CO2-CO4)',
    cronExpression: '0 1 * * *', // 01:00 daily
    runner: async () => await runComplianceJob(),
  },
  deactivation: {
    name: 'deactivation',
    description: 'Archive leavers, deactivate logins & open cancellation tasks (FR-OF6-OF7)',
    cronExpression: '30 1 * * *', // 01:30 daily
    runner: async () => await runDeactivationJob(),
  },
  accrual: {
    name: 'accrual',
    description: 'Monthly leave accrual calculations (FR-TO5)',
    cronExpression: '0 2 1 * *', // 02:00 on the 1st of each month
    runner: async () => await runMonthlyAccrualJob(),
  },
};

export async function executeJob(jobKey, triggeredBy = 'CRON') {
  const jobDef = REGISTERED_JOBS[jobKey];
  if (!jobDef) {
    const err = new Error(`Unknown job: '${jobKey}'. Available jobs: ${Object.keys(REGISTERED_JOBS).join(', ')}`);
    err.status = 404;
    err.code = 'JOB_NOT_FOUND';
    throw err;
  }

  const startTime = new Date();
  console.log(`[Scheduler] [${startTime.toISOString()}] Starting job '${jobDef.name}' (Trigger: ${triggeredBy})...`);

  try {
    const result = await jobDef.runner();
    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();
    console.log(`[Scheduler] [${endTime.toISOString()}] Completed job '${jobDef.name}' in ${durationMs}ms`);

    // Write audit log entry for this job run
    // Log for active companies
    const activeCompanies = await prisma.$base().companies.findMany({
      where: { status: 'Active' },
      select: { id: true },
    });

    for (const comp of activeCompanies) {
      await auditService.log({
        companyId: comp.id,
        userId: triggeredBy === 'CRON' ? null : triggeredBy,
        action: `JOB_RUN_${jobDef.name.toUpperCase()}`,
        tableName: 'system_jobs',
        recordId: null,
        newValues: {
          jobName: jobDef.name,
          triggeredBy,
          durationMs,
          status: 'SUCCESS',
          result: typeof result === 'object' ? result : { output: String(result) },
        },
      }).catch(() => {});
    }

    return {
      success: true,
      job: jobDef.name,
      durationMs,
      result,
    };
  } catch (err) {
    console.error(`[Scheduler] Job '${jobDef.name}' failed:`, err.message);
    throw err;
  }
}

let scheduledTasks = [];

export function startScheduler() {
  const isEnabled = process.env.ENABLE_JOBS !== 'false';
  if (!isEnabled) {
    console.log('[Scheduler] Background jobs are disabled (ENABLE_JOBS=false)');
    return [];
  }

  console.log(`[Scheduler] Initializing scheduled cron jobs (Timezone: ${TIMEZONE})...`);
  stopScheduler(); // Clear any existing

  for (const [key, jobDef] of Object.entries(REGISTERED_JOBS)) {
    const task = cron.schedule(
      jobDef.cronExpression,
      async () => {
        try {
          await executeJob(key, 'CRON');
        } catch (err) {
          console.error(`[Scheduler] Cron execution failed for ${key}:`, err.message);
        }
      },
      {
        timezone: TIMEZONE,
      }
    );

    scheduledTasks.push(task);
    console.log(`[Scheduler] Scheduled '${jobDef.name}' (${jobDef.cronExpression} ${TIMEZONE})`);
  }

  return scheduledTasks;
}

export function stopScheduler() {
  for (const task of scheduledTasks) {
    task.stop();
  }
  scheduledTasks = [];
}

export default {
  REGISTERED_JOBS,
  executeJob,
  startScheduler,
  stopScheduler,
};

