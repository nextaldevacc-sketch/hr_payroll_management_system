import Decimal from 'decimal.js';
import prisma from '../lib/prisma.js';
import auditService from './auditService.js';
import { toDubaiDateString, getDubaiDayBounds } from '@nextal/shared';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function sanitizeUuid(val) {
  return typeof val === 'string' && UUID_REGEX.test(val) ? val : null;
}

class LeaveService {
  /**
   * 1. Get Leave Balances for an employee
   */
  async getLeaveBalances({ companyId, employeeId, year }) {
    const curYear = year ? parseInt(year, 10) : new Date().getFullYear();
    const startOfYear = new Date(Date.UTC(curYear, 0, 1));
    const endOfYear = new Date(Date.UTC(curYear, 11, 31, 23, 59, 59));

    const leaveTypes = await prisma.$base().leave_types.findMany({
      where: { company_id: companyId, is_active: true },
      orderBy: { created_at: 'asc' },
    });

    const allocations = await prisma.$base().leave_allocations.findMany({
      where: {
        company_id: companyId,
        employee_id: employeeId,
        valid_from: { lte: endOfYear },
        valid_to: { gte: startOfYear },
      },
    });

    const history = await prisma.$base().leave_requests.findMany({
      where: {
        company_id: companyId,
        employee_id: employeeId,
        date_from: { gte: startOfYear },
      },
      include: { leave_type: true },
      orderBy: { date_from: 'desc' },
    });

    const balances = leaveTypes.map((type) => {
      const typeAllocs = allocations.filter((a) => a.leave_type_id === type.id);
      const totalAllocated = typeAllocs.reduce((sum, a) => sum + Number(a.days_allocated || 0), 0);
      const totalCarryOver = typeAllocs.reduce((sum, a) => sum + Number(a.carry_over_days || 0), 0);
      const totalTaken = typeAllocs.reduce((sum, a) => sum + Number(a.days_taken || 0), 0);
      const remaining = Math.max(0, Number((totalAllocated + totalCarryOver - totalTaken).toFixed(2)));

      return {
        leave_type_id: type.id,
        name: type.name,
        name_ar: type.name_ar,
        code: type.code,
        is_paid: type.is_paid,
        days_allocated: totalAllocated,
        carry_over_days: totalCarryOver,
        days_taken: totalTaken,
        remaining_balance: remaining,
      };
    });

    return { year: curYear, balances, request_history: history };
  }

  /**
   * 2. Submit a Leave Request
   */
  async requestLeave({ companyId, employeeId, data, userId }) {
    const { leave_type_id, date_from, date_to, half_day = 'None', reason, attachment_url } = data;

    if (!leave_type_id || !date_from || !date_to) {
      const err = new Error('Leave type, start date, and end date are required');
      err.status = 400;
      throw err;
    }

    const fromDate = new Date(date_from);
    const toDate = new Date(date_to);

    if (fromDate > toDate) {
      const err = new Error('Start date cannot be after end date');
      err.status = 400;
      throw err;
    }

    const leaveType = await prisma.$base().leave_types.findFirst({
      where: { id: leave_type_id, company_id: companyId },
    });
    if (!leaveType) {
      const err = new Error('Leave type not found');
      err.status = 404;
      throw err;
    }

    // Attachment check
    if (leaveType.needs_attachment && !attachment_url) {
      const err = new Error(`An attachment is required for ${leaveType.name} (e.g. medical certificate)`);
      err.status = 400;
      err.code = 'ATTACHMENT_REQUIRED';
      throw err;
    }

    // Overlapping leave request check
    const existingOverlap = await prisma.$base().leave_requests.findFirst({
      where: {
        company_id: companyId,
        employee_id: employeeId,
        status: { in: ['Pending', 'Approved'] },
        date_from: { lte: toDate },
        date_to: { gte: fromDate },
      },
    });

    if (existingOverlap) {
      const err = new Error('An overlapping leave request already exists for these dates');
      err.status = 400;
      err.code = 'OVERLAPPING_LEAVE_REQUEST';
      throw err;
    }

    // Load active contract & shift to determine weekly off days
    const contract = await prisma.$base().contracts.findFirst({
      where: { company_id: companyId, employee_id: employeeId },
      include: { shift: true },
      orderBy: { effective_date: 'desc' },
    });
    const weeklyOffDays = contract?.shift?.weekly_off_days || [0, 6]; // Default Fri/Sat or Sun/Sat

    // Load public holidays in date range
    const publicHolidays = await prisma.$base().public_holidays.findMany({
      where: {
        company_id: companyId,
        holiday_date: { gte: fromDate, lte: toDate },
      },
    });
    const holidayDateSet = new Set(publicHolidays.map((h) => toDubaiDateString(h.holiday_date)));

    // Calculate working days: exclude weekly off days and public holidays
    let workingDaysCount = 0;
    const workingDates = [];
    const cur = new Date(fromDate);
    while (cur <= toDate) {
      const dateStr = toDubaiDateString(cur);
      const dayOfWeek = new Date(cur.getTime() + 4 * 3600000).getUTCDay();

      const isOff = weeklyOffDays.includes(dayOfWeek);
      const isHoliday = holidayDateSet.has(dateStr);

      if (!isOff && !isHoliday) {
        workingDaysCount++;
        workingDates.push(dateStr);
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    let deductibleDays = half_day !== 'None' ? 0.5 : workingDaysCount;

    if (deductibleDays <= 0) {
      const err = new Error('The selected dates only fall on weekly off days or public holidays');
      err.status = 400;
      err.code = 'NO_WORKING_DAYS_IN_RANGE';
      throw err;
    }

    // Check balance: Sick leave is statutory 90 days/yr; other paid leaves check allocations
    let matchedAllocation = null;
    const isSick = leaveType.code === 'SICK' || leaveType.code?.startsWith('SICK');
    if (isSick) {
      const curYear = fromDate.getFullYear();
      const priorSick = await prisma.$base().leave_requests.findMany({
        where: {
          company_id: companyId,
          employee_id: employeeId,
          status: 'Approved',
          leave_type: { code: { startsWith: 'SICK' } },
          date_from: { gte: new Date(Date.UTC(curYear, 0, 1)), lte: new Date(Date.UTC(curYear, 11, 31)) },
        },
      });
      const priorSickDays = priorSick.reduce((sum, r) => sum + Number(r.days), 0);
      if (priorSickDays + deductibleDays > 90) {
        const err = new Error(`Statutory annual sick leave cap (90 days) exceeded: requested ${deductibleDays}, already used ${priorSickDays}`);
        err.status = 400;
        err.code = 'INSUFFICIENT_LEAVE_BALANCE';
        throw err;
      }
    } else if (leaveType.is_paid) {
      const allocation = await prisma.$base().leave_allocations.findFirst({
        where: {
          company_id: companyId,
          employee_id: employeeId,
          leave_type_id: leaveType.id,
          valid_to: { gte: fromDate },
        },
        orderBy: { valid_to: 'desc' },
      });

      if (!allocation) {
        const err = new Error(`No accrued leave allocation found for ${leaveType.name}`);
        err.status = 400;
        err.code = 'INSUFFICIENT_LEAVE_BALANCE';
        throw err;
      }

      const availableBalance = Number(allocation.days_allocated) + Number(allocation.carry_over_days) - Number(allocation.days_taken);
      if (availableBalance < deductibleDays) {
        const err = new Error(`Insufficient leave balance: requested ${deductibleDays} day(s), available ${availableBalance} day(s)`);
        err.status = 400;
        err.code = 'INSUFFICIENT_LEAVE_BALANCE';
        throw err;
      }
      matchedAllocation = allocation;
    }

    // Multi-step approval chain setup
    const needsGM = leaveType.needs_gm || (leaveType.gm_after_days && deductibleDays > leaveType.gm_after_days);

    const leaveRequest = await prisma.$base().leave_requests.create({
      data: {
        company_id: companyId,
        employee_id: employeeId,
        leave_type_id: leaveType.id,
        leave_allocation_id: matchedAllocation?.id,
        date_from: fromDate,
        date_to: toDate,
        half_day,
        days: new Decimal(deductibleDays),
        reason,
        attachment_url,
        status: 'Pending',
        created_by: sanitizeUuid(userId),
      },
    });

    return {
      leave_request: leaveRequest,
      deductible_days: deductibleDays,
      needs_gm: needsGM,
    };
  }

  /**
   * 3. Act on a Leave Request (Approve / Refuse / Cancel)
   */
  async actOnLeave({ companyId, id, action, userId, comment }) {
    const request = await prisma.$base().leave_requests.findFirst({
      where: { id, company_id: companyId },
      include: {
        leave_type: true,
        employee: { select: { id: true, user: { select: { id: true } } } },
      },
    });

    if (!request) {
      const err = new Error('Leave request not found');
      err.status = 404;
      throw err;
    }

    // Section 5.3 Rule: "Nobody approves their own request"
    if (request.employee?.user?.id === userId && action === 'Approve') {
      const err = new Error('Self-approval forbidden: Cannot approve your own leave request');
      err.status = 403;
      err.code = 'SELF_APPROVAL_FORBIDDEN';
      throw err;
    }

    if (action === 'Refuse' || action === 'Cancel') {
      // If was previously approved, return days to allocation
      if (request.status === 'Approved' && request.leave_allocation_id) {
        await prisma.$base().leave_allocations.update({
          where: { id: request.leave_allocation_id },
          data: { days_taken: { decrement: request.days } },
        });

        // Clear attendance_days
        await prisma.$base().attendance_days.updateMany({
          where: { leave_request_id: request.id },
          data: {
            day_type: 'WorkDay',
            leave_request_id: null,
            pay_band: null,
          },
        });
      }

      const updated = await prisma.$base().leave_requests.update({
        where: { id },
        data: { status: action === 'Cancel' ? 'Cancelled' : 'Refused', updated_by: sanitizeUuid(userId) },
      });

      await auditService.record({
        companyId,
        userId,
        action: 'UPDATE',
        tableName: 'leave_requests',
        recordId: id,
        oldValues: { status: request.status },
        newValues: { status: updated.status, comment },
      });

      return updated;
    }

    if (action === 'Approve') {
      // 1. Deduct from allocation
      if (request.leave_allocation_id) {
        await prisma.$base().leave_allocations.update({
          where: { id: request.leave_allocation_id },
          data: { days_taken: { increment: request.days } },
        });
      }

      // 2. Compute pay bands across calendar year
      const year = request.date_from.getFullYear();
      const code = request.leave_type.code;

      let payBand = 'Full';
      if (!request.leave_type.is_paid) {
        payBand = 'None';
      }

      // Sick leave statutory bands: 15 full, 30 half, 45 unpaid (total 90)
      const isSickLeave = code === 'SICK' || code?.startsWith('SICK');
      let priorSickDays = 0;
      if (isSickLeave) {
        const priorSick = await prisma.$base().leave_requests.findMany({
          where: {
            company_id: companyId,
            employee_id: request.employee_id,
            status: 'Approved',
            leave_type: { code: { startsWith: 'SICK' } },
            date_from: { gte: new Date(Date.UTC(year, 0, 1)), lt: request.date_from },
          },
        });
        priorSickDays = priorSick.reduce((sum, r) => sum + Number(r.days), 0);
      }

      // 3. Mark days on attendance_days
      const cur = new Date(request.date_from);
      const end = new Date(request.date_to);
      let dayIndex = 0;

      while (cur <= end) {
        const dateStr = toDubaiDateString(cur);
        const dayDate = new Date(dateStr);

        let currentDayPayBand = payBand;
        if (isSickLeave) {
          const cumulativeSickDay = priorSickDays + dayIndex + 1;
          if (cumulativeSickDay <= 15) {
            currentDayPayBand = 'Full';
          } else if (cumulativeSickDay <= 45) {
            currentDayPayBand = 'Half';
          } else {
            currentDayPayBand = 'None';
          }
        }

        await prisma.$base().attendance_days.upsert({
          where: {
            employee_id_work_date: {
              employee_id: request.employee_id,
              work_date: dayDate,
            },
          },
          create: {
            company_id: companyId,
            employee_id: request.employee_id,
            work_date: dayDate,
            day_type: 'Leave',
            leave_request_id: request.id,
            pay_band: currentDayPayBand,
            exception_codes: [],
            review_status: 'Open',
          },
          update: {
            day_type: 'Leave',
            leave_request_id: request.id,
            pay_band: currentDayPayBand,
          },
        });

        dayIndex++;
        cur.setUTCDate(cur.getUTCDate() + 1);
      }

      const updated = await prisma.$base().leave_requests.update({
        where: { id },
        data: { status: 'Approved', updated_by: sanitizeUuid(userId) },
      });

      await auditService.record({
        companyId,
        userId,
        action: 'UPDATE',
        tableName: 'leave_requests',
        recordId: id,
        oldValues: { status: request.status },
        newValues: { status: 'Approved', comment },
      });

      return updated;
    }

    return request;
  }
}

export default new LeaveService();
