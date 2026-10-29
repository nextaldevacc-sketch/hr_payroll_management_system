import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import payrollController from '../controllers/payrollController.js';
import salaryAdjustmentController from '../controllers/salaryAdjustmentController.js';

const router = Router();

router.use(authenticate);

router.get('/overview', requirePermission('salary', 'view'), payrollController.getPayrollOverview);

// ==========================================
// Pay Runs Lifecycle
// ==========================================
router.get('/runs', requirePermission('pay_runs', 'view'), payrollController.listPayRuns);
router.post('/runs', requirePermission('pay_runs', 'prepare'), payrollController.createPayRun);
router.get('/runs/:id', requirePermission('pay_runs', 'view'), payrollController.getPayRun);
router.get('/runs/:id/payslips', requirePermission('pay_runs', 'view'), payrollController.listPayRunPayslips);
router.get('/runs/:id/issues', requirePermission('pay_runs', 'view'), payrollController.listPayRunIssues);

// State transitions: Draft -> Calculated -> Validated -> Locked -> Paid
router.post('/runs/:id/calculate', requirePermission('pay_runs', 'prepare'), payrollController.calculatePayRun);
router.post('/runs/:id/validate', requirePermission('pay_runs', 'validate'), payrollController.validatePayRun);
router.post('/runs/:id/lock', requirePermission('pay_runs', 'approve'), payrollController.lockPayRun);
router.post('/runs/:id/pay', requirePermission('pay_runs', 'pay'), payrollController.markPayRunPaid);

// WPS SIF & Report Exports
router.get('/runs/:id/sif', requirePermission('pay_runs', 'view'), payrollController.exportSif);
router.get('/runs/:id/reports/register', requirePermission('pay_runs', 'view'), payrollController.downloadPayrollRegisterExcel);
router.get('/runs/:id/reports/variance', requirePermission('pay_runs', 'view'), payrollController.downloadVarianceReportExcel);

// ==========================================
// Payslips & Variances
// ==========================================
router.get('/payslips/:id', payrollController.getPayslip);
router.get('/payslips/:id/pdf', payrollController.downloadPayslipPdf);
router.patch('/payslips/:id/variance', requirePermission('pay_runs', 'validate'), payrollController.updateVarianceReason);

// ==========================================
// Salary Adjustments (Loans, Advances, Corrections)
// ==========================================
router.get('/adjustments', requirePermission('salary_adjustments', 'view'), salaryAdjustmentController.listAdjustments);
router.post('/adjustments', requirePermission('salary_adjustments', 'prepare'), salaryAdjustmentController.createAdjustment);
router.post('/adjustments/:id/approve', requirePermission('salary_adjustments', 'approve'), salaryAdjustmentController.approveAdjustment);
router.post('/adjustments/:id/reject', requirePermission('salary_adjustments', 'approve'), salaryAdjustmentController.rejectAdjustment);

export default router;
