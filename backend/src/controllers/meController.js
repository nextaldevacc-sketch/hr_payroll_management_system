import prisma from '../prisma/client.js';
import leaveService from '../services/leaveService.js';
import overtimeService from '../services/overtimeService.js';
import { toDubaiDateString } from '@nextal/shared';

export async function getMyAttendance(req, res, next) {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.json({ status: 'success', count: 0, data: [] });
    }

    const monthKey = req.query.month || toDubaiDateString(new Date()).slice(0, 7);
    const [y, m] = monthKey.split('-').map(Number);
    const startOfMonth = new Date(Date.UTC(y, m - 1, 1));
    const endOfMonth = new Date(Date.UTC(y, m, 0, 23, 59, 59));

    const days = await prisma.$base().attendance_days.findMany({
      where: {
        company_id: req.companyId,
        employee_id: employeeId,
        work_date: { gte: startOfMonth, lte: endOfMonth },
      },
      include: {
        shift: { select: { name: true, start_time: true, end_time: true } },
        public_holiday: { select: { name: true } },
        leave_request: { select: { leave_type: { select: { name: true } } } },
      },
      orderBy: { work_date: 'asc' },
    });

    res.json({ status: 'success', month: monthKey, count: days.length, data: days });
  } catch (err) { next(err); }
}

export async function getMyLeave(req, res, next) {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.json({ status: 'success', data: { balances: [], request_history: [] } });
    }

    const data = await leaveService.getLeaveBalances({
      companyId: req.companyId,
      employeeId,
      year: req.query.year,
    });

    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getMyRequests(req, res, next) {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.json({ status: 'success', count: 0, data: [] });
    }

    const [leaves, overtimes, punchRequests] = await Promise.all([
      prisma.$base().leave_requests.findMany({
        where: { company_id: req.companyId, employee_id: employeeId },
        include: { leave_type: { select: { name: true, code: true } } },
        orderBy: { created_at: 'desc' },
      }),
      prisma.$base().overtime_requests.findMany({
        where: { company_id: req.companyId, employee_id: employeeId },
        orderBy: { created_at: 'desc' },
      }),
      prisma.$base().attendance_requests.findMany({
        where: { company_id: req.companyId, employee_id: employeeId },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    const formattedLeaves = leaves.map((l) => ({
      id: l.id,
      request_type: 'Leave',
      title: `${l.leave_type?.name || 'Leave'} (${l.days} days)`,
      date_from: l.date_from,
      date_to: l.date_to,
      status: l.status,
      created_at: l.created_at,
    }));

    const formattedOvertimes = overtimes.map((o) => ({
      id: o.id,
      request_type: 'Overtime',
      title: `${o.ot_type} (${o.hours}h)`,
      date: o.work_date,
      status: o.status,
      created_at: o.created_at,
    }));

    const formattedPunches = punchRequests.map((p) => ({
      id: p.id,
      request_type: 'MissingPunch',
      title: `Missing Punch for ${toDubaiDateString(p.work_date)}`,
      date: p.work_date,
      status: p.status,
      created_at: p.created_at,
    }));

    const combined = [...formattedLeaves, ...formattedOvertimes, ...formattedPunches]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ status: 'success', count: combined.length, data: combined });
  } catch (err) { next(err); }
}

export async function submitMyRequest(req, res, next) {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.status(400).json({ status: 'error', message: 'User is not linked to an employee record' });
    }

    const { type, ...payload } = req.body;

    if (type === 'Leave') {
      const result = await leaveService.requestLeave({
        companyId: req.companyId,
        employeeId,
        data: payload,
        userId: req.user.id,
      });
      return res.status(201).json({ status: 'success', data: result });
    }

    if (type === 'Overtime') {
      const result = await overtimeService.requestOvertime({
        companyId: req.companyId,
        employeeId,
        data: payload,
        userId: req.user.id,
      });
      return res.status(201).json({ status: 'success', data: result });
    }

    if (type === 'MissingPunch') {
      const reqRecord = await prisma.$base().attendance_requests.create({
        data: {
          company_id: req.companyId,
          employee_id: employeeId,
          work_date: new Date(payload.work_date),
          request_type: 'MissingPunch',
          requested_time: new Date(payload.requested_time),
          reason: payload.reason || 'Missing punch submitted by employee',
          status: 'Pending',
        },
      });
      return res.status(201).json({ status: 'success', data: reqRecord });
    }

    return res.status(400).json({ status: 'error', message: `Unknown request type: ${type}` });
  } catch (err) { next(err); }
}

export default {
  getMyAttendance,
  getMyLeave,
  getMyRequests,
  submitMyRequest,
};
