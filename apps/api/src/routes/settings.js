import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import settingsService from '../services/settingsService.js';

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

/**
 * GET /api/v1/settings/overview
 * Bento overview tile counts and latest audit activity
 */
router.get('/overview', authorizeSettings('general', 'view'), async (req, res, next) => {
  try {
    const overview = await settingsService.getSettingsOverview(req.companyId);
    res.json({ status: 'success', data: overview });
  } catch (err) {
    next(err);
  }
});

/**
 * 2. Company Profile & Visas
 */
router.get('/company', authorizeSettings('company', 'view'), async (req, res, next) => {
  try {
    const profile = await settingsService.getCompanyProfile(req.companyId);
    res.json({ status: 'success', data: profile });
  } catch (err) {
    next(err);
  }
});

router.put('/company', authorizeSettings('company', 'edit'), async (req, res, next) => {
  try {
    const updated = await settingsService.updateCompanyProfile({
      companyId: req.companyId,
      data: req.body,
      userId: req.user.id,
    });
    res.json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
});

router.post('/visas', authorizeSettings('company', 'edit'), async (req, res, next) => {
  try {
    const visa = await settingsService.createCompanyVisa({
      companyId: req.companyId,
      data: req.body,
      userId: req.user.id,
    });
    res.status(201).json({ status: 'success', data: visa });
  } catch (err) {
    next(err);
  }
});

router.put('/visas/:id', authorizeSettings('company', 'edit'), async (req, res, next) => {
  try {
    const updated = await settingsService.updateCompanyVisa({
      companyId: req.companyId,
      id: req.params.id,
      data: req.body,
      userId: req.user.id,
    });
    res.json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/visas/:id', authorizeSettings('company', 'edit'), async (req, res, next) => {
  try {
    const result = await settingsService.deleteCompanyVisa({
      companyId: req.companyId,
      id: req.params.id,
      userId: req.user.id,
    });
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * 3. Branches
 */
router.get('/branches', authorizeSettings('branches', 'view'), async (req, res, next) => {
  try {
    const branches = await settingsService.getBranches(req.companyId);
    res.json({ status: 'success', data: branches });
  } catch (err) {
    next(err);
  }
});

router.post('/branches', authorizeSettings('branches', 'edit'), async (req, res, next) => {
  try {
    const branch = await settingsService.createBranch({
      companyId: req.companyId,
      data: req.body,
      userId: req.user.id,
    });
    res.status(201).json({ status: 'success', data: branch });
  } catch (err) {
    next(err);
  }
});

router.put('/branches/:id', authorizeSettings('branches', 'edit'), async (req, res, next) => {
  try {
    const updated = await settingsService.updateBranch({
      companyId: req.companyId,
      id: req.params.id,
      data: req.body,
      userId: req.user.id,
    });
    res.json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/branches/:id', authorizeSettings('branches', 'edit'), async (req, res, next) => {
  try {
    const result = await settingsService.deleteBranch({
      companyId: req.companyId,
      id: req.params.id,
      userId: req.user.id,
    });
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * 4. Departments & Jobs
 */
router.get('/departments', authorizeSettings('departments', 'view'), async (req, res, next) => {
  try {
    const data = await settingsService.getDepartments(req.companyId);
    res.json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
});

router.post('/departments', authorizeSettings('departments', 'edit'), async (req, res, next) => {
  try {
    const dept = await settingsService.createDepartment({
      companyId: req.companyId,
      data: req.body,
      userId: req.user.id,
    });
    res.status(201).json({ status: 'success', data: dept });
  } catch (err) {
    next(err);
  }
});

router.put('/departments/:id', authorizeSettings('departments', 'edit'), async (req, res, next) => {
  try {
    const updated = await settingsService.updateDepartment({
      companyId: req.companyId,
      id: req.params.id,
      data: req.body,
      userId: req.user.id,
    });
    res.json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/departments/:id', authorizeSettings('departments', 'edit'), async (req, res, next) => {
  try {
    const result = await settingsService.deleteDepartment({
      companyId: req.companyId,
      id: req.params.id,
      userId: req.user.id,
    });
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/jobs', authorizeSettings('departments', 'view'), async (req, res, next) => {
  try {
    const jobs = await settingsService.getJobs(req.companyId);
    res.json({ status: 'success', data: jobs });
  } catch (err) {
    next(err);
  }
});

router.post('/jobs', authorizeSettings('departments', 'edit'), async (req, res, next) => {
  try {
    const job = await settingsService.createJob({
      companyId: req.companyId,
      data: req.body,
      userId: req.user.id,
    });
    res.status(201).json({ status: 'success', data: job });
  } catch (err) {
    next(err);
  }
});

router.put('/jobs/:id', authorizeSettings('departments', 'edit'), async (req, res, next) => {
  try {
    const updated = await settingsService.updateJob({
      companyId: req.companyId,
      id: req.params.id,
      data: req.body,
      userId: req.user.id,
    });
    res.json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/jobs/:id', authorizeSettings('departments', 'edit'), async (req, res, next) => {
  try {
    const result = await settingsService.deleteJob({
      companyId: req.companyId,
      id: req.params.id,
      userId: req.user.id,
    });
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * 5. Shifts & Attendance Policies
 */
router.get('/shifts', authorizeSettings('shifts', 'view'), async (req, res, next) => {
  try {
    const shifts = await settingsService.getShifts(req.companyId);
    res.json({ status: 'success', data: shifts });
  } catch (err) {
    next(err);
  }
});

router.post('/shifts', authorizeSettings('shifts', 'edit'), async (req, res, next) => {
  try {
    const shift = await settingsService.createShift({
      companyId: req.companyId,
      data: req.body,
      userId: req.user.id,
      effectiveFrom: req.body.effective_from,
    });
    res.status(201).json({ status: 'success', data: shift });
  } catch (err) {
    next(err);
  }
});

router.put('/shifts/:id', authorizeSettings('shifts', 'edit'), async (req, res, next) => {
  try {
    const updated = await settingsService.updateShift({
      companyId: req.companyId,
      id: req.params.id,
      data: req.body,
      userId: req.user.id,
      effectiveFrom: req.body.effective_from,
    });
    res.json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/shifts/:id', authorizeSettings('shifts', 'edit'), async (req, res, next) => {
  try {
    const result = await settingsService.deleteShift({
      companyId: req.companyId,
      id: req.params.id,
      userId: req.user.id,
    });
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/attendance-policies', authorizeSettings('shifts', 'view'), async (req, res, next) => {
  try {
    const policies = await settingsService.getAttendancePolicies(req.companyId);
    res.json({ status: 'success', data: policies });
  } catch (err) {
    next(err);
  }
});

router.post('/attendance-policies', authorizeSettings('shifts', 'edit'), async (req, res, next) => {
  try {
    const policy = await settingsService.createAttendancePolicy({
      companyId: req.companyId,
      data: req.body,
      userId: req.user.id,
      effectiveFrom: req.body.effective_from,
    });
    res.status(201).json({ status: 'success', data: policy });
  } catch (err) {
    next(err);
  }
});

router.put('/attendance-policies/:id', authorizeSettings('shifts', 'edit'), async (req, res, next) => {
  try {
    const updated = await settingsService.updateAttendancePolicy({
      companyId: req.companyId,
      id: req.params.id,
      data: req.body,
      userId: req.user.id,
      effectiveFrom: req.body.effective_from,
    });
    res.json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/attendance-policies/:id', authorizeSettings('shifts', 'edit'), async (req, res, next) => {
  try {
    const result = await settingsService.deleteAttendancePolicy({
      companyId: req.companyId,
      id: req.params.id,
      userId: req.user.id,
    });
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * 6. Leave Types & Accrual Plans
 */
router.get('/leave-types', authorizeSettings('leave', 'view'), async (req, res, next) => {
  try {
    const types = await settingsService.getLeaveTypes(req.companyId);
    res.json({ status: 'success', data: types });
  } catch (err) {
    next(err);
  }
});

router.post('/leave-types', authorizeSettings('leave', 'edit'), async (req, res, next) => {
  try {
    const leaveType = await settingsService.createLeaveType({
      companyId: req.companyId,
      data: req.body,
      userId: req.user.id,
      effectiveFrom: req.body.effective_from,
    });
    res.status(201).json({ status: 'success', data: leaveType });
  } catch (err) {
    next(err);
  }
});

router.put('/leave-types/:id', authorizeSettings('leave', 'edit'), async (req, res, next) => {
  try {
    const updated = await settingsService.updateLeaveType({
      companyId: req.companyId,
      id: req.params.id,
      data: req.body,
      userId: req.user.id,
      effectiveFrom: req.body.effective_from,
    });
    res.json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/leave-types/:id', authorizeSettings('leave', 'edit'), async (req, res, next) => {
  try {
    const result = await settingsService.deleteLeaveType({
      companyId: req.companyId,
      id: req.params.id,
      userId: req.user.id,
    });
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/accrual-plans', authorizeSettings('leave', 'edit'), async (req, res, next) => {
  try {
    const plan = await settingsService.createAccrualPlan({
      companyId: req.companyId,
      data: req.body,
      userId: req.user.id,
      effectiveFrom: req.body.effective_from,
    });
    res.status(201).json({ status: 'success', data: plan });
  } catch (err) {
    next(err);
  }
});

/**
 * 7. Public Holiday Calendar
 */
router.get('/holidays', authorizeSettings('holidays', 'view'), async (req, res, next) => {
  try {
    const { year, branch_id } = req.query;
    const holidays = await settingsService.getPublicHolidays({
      companyId: req.companyId,
      year,
      branchId: branch_id,
    });
    res.json({ status: 'success', data: holidays });
  } catch (err) {
    next(err);
  }
});

router.post('/holidays', authorizeSettings('holidays', 'edit'), async (req, res, next) => {
  try {
    const holiday = await settingsService.createPublicHoliday({
      companyId: req.companyId,
      data: req.body,
      userId: req.user.id,
    });
    res.status(201).json({ status: 'success', data: holiday });
  } catch (err) {
    next(err);
  }
});

router.put('/holidays/:id', authorizeSettings('holidays', 'edit'), async (req, res, next) => {
  try {
    const updated = await settingsService.updatePublicHoliday({
      companyId: req.companyId,
      id: req.params.id,
      data: req.body,
      userId: req.user.id,
    });
    res.json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/holidays/:id', authorizeSettings('holidays', 'edit'), async (req, res, next) => {
  try {
    const result = await settingsService.deletePublicHoliday({
      companyId: req.companyId,
      id: req.params.id,
      userId: req.user.id,
    });
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * 8. Salary Rules & Structures
 */
router.get('/salary-structures', authorizeSettings('salary_structures', 'view'), async (req, res, next) => {
  try {
    const structures = await settingsService.getSalaryStructures(req.companyId);
    res.json({ status: 'success', data: structures });
  } catch (err) {
    next(err);
  }
});

router.get('/salary-rules', authorizeSettings('salary_rules', 'view'), async (req, res, next) => {
  try {
    const rules = await settingsService.getSalaryRules(req.companyId, req.query.structure_id);
    res.json({ status: 'success', data: rules });
  } catch (err) {
    next(err);
  }
});

router.post('/salary-rules', authorizeSettings('salary_rules', 'edit'), async (req, res, next) => {
  try {
    const rule = await settingsService.createSalaryRule({
      companyId: req.companyId,
      structureId: req.body.structure_id,
      data: req.body,
      userId: req.user.id,
    });
    res.status(201).json({ status: 'success', data: rule });
  } catch (err) {
    next(err);
  }
});

router.put('/salary-rules/:id', authorizeSettings('salary_rules', 'edit'), async (req, res, next) => {
  try {
    const updated = await settingsService.updateSalaryRule({
      companyId: req.companyId,
      id: req.params.id,
      data: req.body,
      userId: req.user.id,
      effectiveFrom: req.body.effective_from,
      userRoles: req.user.roles || [],
    });
    res.json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/salary-rules/:id', authorizeSettings('salary_rules', 'edit'), async (req, res, next) => {
  try {
    const result = await settingsService.deleteSalaryRule({
      companyId: req.companyId,
      id: req.params.id,
      userId: req.user.id,
    });
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * Rule B: "Test this rule" simulation panel
 * Pick an employee context and month, compute step-by-step and show resulting NET
 */
router.post('/salary-rules/test', authorizeSettings('test_rules', 'view'), async (req, res, next) => {
  try {
    const { structure_id, employee_context } = req.body;
    const result = await settingsService.testSalaryRules({
      companyId: req.companyId,
      structureId: structure_id,
      employeeContext: employee_context || {},
    });
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * 9. Approval Settings
 */
router.get('/approval-flows', authorizeSettings('approvals', 'view'), async (req, res, next) => {
  try {
    const flows = await settingsService.getApprovalFlows(req.companyId);
    res.json({ status: 'success', data: flows });
  } catch (err) {
    next(err);
  }
});

router.put('/approval-flows/:id', authorizeSettings('approvals', 'edit'), async (req, res, next) => {
  try {
    const updated = await settingsService.updateApprovalFlow({
      companyId: req.companyId,
      id: req.params.id,
      steps: req.body.steps,
      userId: req.user.id,
    });
    res.json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * 10. Payroll Checks & Document Alerts
 */
router.get('/payroll-alerts', authorizeSettings('payroll_alerts', 'view'), async (req, res, next) => {
  try {
    const settings = await settingsService.getPayrollAlertSettings(req.companyId);
    res.json({ status: 'success', data: settings });
  } catch (err) {
    next(err);
  }
});

router.put('/payroll-alerts', authorizeSettings('payroll_alerts', 'edit'), async (req, res, next) => {
  try {
    const updated = await settingsService.updatePayrollAlertSettings({
      companyId: req.companyId,
      data: req.body,
      userId: req.user.id,
      effectiveFrom: req.body.effective_from,
    });
    res.json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * Version History for any setting entity
 */
router.get('/versions/:entityType/:entityId', authorizeSettings('general', 'view'), async (req, res, next) => {
  try {
    const versions = await settingsService.getVersionHistory({
      companyId: req.companyId,
      entityType: req.params.entityType,
      entityId: req.params.entityId,
    });
    res.json({ status: 'success', data: versions });
  } catch (err) {
    next(err);
  }
});

/**
 * Rule G: "Reset to UAE Default" Preview & Execute
 */
router.get('/defaults-diff/:section', authorizeSettings('general', 'view'), async (req, res, next) => {
  try {
    const diff = await settingsService.getResetDiff({
      companyId: req.companyId,
      section: req.params.section,
    });
    res.json({ status: 'success', data: diff });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-defaults/:section', authorizeSettings('general', 'edit'), async (req, res, next) => {
  try {
    const result = await settingsService.resetToDefaults({
      companyId: req.companyId,
      section: req.params.section,
      userId: req.user.id,
    });
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
