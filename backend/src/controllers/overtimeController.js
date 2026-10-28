import overtimeService from '../services/overtimeService.js';
import { serializeOvertimeRequest } from '../serializers/index.js';

export async function listOvertime(req, res, next) {
  try {
    const roles = req.user.roles || [];
    let deptId = req.query.department_id;
    if (roles.includes('DEPT_MANAGER') && !roles.includes('HR_MANAGER') && !roles.includes('COMPANY_ADMIN')) {
      deptId = req.user.departmentId || deptId;
    }

    const data = await overtimeService.listOvertimeRequests({
      companyId: req.companyId,
      month: req.query.month,
      status: req.query.status,
      departmentId: deptId,
      employeeId: req.query.employee_id,
    });

    // Role-aware serialization
    const serialized = data.map((ot) => serializeOvertimeRequest(ot, req.user));
    res.json({ status: 'success', count: serialized.length, data: serialized });
  } catch (err) { next(err); }
}

export async function requestOvertime(req, res, next) {
  try {
    const employeeId = req.body.employee_id || req.user.employeeId;
    const created = await overtimeService.requestOvertime({
      companyId: req.companyId,
      employeeId,
      data: req.body,
      userId: req.user.id,
    });
    const serialized = serializeOvertimeRequest(created, req.user);
    res.status(201).json({ status: 'success', data: serialized });
  } catch (err) { next(err); }
}

export async function actOnOvertime(req, res, next) {
  try {
    const updated = await overtimeService.actOnOvertime({
      companyId: req.companyId,
      id: req.params.id,
      action: req.body.action || 'Approve',
      otType: req.body.ot_type,
      compensation: req.body.compensation,
      userId: req.user.id,
      userRoles: req.user.roles || [],
      comment: req.body.comment,
    });
    const serialized = serializeOvertimeRequest(updated, req.user);
    res.json({ status: 'success', data: serialized });
  } catch (err) { next(err); }
}

export async function bulkApprove(req, res, next) {
  try {
    const result = await overtimeService.bulkApprove({
      companyId: req.companyId,
      ids: req.body.ids,
      userId: req.user.id,
    });
    res.json({ status: 'success', data: result });
  } catch (err) { next(err); }
}

export default {
  listOvertime,
  requestOvertime,
  actOnOvertime,
  bulkApprove,
};
