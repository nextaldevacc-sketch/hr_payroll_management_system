import leaveService from '../services/leaveService.js';
import prisma from '../lib/prisma.js';

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
      companyVisaId: req.query.company_visa_id || req.query.companyVisaId,
      viewer: req.user,
    });
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function listLeaveRequests(req, res, next) {
  try {
    const data = await leaveService.listLeaveRequests({
      companyId: req.companyId,
      query: req.query,
      user: req.user,
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
      user: req.user,
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
