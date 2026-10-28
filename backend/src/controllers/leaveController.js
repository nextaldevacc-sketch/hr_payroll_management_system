import leaveService from '../services/leaveService.js';
import prisma from '../prisma/client.js';

export async function listLeaveTypes(req, res, next) {
  try {
    const types = await prisma.$base().leave_types.findMany({
      where: { company_id: req.companyId, is_active: true },
      orderBy: { created_at: 'asc' },
    });
    res.json({ status: 'success', count: types.length, data: types });
  } catch (err) { next(err); }
}

export async function getLeaveBalances(req, res, next) {
  try {
    const employeeId = req.query.employee_id || req.user.employeeId;
    if (!employeeId) {
      return res.status(400).json({ status: 'error', message: 'employee_id query parameter required' });
    }
    const data = await leaveService.getLeaveBalances({
      companyId: req.companyId,
      employeeId,
      year: req.query.year,
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function listLeaveRequests(req, res, next) {
  try {
    const roles = req.user.roles || [];
    const where = { company_id: req.companyId };
    if (req.query.status) where.status = req.query.status;
    if (req.query.employee_id) where.employee_id = req.query.employee_id;
    if (roles.includes('EMPLOYEE') && !roles.includes('HR_MANAGER') && !roles.includes('COMPANY_ADMIN') && !roles.includes('DEPT_MANAGER')) {
      where.employee_id = req.user.employeeId;
    } else if (roles.includes('DEPT_MANAGER') && !roles.includes('HR_MANAGER') && !roles.includes('COMPANY_ADMIN')) {
      if (req.user.departmentId) {
        where.employee = { contracts: { some: { department_id: req.user.departmentId } } };
      }
    }

    const data = await prisma.$base().leave_requests.findMany({
      where,
      include: {
        leave_type: true,
        employee: {
          select: {
            id: true,
            name: true,
            arabic_name: true,
            employee_code: true,
            contracts: {
              take: 1,
              orderBy: { effective_date: 'desc' },
              select: { department: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    res.json({ status: 'success', count: data.length, data });
  } catch (err) { next(err); }
}

export async function requestLeave(req, res, next) {
  try {
    const employeeId = req.body.employee_id || req.user.employeeId;
    if (!employeeId) {
      return res.status(400).json({ status: 'error', message: 'employee_id is required' });
    }
    const result = await leaveService.requestLeave({
      companyId: req.companyId,
      employeeId,
      data: req.body,
      userId: req.user.id,
    });
    res.status(201).json({ status: 'success', data: result });
  } catch (err) { next(err); }
}

export async function actOnLeave(req, res, next) {
  try {
    const result = await leaveService.actOnLeave({
      companyId: req.companyId,
      id: req.params.id,
      action: req.body.action || 'Approve',
      userId: req.user.id,
      comment: req.body.comment,
    });
    res.json({ status: 'success', data: result });
  } catch (err) { next(err); }
}

export default {
  listLeaveTypes,
  getLeaveBalances,
  listLeaveRequests,
  requestLeave,
  actOnLeave,
};
