import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import settingsController from '../controllers/settingsController.js';

const router = Router();
router.use(authenticate);

/**
 * Section 5.3 Permissions Middleware for Settings (Rule D)
 * - Payroll Officer edits salary rules only
 * - HR Manager and Company Admin edit everything
 * - Finance edits debit/credit accounts only
 * - Everyone else has no access
 */
function authorizeSettings(section = 'general', action = 'view') {
  return (req, res, next) => {
    const roles = req.user.roles || [];

    // Company Admin & HR Manager have full access across all settings
    if (roles.includes('COMPANY_ADMIN') || roles.includes('HR_MANAGER')) {
      return next();
    }

    // Read/View access
    if (action === 'view') {
      if (roles.includes('PAYROLL_OFFICER') || roles.includes('FINANCE')) {
        return next();
      }
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'Permission Denied: Insufficient permissions to view company settings.',
      });
    }

    // Write/Edit access
    if (action === 'edit') {
      // Payroll Officer is allowed to edit salary-rules and payroll-alerts only
      if (roles.includes('PAYROLL_OFFICER')) {
        if (['salary_rules', 'salary_structures', 'payroll_alerts', 'test_rules'].includes(section)) {
          return next();
        }
        return res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN_PAYROLL_RESTRICTION',
          message: 'Permission Denied (Section 5.3): Payroll Officer may edit salary rules only.',
        });
      }

      // Finance is handled per-field on salary rule updates (debit/credit accounts only)
      if (roles.includes('FINANCE')) {
        if (section === 'salary_rules') {
          return next(); // Checked in updateSalaryRule for debit/credit field restriction
        }
        return res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN_FINANCE_RESTRICTION',
          message: 'Permission Denied (Section 5.3): Finance may only edit debit and credit accounts.',
        });
      }

      // All other roles (Employee, Dept Manager, HR Officer)
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'Permission Denied: You do not have permission to modify company settings.',
      });
    }

    next();
  };
}

// 1. Overview
router.get('/overview', authorizeSettings('general', 'view'), settingsController.getOverview);

// 2. Company Profile & Visas
router.get('/company', authorizeSettings('company', 'view'), settingsController.getCompany);
router.put('/company', authorizeSettings('company', 'edit'), settingsController.updateCompany);
router.get('/visas', authorizeSettings('company', 'view'), settingsController.getVisas);
router.post('/visas', authorizeSettings('company', 'edit'), settingsController.createVisa);
router.put('/visas/:id', authorizeSettings('company', 'edit'), settingsController.updateVisa);
router.delete('/visas/:id', authorizeSettings('company', 'edit'), settingsController.deleteVisa);

// 3. Branches
router.get('/branches', authorizeSettings('branches', 'view'), settingsController.getBranches);
router.post('/branches', authorizeSettings('branches', 'edit'), settingsController.createBranch);
router.put('/branches/:id', authorizeSettings('branches', 'edit'), settingsController.updateBranch);
router.delete('/branches/:id', authorizeSettings('branches', 'edit'), settingsController.deleteBranch);

// 4. Departments & Jobs
router.get('/departments', authorizeSettings('departments', 'view'), settingsController.getDepartments);
router.post('/departments', authorizeSettings('departments', 'edit'), settingsController.createDepartment);
router.put('/departments/:id', authorizeSettings('departments', 'edit'), settingsController.updateDepartment);
router.delete('/departments/:id', authorizeSettings('departments', 'edit'), settingsController.deleteDepartment);

router.get('/jobs', authorizeSettings('departments', 'view'), settingsController.getJobs);
router.post('/jobs', authorizeSettings('departments', 'edit'), settingsController.createJob);
router.put('/jobs/:id', authorizeSettings('departments', 'edit'), settingsController.updateJob);
router.delete('/jobs/:id', authorizeSettings('departments', 'edit'), settingsController.deleteJob);

// 5. Shifts & Attendance Policies
router.get('/shifts', authorizeSettings('shifts', 'view'), settingsController.getShifts);
router.post('/shifts', authorizeSettings('shifts', 'edit'), settingsController.createShift);
router.put('/shifts/:id', authorizeSettings('shifts', 'edit'), settingsController.updateShift);
router.delete('/shifts/:id', authorizeSettings('shifts', 'edit'), settingsController.deleteShift);

router.get('/attendance-policies', authorizeSettings('shifts', 'view'), settingsController.getAttendancePolicies);
router.post('/attendance-policies', authorizeSettings('shifts', 'edit'), settingsController.createAttendancePolicy);
router.put('/attendance-policies/:id', authorizeSettings('shifts', 'edit'), settingsController.updateAttendancePolicy);
router.delete('/attendance-policies/:id', authorizeSettings('shifts', 'edit'), settingsController.deleteAttendancePolicy);

// 6. Leave Types & Accrual Plans
router.get('/leave-types', authorizeSettings('leave', 'view'), settingsController.getLeaveTypes);
router.post('/leave-types', authorizeSettings('leave', 'edit'), settingsController.createLeaveType);
router.put('/leave-types/:id', authorizeSettings('leave', 'edit'), settingsController.updateLeaveType);
router.delete('/leave-types/:id', authorizeSettings('leave', 'edit'), settingsController.deleteLeaveType);
router.post('/accrual-plans', authorizeSettings('leave', 'edit'), settingsController.createAccrualPlan);

// 7. Public Holiday Calendar
router.get('/holidays', authorizeSettings('holidays', 'view'), settingsController.getHolidays);
router.post('/holidays', authorizeSettings('holidays', 'edit'), settingsController.createHoliday);
router.put('/holidays/:id', authorizeSettings('holidays', 'edit'), settingsController.updateHoliday);
router.delete('/holidays/:id', authorizeSettings('holidays', 'edit'), settingsController.deleteHoliday);

// 8. Salary Rules & Structures
router.get('/salary-structures', authorizeSettings('salary_structures', 'view'), settingsController.getSalaryStructures);
router.get('/salary-rules', authorizeSettings('salary_rules', 'view'), settingsController.getSalaryRules);
router.post('/salary-rules', authorizeSettings('salary_rules', 'edit'), settingsController.createSalaryRule);
router.put('/salary-rules/:id', authorizeSettings('salary_rules', 'edit'), settingsController.updateSalaryRule);
router.delete('/salary-rules/:id', authorizeSettings('salary_rules', 'edit'), settingsController.deleteSalaryRule);
router.post('/salary-rules/test', authorizeSettings('test_rules', 'view'), settingsController.testSalaryRule);

// 9. Approval Settings
router.get('/approval-flows', authorizeSettings('approvals', 'view'), settingsController.getApprovalFlows);
router.put('/approval-flows/:id', authorizeSettings('approvals', 'edit'), settingsController.updateApprovalFlow);

// 10. Payroll Checks & Document Alerts
router.get('/payroll-alerts', authorizeSettings('payroll_alerts', 'view'), settingsController.getPayrollAlerts);
router.put('/payroll-alerts', authorizeSettings('payroll_alerts', 'edit'), settingsController.updatePayrollAlerts);

// 11. Version History
router.get('/versions/:entityType/:entityId', authorizeSettings('general', 'view'), settingsController.getVersionHistory);

// 12. Rule G: "Reset to UAE Default" Preview & Execute
router.get('/defaults-diff/:section', authorizeSettings('general', 'view'), settingsController.getDefaultsDiff);
router.post('/reset-defaults/:section', authorizeSettings('general', 'edit'), settingsController.resetDefaults);

// 13. Support Access (FR-PL3) - Company Admin grants & revokes time-limited support access
router.get('/support-access', authorizeSettings('company', 'view'), settingsController.getSupportGrants);
router.post('/support-access', authorizeSettings('company', 'edit'), settingsController.createSupportGrant);
router.delete('/support-access/:id', authorizeSettings('company', 'edit'), settingsController.revokeSupportGrant);

export default router;
