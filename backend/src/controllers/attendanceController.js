import attendanceService from '../services/attendanceService.js';

export async function importBiometric(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', code: 'NO_FILE', message: 'No biometric file uploaded' });
    }
    const result = await attendanceService.importBiometricFile({
      companyId: req.companyId,
      fileBuffer: req.file.buffer,
      mimeType: req.file.mimetype,
      periodFrom: req.body.period_from,
      periodTo: req.body.period_to,
      userId: req.user.id,
    });
    res.status(200).json({ status: 'success', data: result });
  } catch (err) { next(err); }
}

export async function getAttendanceGrid(req, res, next) {
  try {
    const roles = req.user.roles || [];
    let deptId = req.query.department_id;
    if (roles.includes('DEPT_MANAGER') && !roles.includes('HR_MANAGER') && !roles.includes('COMPANY_ADMIN')) {
      // Scope to department manager's department
      deptId = req.user.departmentId || deptId;
    }

    const data = await attendanceService.getAttendanceGrid({
      companyId: req.companyId,
      month: req.query.month,
      departmentId: deptId,
      branchId: req.query.branch_id,
      search: req.query.search,
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function editAttendanceDay(req, res, next) {
  try {
    const updated = await attendanceService.editAttendanceDay({
      companyId: req.companyId,
      id: req.params.id,
      data: req.body,
      userId: req.user.id,
    });
    res.json({ status: 'success', data: updated });
  } catch (err) { next(err); }
}

export async function getMissingPunchQueue(req, res, next) {
  try {
    const data = await attendanceService.getMissingPunchQueue({
      companyId: req.companyId,
      month: req.query.month,
    });
    res.json({ status: 'success', count: data.length, data });
  } catch (err) { next(err); }
}

export async function resolveMissingPunch(req, res, next) {
  try {
    const updated = await attendanceService.resolveMissingPunch({
      companyId: req.companyId,
      id: req.params.id,
      checkIn: req.body.check_in,
      checkOut: req.body.check_out,
      reason: req.body.reason,
      userId: req.user.id,
    });
    res.json({ status: 'success', data: updated });
  } catch (err) { next(err); }
}

export async function confirmManager(req, res, next) {
  try {
    const result = await attendanceService.confirmManager({
      companyId: req.companyId,
      departmentId: req.body.department_id || req.user.departmentId,
      month: req.body.month,
      userId: req.user.id,
    });
    res.json({ status: 'success', data: result });
  } catch (err) { next(err); }
}

export async function confirmHR(req, res, next) {
  try {
    const result = await attendanceService.confirmHR({
      companyId: req.companyId,
      month: req.body.month,
      userId: req.user.id,
    });
    res.json({ status: 'success', data: result });
  } catch (err) { next(err); }
}

export default {
  importBiometric,
  getAttendanceGrid,
  editAttendanceDay,
  getMissingPunchQueue,
  resolveMissingPunch,
  confirmManager,
  confirmHR,
};
