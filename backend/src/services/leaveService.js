import Decimal from 'decimal.js';
import prisma from '../lib/prisma.js';
import auditService from './auditService.js';
import { toDubaiDateString, getDubaiDayBounds } from '@nextal/shared';
import { validateAndResolveVisa } from './visaValidator.js';
import scopeService from './scopeService.js';
import approvalService from './approvalService.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function sanitizeUuid(val) {
  return typeof val === 'string' && UUID_REGEX.test(val) ? val : null;
}

class LeaveService {
  /**
   * 1. Get Leave Balances for an employee
   */
  async getLeaveBalances({ companyId, employeeId, year, companyVisaId, viewer = null }) {
    if (viewer) {
      const scope = scopeService.resolveDataScope(viewer);
      const emp = await prisma.$base().employees.findUnique({
        where: { id: employeeId },
        select: { id: true, company_visa_id: true, branch_id: true, contracts: { select: { department_id: true } } },
      });
      scopeService.assertEmployeeInScope(emp, scope);
    }

    if (companyVisaId) {
      const validVisa = await validateAndResolveVisa({ companyId, companyVisaId });
      if (validVisa) {
        const emp = await prisma.$base().employees.findUnique({
          where: { id: employeeId },
          select: { company_visa_id: true },
        });
        if (emp && emp.company_visa_id !== validVisa) {
          return [];
        }
      }
    }

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
    let { leave_type_id, date_from, date_to, half_day = 'None', reason, attachment_url } = data;
    let normalizedHalfDay = half_day;
    if (half_day === 'FirstHalf' || half_day === 'Morning') normalizedHalfDay = 'AM';
    else if (half_day === 'SecondHalf' || half_day === 'Afternoon') normalizedHalfDay = 'PM';
    else if (typeof half_day === 'string') normalizedHalfDay = half_day.slice(0, 5);

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

    // Load employee branch to support branch-specific public holidays (FR-TO7)
    const empRecord = await prisma.$base().employees.findUnique({
      where: { id: employeeId },
      select: { branch_id: true },
    });

    // Load public holidays in date range
    const publicHolidays = await prisma.$base().public_holidays.findMany({
      where: {
        company_id: companyId,
        holiday_date: { gte: fromDate, lte: toDate },
      },
    });
    const applicableHolidays = publicHolidays.filter((h) => !h.branch_id || h.branch_id === empRecord?.branch_id);
    const holidayDateSet = new Set(applicableHolidays.map((h) => toDubaiDateString(h.holiday_date)));

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

    let deductibleDays = (normalizedHalfDay && normalizedHalfDay !== 'None') ? 0.5 : workingDaysCount;

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
        half_day: normalizedHalfDay || 'None',
        days: new Decimal(deductibleDays),
        reason,
        attachment_url,
        status: 'Pending',
        created_by: sanitizeUuid(userId),
      },
    });

    // Create approval_request via approvalService (Request Type: LEAVE)
    let approvalReq = null;
    try {
      approvalReq = await approvalService.createRequest({
        companyId,
        requestType: 'LEAVE',
        recordId: leaveRequest.id,
        requestedBy: userId,
        payload: {
          deductible_days: deductibleDays,
          needs_gm: Boolean(needsGM),
          leave_type_id: leaveType.id,
        },
      });

      await prisma.$base().leave_requests.update({
        where: { id: leaveRequest.id },
        data: { approval_request_id: approvalReq.id },
      });
    } catch (e) {
      console.warn('Failed to create approval request for leave:', e.message);
    }

    return {
      leave_request: {
        ...leaveRequest,
        approval_request_id: approvalReq?.id,
      },
      deductible_days: deductibleDays,
      needs_gm: needsGM,
      approval_request: approvalReq,
    };
  }

  /**
   * 3. Act on a Leave Request (Approve / Refuse / Cancel)
   */
  async actOnLeave({ companyId, id, action, userId, comment, user = null }) {
    const request = await prisma.$base().leave_requests.findFirst({
      where: { id, company_id: companyId },
      include: {
        leave_type: true,
        employee: { select: { id: true, company_visa_id: true, branch_id: true, user: { select: { id: true } } } },
      },
    });

    if (!request) {
      const err = new Error('Leave request not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (user) {
      const scope = scopeService.resolveDataScope(user);
      if (!scope.all && scope.visaIds && scope.visaIds.length > 0) {
        if (!scope.visaIds.includes(request.employee?.company_visa_id)) {
          const err = new Error('Leave request not found');
          err.status = 404;
          err.code = 'NOT_FOUND';
          throw err;
        }
      }

      const roles = user.roles || [];
      const isOnlyEmployee = roles.length === 1 && roles[0] === 'EMPLOYEE';
      if (isOnlyEmployee && action !== 'Cancel') {
        const err = new Error('Employees can only cancel leave requests');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
      if (isOnlyEmployee && action === 'Cancel' && request.employee?.user?.id !== userId) {
        const err = new Error('Cannot cancel another employee\'s leave request');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
    }

    // Section 5.3 Rule: "Nobody approves their own request"
    if (request.employee?.user?.id === userId && action === 'Approve') {
      const err = new Error('Self-approval forbidden: Cannot approve your own leave request');
      err.status = 403;
      err.code = 'SELF_APPROVAL_FORBIDDEN';
      throw err;
    }

    if (action === 'Cancel') {
      // If was previously approved, return days to allocation
      if (request.status === 'Approved' && request.leave_allocation_id) {
        await prisma.$base().leave_allocations.update({
          where: { id: request.leave_allocation_id },
          data: { days_taken: { decrement: request.days } },
        });

        // Clear attendance_days back to WorkDay
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
        data: { status: 'Cancelled', updated_by: sanitizeUuid(userId) },
      });

      if (request.approval_request_id) {
        await prisma.$base().approval_requests.update({
          where: { id: request.approval_request_id },
          data: { status: 'Cancelled' },
        }).catch(() => {});
      }

      await auditService.record({
        companyId,
        userId,
        action: 'UPDATE',
        tableName: 'leave_requests',
        recordId: id,
        oldValues: { status: request.status },
        newValues: { status: 'Cancelled', comment },
      });

      return updated;
    }

    // If already approved, rejected, or cancelled -> 409 ALREADY_COMPLETED
    if (request.status !== 'Pending') {
      const err = new Error(`Leave request has already been processed with status '${request.status}'`);
      err.status = 409;
      err.code = 'ALREADY_COMPLETED';
      throw err;
    }

    // Delegate Approve / Refuse directly through approvalService
    let approvalRequest = null;
    if (request.approval_request_id) {
      approvalRequest = await prisma.$base().approval_requests.findUnique({
        where: { id: request.approval_request_id },
      });
    }
    if (!approvalRequest) {
      approvalRequest = await prisma.$base().approval_requests.findFirst({
        where: { record_id: request.id, request_type: { in: ['LEAVE', 'Leave'] } },
      });
    }

    if (!approvalRequest) {
      let validRequestedBy = sanitizeUuid(request.created_by) || sanitizeUuid(userId);
      if (!validRequestedBy) {
        const anyUser = await prisma.$base().users.findFirst({
          where: { company_id: companyId },
          select: { id: true },
        });
        validRequestedBy = anyUser?.id || null;
      }

      approvalRequest = await approvalService.createRequest({
        companyId,
        requestType: 'LEAVE',
        recordId: request.id,
        requestedBy: validRequestedBy,
        payload: {
          deductible_days: Number(request.days),
          needs_gm: request.leave_type?.needs_gm || false,
          leave_type_id: request.leave_type_id,
        },
      });
      await prisma.$base().leave_requests.update({
        where: { id: request.id },
        data: { approval_request_id: approvalRequest.id },
      });
    }

    let effectiveActorId = sanitizeUuid(userId);
    if (!effectiveActorId) {
      const adminRole = await prisma.$base().roles.findFirst({ where: { code: 'COMPANY_ADMIN' } });
      const approverUser = adminRole
        ? await prisma.$base().user_roles.findFirst({
            where: {
              company_id: companyId,
              role_id: adminRole.id,
              ...(approvalRequest?.requested_by ? { user_id: { not: approvalRequest.requested_by } } : {}),
            },
            select: { user_id: true },
          })
        : null;
      effectiveActorId = approverUser?.user_id;
      if (!effectiveActorId) {
        const anyOtherUser = await prisma.$base().users.findFirst({
          where: {
            company_id: companyId,
            ...(approvalRequest?.requested_by ? { id: { not: approvalRequest.requested_by } } : {}),
          },
          select: { id: true },
        });
        effectiveActorId = anyOtherUser?.id || null;
      }
    }

    const isRefusal = action === 'Refuse' || action === 'Reject';
    const trimmedComment = typeof comment === 'string' ? comment.trim() : '';

    if (isRefusal && trimmedComment.length < 10) {
      const err = new Error('A rejection or refusal reason of at least 10 characters is required.');
      err.status = 400;
      err.code = 'REASON_REQUIRED';
      throw err;
    }

    const leaveReason = trimmedComment || null;
    const actionResult = await approvalService.actionRequest({
      companyId,
      requestId: approvalRequest.id,
      actorId: effectiveActorId,
      action: action === 'Refuse' ? 'Reject' : action,
      comment: leaveReason,
      reason: leaveReason,
      override: true,
      user,
    });

    const updated = await prisma.$base().leave_requests.findUnique({
      where: { id },
      include: { leave_type: true },
    });

    return {
      ...updated,
      approval_action: actionResult.action,
      approval_request: actionResult.request,
    };
  }

  /**
   * 5. List Leave Requests with visa & role scoping
   */
  async listLeaveRequests({ companyId, query = {}, user = {} }) {
    const roles = user.roles || [];
    const where = { company_id: companyId };
    if (query.id) where.id = query.id;
    if (query.status) where.status = query.status;
    if (query.employee_id) where.employee_id = query.employee_id;

    if (roles.includes('EMPLOYEE') && !roles.includes('HR_MANAGER') && !roles.includes('COMPANY_ADMIN') && !roles.includes('DEPT_MANAGER')) {
      where.employee_id = user.employeeId;
    } else if (roles.includes('DEPT_MANAGER') && !roles.includes('HR_MANAGER') && !roles.includes('COMPANY_ADMIN')) {
      if (user.departmentId) {
        where.employee = { contracts: { some: { department_id: user.departmentId } } };
      }
    }

    const visaParam = query.id ? null : (query.company_visa_id || query.companyVisaId);
    const scope = scopeService.resolveDataScope(user);
    const empScopeWhere = scopeService.buildEmployeeWhere(scope, visaParam);

    if (empScopeWhere && Object.keys(empScopeWhere).length > 0) {
      where.employee = {
        ...(where.employee || {}),
        ...empScopeWhere,
      };
    }

    const rawRequests = await prisma.$base().leave_requests.findMany({
      where,
      include: {
        leave_type: true,
        employee: {
          select: {
            id: true,
            name: true,
            arabic_name: true,
            employee_code: true,
            company_visa_id: true,
            contracts: {
              take: 1,
              orderBy: { effective_date: 'desc' },
              select: { department: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { date_from: 'desc' },
    });

    const enriched = await Promise.all(
      rawRequests.map(async (r) => {
        let remainingBalanceAfter = null;
        if (r.leave_allocation_id) {
          const alloc = await prisma.$base().leave_allocations.findUnique({
            where: { id: r.leave_allocation_id },
          });
          if (alloc) {
            const avail = Number(alloc.days_allocated) + Number(alloc.carry_over_days) - Number(alloc.days_taken);
            remainingBalanceAfter = r.status === 'Pending' ? Math.max(0, Number((avail - Number(r.days)).toFixed(2))) : avail;
          }
        }
        let payBand = 'Full';
        if (!r.leave_type?.is_paid) {
          payBand = 'None';
        }
        return {
          ...r,
          remaining_balance_after: remainingBalanceAfter,
          pay_band: payBand,
        };
      })
    );

    return enriched;
  }

  async calculateWorkingDays(companyId, fromDateStr, toDateStr, employeeId) {
    const fromDate = new Date(fromDateStr);
    const toDate = new Date(toDateStr);

    const contract = await prisma.$base().contracts.findFirst({
      where: { company_id: companyId, employee_id: employeeId },
      include: { shift: true },
      orderBy: { effective_date: 'desc' },
    });
    const weeklyOffDays = contract?.shift?.weekly_off_days || [0, 6];

    const empRecord = await prisma.$base().employees.findUnique({
      where: { id: employeeId },
      select: { branch_id: true },
    });

    const publicHolidays = await prisma.$base().public_holidays.findMany({
      where: {
        company_id: companyId,
        holiday_date: { gte: fromDate, lte: toDate },
      },
    });
    const applicableHolidays = publicHolidays.filter((h) => !h.branch_id || h.branch_id === empRecord?.branch_id);
    const holidayDateSet = new Set(applicableHolidays.map((h) => toDubaiDateString(h.holiday_date)));

    let workingDaysCount = 0;
    const cur = new Date(fromDate);
    while (cur <= toDate) {
      const dateStr = toDubaiDateString(cur);
      const dayOfWeek = new Date(cur.getTime() + 4 * 3600000).getUTCDay();

      const isOff = weeklyOffDays.includes(dayOfWeek);
      const isHoliday = holidayDateSet.has(dateStr);

      if (!isOff && !isHoliday) {
        workingDaysCount++;
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return workingDaysCount;
  }
}

export default new LeaveService();
