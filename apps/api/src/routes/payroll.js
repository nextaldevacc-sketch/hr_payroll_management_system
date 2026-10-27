import { Router } from 'express';
import prisma from '../prisma/client.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';

const router = Router();

router.use(authenticate);

/**
 * GET /api/v1/payroll/overview
 * Protected by Section 5.3 salary permission:
 * Visible to Payroll Officer, HR Manager, GM, Finance, Company Admin.
 * Blocked (403) for Employee, Dept Manager, HR Officer.
 */
router.get(
  '/overview',
  requirePermission('salary', 'view'),
  async (req, res, next) => {
    try {
      const companyId = req.companyId;

      const payRuns = await prisma.$base().pay_runs.findMany({
        where: { company_id: companyId },
        include: {
          company_visa: { select: { id: true, name: true } },
          _count: { select: { payslips: true } },
        },
        orderBy: { period_month: 'desc' },
      });

      res.json({
        status: 'success',
        count: payRuns.length,
        data: payRuns,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/payroll/runs/:id/approve
 * Requires 'pay_runs' -> 'approve' permission (GM or Company Admin only)
 * Blocked (403) for Dept Manager, HR Officer, etc.
 */
router.post(
  '/runs/:id/approve',
  requirePermission('pay_runs', 'approve'),
  async (req, res, next) => {
    try {
      res.json({
        status: 'success',
        message: 'Pay run approved by authorized executive',
        runId: req.params.id,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
