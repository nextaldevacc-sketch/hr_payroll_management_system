import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';
import { REGISTERED_JOBS, executeJob } from '../jobs/scheduler.js';
import auditService from '../services/auditService.js';

const router = Router();

router.use(authenticate, requireRole('COMPANY_ADMIN'));

/**
 * GET /api/v1/jobs
 * List available system background jobs
 */
router.get('/', (req, res) => {
  const jobs = Object.values(REGISTERED_JOBS).map((j) => ({
    name: j.name,
    description: j.description,
    cronExpression: j.cronExpression,
  }));
  res.json({ status: 'success', data: jobs });
});

/**
 * POST /api/v1/jobs/:name/run
 * Trigger a scheduled background job manually (Admin only, logged)
 */
router.post('/:name/run', async (req, res, next) => {
  try {
    const jobName = req.params.name;
    const userId = req.user?.userId || req.user?.id;
    const companyId = req.companyId;

    const result = await executeJob(jobName, userId);

    await auditService.log({
      companyId,
      userId,
      action: 'RUN_JOB',
      tableName: 'system_jobs',
      recordId: companyId,
      newValues: { jobName, result: result.result, durationMs: result.durationMs },
    });

    res.json({
      status: 'success',
      message: `Job '${jobName}' executed successfully`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

