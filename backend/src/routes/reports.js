import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import reportController from '../controllers/reportController.js';

const router = Router();
router.use(authenticate);

// Non-salary reports (HR Officer, HR Manager, GM, Company Admin)
router.get('/attendance', requirePermission('employees', 'view'), reportController.downloadAttendanceReport);
router.get('/leave', requirePermission('employees', 'view'), reportController.downloadLeaveReport);
router.get('/headcount', requirePermission('employees', 'view'), reportController.getHeadcountData);
router.get('/headcount/download', requirePermission('employees', 'view'), reportController.downloadHeadcountReport);

// Salary-containing reports (Payroll Officer, HR Manager, GM, Finance, Company Admin only)
router.get('/accounting-export', requirePermission('salary', 'view'), reportController.downloadAccountingExport);
router.get('/gratuity-provision', requirePermission('salary', 'view'), reportController.downloadGratuityProvision);
router.get('/leave-liability', requirePermission('salary', 'view'), reportController.downloadLeaveLiability);
router.get('/payroll-register', requirePermission('salary', 'view'), reportController.downloadPayrollRegister);
router.get('/variance', requirePermission('salary', 'view'), reportController.downloadVarianceReport);

export default router;

