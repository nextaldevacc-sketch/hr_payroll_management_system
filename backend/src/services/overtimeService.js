import Decimal from 'decimal.js';
import prisma from '../prisma/client.js';
import auditService from './auditService.js';
import { toDubaiDateString } from '@nextal/shared';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function sanitizeUuid(val) {
  return typeof val === 'string' && UUID_REGEX.test(val) ? val : null;
}

class OvertimeService {
  /**
   * List Overtime Requests with filtering
   */
  async listOvertimeRequests({ companyId, month, status, departmentId, employeeId }) {
    const where = { company_id: companyId };
    if (status) where.status = status;
    if (employeeId) where.employee_id = employeeId;

    if (month) {
      const [y, m] = month.split('-').map(Number);
      const start = new Date(Date.UTC(y, m - 1, 1));
      const end = new Date(Date.UTC(y, m, 0, 23, 59, 59));
      where.work_date = { gte: start, lte: end };
    }

    if (departmentId) {
      where.employee = { contracts: { some: { department_id: departmentId } } };
    }

    return prisma.$base().overtime_requests.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            arabic_name: true,
            employee_code: true,
            contracts: {
              take: 1,
              orderBy: { effective_date: 'desc' },
              select: {
                department: { select: { id: true, name: true } },
                basic: true,
              },
            },
          },
        },
      },
      orderBy: { work_date: 'desc' },
    });
  }

  /**
   * Submit an Overtime Request (self-service or HR)
   */
  async requestOvertime({ companyId, employeeId, data, userId }) {
    const { work_date, hours, ot_type, reason, compensation = 'Pay' } = data;
    const hoursNum = Number(hours);

    if (!work_date || !hours || hoursNum <= 0) {
      const err = new Error('Valid work date and positive hours required');
      err.status = 400;
      err.code = 'INVALID_HOURS';
      throw err;
    }

    // Check employee eligibility and active contract
    const contract = await prisma.$base().contracts.findFirst({
      where: {
        company_id: companyId,
        employee_id: employeeId,
        effective_date: { lte: new Date(work_date) },
      },
      include: { attendance_policy: true },
      orderBy: { effective_date: 'desc' },
    });

    if (!contract) {
      const err = new Error('No active contract found for this employee');
      err.status = 400;
      throw err;
    }

    if (contract.attendance_policy && contract.attendance_policy.ot_eligible === false) {
      const err = new Error('Employee attendance policy does not allow overtime');
      err.status = 400;
      err.code = 'NOT_OT_ELIGIBLE';
      throw err;
    }

    const hourlyRate = contract.basic.toNumber() / 30 / 8;
    const multiplier = ot_type === 'OT_NORMAL' ? 1.25 : 1.5;
    const rate = compensation === 'SubstituteDay' ? 0 : hourlyRate * multiplier;

    return prisma.$base().overtime_requests.create({
      data: {
        company_id: companyId,
        employee_id: employeeId,
        work_date: new Date(work_date),
        hours: new Decimal(hoursNum),
        ot_type: ot_type || 'OT_NORMAL',
        rate: new Decimal(rate.toFixed(4)),
        compensation,
        source: 'ManualRequest',
        status: 'Pending',
        created_by: sanitizeUuid(userId),
      },
    });
  }

  /**
   * Approve or Refuse an Overtime Request
   */
  async actOnOvertime({ companyId, id, action, otType, compensation, userId, userRoles = [], comment }) {
    const ot = await prisma.$base().overtime_requests.findFirst({
      where: { id, company_id: companyId },
      include: {
        employee: {
          select: { id: true, user: { select: { id: true } } },
        },
      },
    });

    if (!ot) {
      const err = new Error('Overtime request not found');
      err.status = 404;
      throw err;
    }

    // Section 5.3 Rule: "Nobody approves their own request"
    if (ot.employee?.user?.id === userId) {
      const err = new Error('Self-approval forbidden: Cannot approve your own overtime request');
      err.status = 403;
      err.code = 'SELF_APPROVAL_FORBIDDEN';
      throw err;
    }

    if (action === 'Refuse') {
      const updated = await prisma.$base().overtime_requests.update({
        where: { id },
        data: {
          status: 'Refused',
          updated_by: sanitizeUuid(userId),
        },
      });

      await auditService.record({
        companyId,
        userId,
        action: 'UPDATE',
        tableName: 'overtime_requests',
        recordId: id,
        oldValues: { status: ot.status },
        newValues: { status: 'Refused', comment },
      });

      return updated;
    }

    // Approved: allow manager to specify ot_type or give substitute day
    const contract = await prisma.$base().contracts.findFirst({
      where: {
        company_id: companyId,
        employee_id: ot.employee_id,
        effective_date: { lte: ot.work_date },
      },
      orderBy: { effective_date: 'desc' },
    });

    const basic = contract ? contract.basic.toNumber() : 5000;
    const hourlyRate = basic / 30 / 8;
    const chosenType = otType || ot.ot_type || 'OT_NORMAL';
    const chosenCompensation = compensation || ot.compensation || 'Pay';

    const multiplier = chosenType === 'OT_NORMAL' ? 1.25 : 1.5;
    const rate = chosenCompensation === 'SubstituteDay' ? 0 : hourlyRate * multiplier;

    const updated = await prisma.$base().overtime_requests.update({
      where: { id },
      data: {
        status: 'Approved',
        ot_type: chosenType,
        compensation: chosenCompensation,
        rate: new Decimal(rate.toFixed(4)),
        updated_by: sanitizeUuid(userId),
      },
    });

    await auditService.record({
      companyId,
      userId,
      action: 'UPDATE',
      tableName: 'overtime_requests',
      recordId: id,
      oldValues: { status: ot.status, rate: ot.rate, compensation: ot.compensation },
      newValues: { status: 'Approved', ot_type: chosenType, compensation: chosenCompensation, rate },
    });

    return updated;
  }

  /**
   * Bulk Approve Overtime Requests for Managers
   */
  async bulkApprove({ companyId, ids, userId }) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      const err = new Error('No overtime request IDs provided');
      err.status = 400;
      throw err;
    }

    let approvedCount = 0;
    for (const id of ids) {
      try {
        await this.actOnOvertime({
          companyId,
          id,
          action: 'Approve',
          userId,
        });
        approvedCount++;
      } catch (e) {
        // Skip any failing single records (e.g. self-approvals)
      }
    }

    return { approved_count: approvedCount };
  }
}

export default new OvertimeService();
