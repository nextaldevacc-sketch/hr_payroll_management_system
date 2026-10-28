import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import payrollController from '../controllers/payrollController.js';

const router = Router();

router.use(authenticate);

router.get('/overview', requirePermission('salary', 'view'), payrollController.getPayrollOverview);
router.post('/runs/:id/approve', requirePermission('pay_runs', 'approve'), payrollController.approvePayRun);

export default router;
