import Decimal from 'decimal.js';
import prisma from '../lib/prisma.js';
import auditService from './auditService.js';
import approvalService from './approvalService.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

function toUuidOrNull(val) {
  if (!val || typeof val !== 'string') return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ? val : null;
}

export class SalaryAdjustmentService {
  constructor(client = prisma) {
    this.prisma = client;
  }

  /**
   * List salary adjustments with filtering
   */
  async listAdjustments(companyId, { employeeId, type, status, limit = 50, offset = 0 } = {}) {
    const where = { company_id: companyId };
    if (employeeId) where.employee_id = employeeId;
    if (type) where.type = type;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.$base().salary_adjustments.findMany({
        where,
        include: {
          employee: {
            select: { id: true, name: true, employee_code: true, arabic_name: true },
          },
          corrects_payslip: {
            select: { id: true, period_from: true, period_to: true, net: true },
          },
        },
        orderBy: { created_at: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      this.prisma.$base().salary_adjustments.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Create a salary adjustment (Loan, Advance, or Correction)
   */
  async createAdjustment(companyId, data, userId) {
    const {
      employee_id,
      type, // 'Loan', 'Advance', 'Correction', 'Bonus', 'Penalty'
      total_amount,
      monthly_amount,
      start_month,
      reason,
      corrects_payslip_id,
      auto_approve = false,
    } = data;

    if (!employee_id || !type || !total_amount) {
      const err = new Error('employee_id, type, and total_amount are mandatory');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const emp = await this.prisma.$base().employees.findFirst({
      where: { id: employee_id, company_id: companyId },
    });
    if (!emp) {
      const err = new Error('Employee not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const totalDec = new Decimal(total_amount);
    const monthlyDec = monthly_amount ? new Decimal(monthly_amount) : totalDec;

    if (totalDec.lessThanOrEqualTo(0) || monthlyDec.lessThanOrEqualTo(0)) {
      const err = new Error('Adjustment amounts must be positive');
      err.status = 400;
      err.code = 'INVALID_AMOUNT';
      throw err;
    }

    // Verify corrects_payslip if specified
    if (corrects_payslip_id) {
      const payslip = await this.prisma.$base().payslips.findFirst({
        where: { id: corrects_payslip_id, company_id: companyId },
      });
      if (!payslip) {
        const err = new Error('Referenced payslip not found');
        err.status = 404;
        err.code = 'PAYSLIP_NOT_FOUND';
        throw err;
      }
    }

    const initialStatus = auto_approve ? 'Approved' : 'Pending';

    const adjustment = await this.prisma.$base().salary_adjustments.create({
      data: {
        company_id: companyId,
        employee_id,
        type,
        total_amount: totalDec,
        monthly_amount: monthlyDec,
        start_month: new Date(start_month || new Date()),
        balance: totalDec,
        reason: reason || null,
        corrects_payslip_id: corrects_payslip_id || null,
        status: initialStatus,
        created_by: toUuidOrNull(userId),
      },
    });

    await auditService.log({
      companyId,
      userId,
      action: 'ADJUSTMENT_CREATE',
      tableName: 'salary_adjustments',
      recordId: adjustment.id,
      newValues: {
        employee_id,
        type,
        total_amount: totalDec.toNumber(),
        monthly_amount: monthlyDec.toNumber(),
        status: initialStatus,
      },
    });

    return adjustment;
  }

  /**
   * Approve a salary adjustment
   */
  async approveAdjustment(companyId, id, userId) {
    const adj = await this.prisma.$base().salary_adjustments.findFirst({
      where: { id, company_id: companyId },
    });
    if (!adj) {
      const err = new Error('Salary adjustment not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (adj.status !== 'Pending') {
      const err = new Error(`Cannot approve adjustment with status '${adj.status}'`);
      err.status = 400;
      err.code = 'INVALID_STATUS';
      throw err;
    }

    const updated = await this.prisma.$base().salary_adjustments.update({
      where: { id },
      data: {
        status: 'Approved',
        updated_by: toUuidOrNull(userId),
      },
    });

    await auditService.log({
      companyId,
      userId,
      action: 'ADJUSTMENT_APPROVE',
      tableName: 'salary_adjustments',
      recordId: id,
      oldValues: { status: 'Pending' },
      newValues: { status: 'Approved' },
    });

    return updated;
  }

  /**
   * Reject a salary adjustment
   */
  async rejectAdjustment(companyId, id, reason, userId) {
    const adj = await this.prisma.$base().salary_adjustments.findFirst({
      where: { id, company_id: companyId },
    });
    if (!adj) {
      const err = new Error('Salary adjustment not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const updated = await this.prisma.$base().salary_adjustments.update({
      where: { id },
      data: {
        status: 'Rejected',
        reason: reason ? `${adj.reason || ''} [Rejected: ${reason}]`.trim() : adj.reason,
        updated_by: toUuidOrNull(userId),
      },
    });

    await auditService.log({
      companyId,
      userId,
      action: 'ADJUSTMENT_REJECT',
      tableName: 'salary_adjustments',
      recordId: id,
      newValues: { status: 'Rejected', rejection_reason: reason },
    });

    return updated;
  }
}

export default new SalaryAdjustmentService();
