import settingsService from '../services/settingsService.js';

export async function getOverview(req, res, next) {
  try {
    const data = await settingsService.getSettingsOverview(req.companyId);
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getCompany(req, res, next) {
  try {
    const data = await settingsService.getCompanyProfile(req.companyId);
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function updateCompany(req, res, next) {
  try {
    const data = await settingsService.updateCompanyProfile({
      companyId: req.companyId,
      data: req.body,
      userId: req.user.id,
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function createVisa(req, res, next) {
  try {
    const data = await settingsService.createCompanyVisa({
      companyId: req.companyId,
      data: req.body,
      userId: req.user.id,
    });
    res.status(201).json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function updateVisa(req, res, next) {
  try {
    const data = await settingsService.updateCompanyVisa({
      companyId: req.companyId,
      id: req.params.id,
      data: req.body,
      userId: req.user.id,
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function deleteVisa(req, res, next) {
  try {
    const data = await settingsService.deleteCompanyVisa({
      companyId: req.companyId,
      id: req.params.id,
      userId: req.user.id,
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getBranches(req, res, next) {
  try {
    const data = await settingsService.getBranches(req.companyId);
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function createBranch(req, res, next) {
  try {
    const data = await settingsService.createBranch({
      companyId: req.companyId,
      data: req.body,
      userId: req.user.id,
    });
    res.status(201).json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function updateBranch(req, res, next) {
  try {
    const data = await settingsService.updateBranch({
      companyId: req.companyId,
      id: req.params.id,
      data: req.body,
      userId: req.user.id,
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function deleteBranch(req, res, next) {
  try {
    const data = await settingsService.deleteBranch({
      companyId: req.companyId,
      id: req.params.id,
      userId: req.user.id,
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getDepartments(req, res, next) {
  try {
    const data = await settingsService.getDepartments(req.companyId);
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function createDepartment(req, res, next) {
  try {
    const data = await settingsService.createDepartment({
      companyId: req.companyId,
      data: req.body,
      userId: req.user.id,
    });
    res.status(201).json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function updateDepartment(req, res, next) {
  try {
    const data = await settingsService.updateDepartment({
      companyId: req.companyId,
      id: req.params.id,
      data: req.body,
      userId: req.user.id,
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function deleteDepartment(req, res, next) {
  try {
    const data = await settingsService.deleteDepartment({
      companyId: req.companyId,
      id: req.params.id,
      userId: req.user.id,
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getJobs(req, res, next) {
  try {
    const data = await settingsService.getJobs(req.companyId);
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function createJob(req, res, next) {
  try {
    const data = await settingsService.createJob({
      companyId: req.companyId,
      data: req.body,
      userId: req.user.id,
    });
    res.status(201).json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function updateJob(req, res, next) {
  try {
    const data = await settingsService.updateJob({
      companyId: req.companyId,
      id: req.params.id,
      data: req.body,
      userId: req.user.id,
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function deleteJob(req, res, next) {
  try {
    const data = await settingsService.deleteJob({
      companyId: req.companyId,
      id: req.params.id,
      userId: req.user.id,
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getShifts(req, res, next) {
  try {
    const data = await settingsService.getShifts(req.companyId);
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function createShift(req, res, next) {
  try {
    const data = await settingsService.createShift({
      companyId: req.companyId,
      data: req.body,
      userId: req.user.id,
      effectiveFrom: req.body.effective_from,
    });
    res.status(201).json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function updateShift(req, res, next) {
  try {
    const data = await settingsService.updateShift({
      companyId: req.companyId,
      id: req.params.id,
      data: req.body,
      userId: req.user.id,
      effectiveFrom: req.body.effective_from,
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function deleteShift(req, res, next) {
  try {
    const data = await settingsService.deleteShift({
      companyId: req.companyId,
      id: req.params.id,
      userId: req.user.id,
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getAttendancePolicies(req, res, next) {
  try {
    const data = await settingsService.getAttendancePolicies(req.companyId);
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function createAttendancePolicy(req, res, next) {
  try {
    const data = await settingsService.createAttendancePolicy({
      companyId: req.companyId,
      data: req.body,
      userId: req.user.id,
      effectiveFrom: req.body.effective_from,
    });
    res.status(201).json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function updateAttendancePolicy(req, res, next) {
  try {
    const data = await settingsService.updateAttendancePolicy({
      companyId: req.companyId,
      id: req.params.id,
      data: req.body,
      userId: req.user.id,
      effectiveFrom: req.body.effective_from,
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function deleteAttendancePolicy(req, res, next) {
  try {
    const data = await settingsService.deleteAttendancePolicy({
      companyId: req.companyId,
      id: req.params.id,
      userId: req.user.id,
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getLeaveTypes(req, res, next) {
  try {
    const data = await settingsService.getLeaveTypes(req.companyId);
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function createLeaveType(req, res, next) {
  try {
    const data = await settingsService.createLeaveType({
      companyId: req.companyId,
      data: req.body,
      userId: req.user.id,
      effectiveFrom: req.body.effective_from,
    });
    res.status(201).json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function updateLeaveType(req, res, next) {
  try {
    const data = await settingsService.updateLeaveType({
      companyId: req.companyId,
      id: req.params.id,
      data: req.body,
      userId: req.user.id,
      effectiveFrom: req.body.effective_from,
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function deleteLeaveType(req, res, next) {
  try {
    const data = await settingsService.deleteLeaveType({
      companyId: req.companyId,
      id: req.params.id,
      userId: req.user.id,
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function createAccrualPlan(req, res, next) {
  try {
    const data = await settingsService.createAccrualPlan({
      companyId: req.companyId,
      data: req.body,
      userId: req.user.id,
      effectiveFrom: req.body.effective_from,
    });
    res.status(201).json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getHolidays(req, res, next) {
  try {
    const { year, branch_id } = req.query;
    const data = await settingsService.getPublicHolidays({
      companyId: req.companyId,
      year,
      branchId: branch_id,
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function createHoliday(req, res, next) {
  try {
    const data = await settingsService.createPublicHoliday({
      companyId: req.companyId,
      data: req.body,
      userId: req.user.id,
    });
    res.status(201).json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function updateHoliday(req, res, next) {
  try {
    const data = await settingsService.updatePublicHoliday({
      companyId: req.companyId,
      id: req.params.id,
      data: req.body,
      userId: req.user.id,
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function deleteHoliday(req, res, next) {
  try {
    const data = await settingsService.deletePublicHoliday({
      companyId: req.companyId,
      id: req.params.id,
      userId: req.user.id,
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getSalaryStructures(req, res, next) {
  try {
    const data = await settingsService.getSalaryStructures(req.companyId);
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getSalaryRules(req, res, next) {
  try {
    const data = await settingsService.getSalaryRules(req.companyId, req.query.structure_id);
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function createSalaryRule(req, res, next) {
  try {
    const data = await settingsService.createSalaryRule({
      companyId: req.companyId,
      structureId: req.body.structure_id,
      data: req.body,
      userId: req.user.id,
    });
    res.status(201).json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function updateSalaryRule(req, res, next) {
  try {
    const data = await settingsService.updateSalaryRule({
      companyId: req.companyId,
      id: req.params.id,
      data: req.body,
      userId: req.user.id,
      effectiveFrom: req.body.effective_from,
      userRoles: req.user.roles || [],
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function deleteSalaryRule(req, res, next) {
  try {
    const data = await settingsService.deleteSalaryRule({
      companyId: req.companyId,
      id: req.params.id,
      userId: req.user.id,
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function testSalaryRule(req, res, next) {
  try {
    const { structure_id, employee_context } = req.body;
    const data = await settingsService.testSalaryRules({
      companyId: req.companyId,
      structureId: structure_id,
      employeeContext: employee_context || {},
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getApprovalFlows(req, res, next) {
  try {
    const data = await settingsService.getApprovalFlows(req.companyId);
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function updateApprovalFlow(req, res, next) {
  try {
    const data = await settingsService.updateApprovalFlow({
      companyId: req.companyId,
      id: req.params.id,
      steps: req.body.steps,
      userId: req.user.id,
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getPayrollAlerts(req, res, next) {
  try {
    const data = await settingsService.getPayrollAlertSettings(req.companyId);
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function updatePayrollAlerts(req, res, next) {
  try {
    const data = await settingsService.updatePayrollAlertSettings({
      companyId: req.companyId,
      data: req.body,
      userId: req.user.id,
      effectiveFrom: req.body.effective_from,
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getVersionHistory(req, res, next) {
  try {
    const data = await settingsService.getVersionHistory({
      companyId: req.companyId,
      entityType: req.params.entityType,
      entityId: req.params.entityId,
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getDefaultsDiff(req, res, next) {
  try {
    const data = await settingsService.getResetDiff({
      companyId: req.companyId,
      section: req.params.section,
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function resetDefaults(req, res, next) {
  try {
    const data = await settingsService.resetToDefaults({
      companyId: req.companyId,
      section: req.params.section,
      userId: req.user.id,
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export default {
  getOverview,
  getCompany,
  updateCompany,
  createVisa,
  updateVisa,
  deleteVisa,
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getJobs,
  createJob,
  updateJob,
  deleteJob,
  getShifts,
  createShift,
  updateShift,
  deleteShift,
  getAttendancePolicies,
  createAttendancePolicy,
  updateAttendancePolicy,
  deleteAttendancePolicy,
  getLeaveTypes,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  createAccrualPlan,
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  getSalaryStructures,
  getSalaryRules,
  createSalaryRule,
  updateSalaryRule,
  deleteSalaryRule,
  testSalaryRule,
  getApprovalFlows,
  updateApprovalFlow,
  getPayrollAlerts,
  updatePayrollAlerts,
  getVersionHistory,
  getDefaultsDiff,
  resetDefaults,
};
