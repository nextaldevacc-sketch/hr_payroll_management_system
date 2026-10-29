import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import dashboardController from '../controllers/dashboardController.js';

const router = Router();
router.use(authenticate);

// Non-salary overview tiles (Headcount, Approvals, WPS readiness, Attendance, Overtime, Docs)
router.get('/overview', dashboardController.getOverview);

// Salary-specific tiles (Live Payroll, Trend, Department Cost, Liabilities, Variances) -> 403 for non-salary roles
router.get('/salary', requirePermission('salary', 'view'), dashboardController.getSalary);

export default router;

