import cron from 'node-cron';
import prisma from '../lib/prisma.js';
import auditService from '../services/auditService.js';
import { runComplianceJob } from './complianceJob.js';
import { runDeactivationJob } from './deactivationJob.js';
import { runMonthlyAccrualJob } from './accruals.js';
import { runStorageCleanupJob } from './storageCleanupJob.js';
import mailer from '../lib/mailer.js';

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
  branch_change: {
    name: 'branch_change',
    description: 'Apply approved branch changes reaching effective date (Workflow V8)',
    cronExpression: '30 1 * * *', // 01:30 daily
    runner: async () => await applyPendingBranchChanges(),
  },
  email_outbox: {
    name: 'email_outbox',
    description: 'Process queued & retryable email outbox items with backoff (E1)',
    cronExpression: '*/5 * * * *', // every 5 minutes
    runner: async () => await mailer.processOutboxBatch(),
  },
  storage_cleanup: {
    name: 'storage_cleanup',
    description: 'Clean unreferenced document files (>24h) and stale tmp-batches (>2h)',
    cronExpression: '0 3 * * *', // 03:00 daily
    runner: async () => await runStorageCleanupJob(),
  },
};

export async function applyPendingBranchChanges(asOfDate = new Date()) {
  const todayStr = (asOfDate instanceof Date ? asOfDate : new Date(asOfDate)).toISOString().slice(0, 10);
  const pendingRequests = await prisma.$base().approval_requests.findMany({
    where: {
      request_type: 'EMPLOYEE_BRANCH_CHANGE',
      status: 'Approved',
    },
  });

  const applied = [];
  for (const req of pendingRequests) {
    let payload = req.payload;
    if (!payload && req.comment) {
      try { payload = JSON.parse(req.comment); } catch {}
    }
    if (!payload || payload.applied === true) continue;

    const effDateStr = String(payload.effective_date).slice(0, 10);
    if (effDateStr <= todayStr) {
      await prisma.$base().$transaction(async (tx) => {
        const emp = await tx.employees.findUnique({
          where: { id: req.record_id },
        });
        if (!emp) return;

        const targetBranch = await tx.branches.findUnique({
          where: { id: payload.target_branch_id },
        });
        if (!targetBranch || targetBranch.company_visa_id !== emp.company_visa_id) {
          console.warn(`[BranchChangeJob] Target branch visa mismatch for request ${req.id}`);
          return;
        }

        await tx.employees.update({
          where: { id: emp.id },
          data: { branch_id: targetBranch.id },
        });

        const updatedPayload = {
          ...payload,
          applied: true,
          applied_at: new Date().toISOString(),
        };

        await tx.approval_requests.update({
          where: { id: req.id },
          data: { payload: updatedPayload },
        });

        await auditService.log({
          companyId: req.company_id,
          userId: req.requested_by,
          action: 'UPDATE',
          tableName: 'employees',
          recordId: emp.id,
          oldValues: { branch_id: emp.branch_id },
          newValues: {
            branch_id: targetBranch.id,
            effective_date: effDateStr,
            reason: payload.reason,
            applied_by: 'SCHEDULER_BRANCH_CHANGE_JOB',
          },
          tx,
        });

        applied.push({ requestId: req.id, employeeId: emp.id, newBranchId: targetBranch.id });
      });
    }
  }

  return { processed: pendingRequests.length, applied: applied.length, details: applied };
}

export async function executeJob(jobKey, triggeredBy = 'CRON') {
  const jobDef = REGISTERED_JOBS[jobKey];
  if (!jobDef) {
    const err = new Error(`Unknown job: '${jobKey}'. Available jobs: ${Object.keys(REGISTERED_JOBS).join(', ')}`);
    err.status = 404;
    err.code = 'JOB_NOT_FOUND';
    throw err;
  }

  // Acquire PostgreSQL advisory lock to prevent concurrent runs across cluster instances
  const lockKey = `job:${jobKey}`;
  let lockAcquired = false;
  try {
    const lockResult = await prisma.$base().$queryRawUnsafe(
      'SELECT pg_try_advisory_lock(hashtext($1)) as acquired',
      lockKey
    );
    lockAcquired = lockResult?.[0]?.acquired === true;
  } catch (lockErr) {
    console.warn(`[Scheduler] Advisory lock check failed for '${jobDef.name}', proceeding with execution:`, lockErr.message);
    lockAcquired = true; // Fallback if test DB or non-PostgreSQL environment
  }

  if (!lockAcquired) {
    console.log(`[Scheduler] Job '${jobDef.name}' is already running on another instance. Skipping.`);
    return {
      success: true,
      job: jobDef.name,
      skipped: true,
      reason: 'LOCKED_BY_ANOTHER_INSTANCE',
    };
  }

  const startTime = new Date();
  console.log(`[Scheduler] [${startTime.toISOString()}] Starting job '${jobDef.name}' (Trigger: ${triggeredBy})...`);

  try {
    const result = await jobDef.runner();
    if (result && result.pendingMigrations) {
      return { success: true, job: jobDef.name, pendingMigrations: true };
    }
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
        recordId: comp.id,
        newValues: {
          jobName: jobDef.name,
          triggeredBy,
          durationMs,
          status: 'SUCCESS',
          result: typeof result === 'object' ? result : { output: String(result) },
        },
      }).catch((err) => console.warn(`[Scheduler] Failed to log audit for job ${jobDef.name}:`, err.message));
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
  } finally {
    try {
      await prisma.$base().$queryRawUnsafe(
        'SELECT pg_advisory_unlock(hashtext($1)) as unlocked',
        lockKey
      );
    } catch (unlockErr) {
      console.warn(`[Scheduler] Failed to release advisory lock for '${jobDef.name}':`, unlockErr.message);
    }
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

