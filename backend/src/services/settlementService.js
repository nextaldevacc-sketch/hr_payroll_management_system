import Decimal from 'decimal.js';
import puppeteer from 'puppeteer';
import ExcelJS from 'exceljs';
import prisma from '../lib/prisma.js';
import auditService from './auditService.js';
import { roundToCurrency, formatCurrency } from '@nextal/shared';
import notificationService from './notificationService.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export class SettlementService {
  constructor(client = prisma) {
    if (client && typeof client.$base !== 'function') {
      this.prisma = Object.create(client, {
        $base: { value: () => client, writable: true, configurable: true },
        $scoped: { value: () => client, writable: true, configurable: true },
      });
    } else {
      this.prisma = client;
    }
  }

  /**
   * Calculate final settlement figures (preview or calculation)
   */
  async calculateSettlement(companyId, separationId, options = {}) {
    const separation = await this.prisma.$base().separations.findFirst({
      where: { id: separationId, company_id: companyId },
      include: {
        employee: {
          include: {
            contracts: {
              where: { status: { in: ['Approved', 'Active'] } },
              orderBy: { effective_date: 'desc' },
            },
            bank_accounts: { where: { is_active: true } },
            leave_allocations: {
              include: { leave_type: true },
            },
          },
        },
        clearance_items: true,
      },
    });

    if (!separation) {
      const err = new Error('Separation not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const { employee } = separation;
    const contract = employee.contracts[0];

    if (!contract) {
      const err = new Error('Employee has no active contract for final settlement');
      err.status = 400;
      err.code = 'NO_CONTRACT';
      throw err;
    }

    const basicSalary = new Decimal(options.basicSalary !== undefined ? options.basicSalary : contract.basic);
    const grossSalary = new Decimal(options.grossSalary !== undefined ? options.grossSalary : contract.gross);
    const lastWorkingDay = new Date(options.lastWorkingDay || separation.last_working_day);
    const joiningDate = new Date(options.joiningDate || employee.joining_date);

    // 1. Service period calculation
    const diffMs = lastWorkingDay.getTime() - joiningDate.getTime();
    const rawCalendarDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);

    // Fetch unpaid absence days to exclude from service period
    const unpaidAbsenceCount = await this.prisma.$base().attendance_days.count({
      where: {
        company_id: companyId,
        employee_id: employee.id,
        day_type: { in: ['Absence', 'UnpaidLeave'] },
      },
    });

    const netServiceDays = Math.max(0, rawCalendarDays - unpaidAbsenceCount);
    const serviceYears = options.serviceYears !== undefined
      ? new Decimal(options.serviceYears)
      : new Decimal(netServiceDays).dividedBy(365);

    // 2. Gratuity Calculation (Section 8.2 & UAE Labour Law Article 51)
    // Daily wage = basic * 12 / 365
    const basicDailyWage = basicSalary.times(12).dividedBy(365);
    let gratuityDays = new Decimal(0);
    let gratuityAmount = new Decimal(0);
    let gratuityStep1Days = new Decimal(0);
    let gratuityStep2Days = new Decimal(0);

    if (serviceYears.greaterThanOrEqualTo(1)) {
      if (serviceYears.lessThanOrEqualTo(5)) {
        gratuityStep1Days = serviceYears.times(21);
        gratuityDays = gratuityStep1Days;
      } else {
        gratuityStep1Days = new Decimal(5).times(21); // 105 days
        const remainingYears = serviceYears.minus(5);
        gratuityStep2Days = remainingYears.times(30);
        gratuityDays = gratuityStep1Days.plus(gratuityStep2Days);
      }
      const rawGratuity = basicDailyWage.times(gratuityDays);

      // Cap: 2 years' wage (default: basic * 24)
      const capBasis = options.capBasis || 'Basic';
      const capWage = capBasis === 'Gross' ? grossSalary : basicSalary;
      const maxCap = capWage.times(24);

      gratuityAmount = roundToCurrency(Decimal.min(rawGratuity, maxCap));
    }

    // 3. Unused Leave Encashment (Section 8.2 & Article 29)
    // Leave encashment = unused annual days * basic daily wage
    let unusedLeaveDays = new Decimal(0);
    if (options.unusedLeaveDays !== undefined) {
      unusedLeaveDays = new Decimal(options.unusedLeaveDays);
    } else {
      const annualAlloc = employee.leave_allocations.find((a) =>
        a.leave_type?.code === 'ANNUAL' || a.leave_type?.name?.toLowerCase().includes('annual')
      );
      if (annualAlloc) {
        const allocated = new Decimal(annualAlloc.days_allocated || 0).plus(new Decimal(annualAlloc.carry_over_days || 0));
        const taken = new Decimal(annualAlloc.days_taken || 0);
        unusedLeaveDays = Decimal.max(0, allocated.minus(taken));
      }
    }
    const leaveEncashmentAmount = roundToCurrency(basicDailyWage.times(unusedLeaveDays));

    // 4. Pro-rated Salary to Last Day
    // Salary to the last working day within its month
    const lYear = lastWorkingDay.getUTCFullYear();
    const lMonth = lastWorkingDay.getUTCMonth();
    const monthDays = new Date(Date.UTC(lYear, lMonth + 1, 0)).getUTCDate();
    const workedDaysInLastMonth = Math.min(monthDays, lastWorkingDay.getUTCDate());

    let salaryDue = new Decimal(0);
    if (options.salaryDue !== undefined) {
      salaryDue = new Decimal(options.salaryDue);
    } else {
      // Pro-rated gross salary for days worked in departure month
      salaryDue = roundToCurrency(grossSalary.times(workedDaysInLastMonth).dividedBy(monthDays));
    }

    // 5. Notice Shortfall Recovery
    // shortfall days * basic daily wage (or per contract policy)
    const shortfallDays = options.shortfallDays !== undefined
      ? Number(options.shortfallDays)
      : Number(separation.notice_shortfall_days || 0);
    const noticeRecovery = roundToCurrency(basicDailyWage.times(shortfallDays));

    // 6. Outstanding Loans / Advances
    let loanBalance = new Decimal(0);
    if (options.loanRecovery !== undefined) {
      loanBalance = new Decimal(options.loanRecovery);
    } else {
      const activeLoans = await this.prisma.$base().salary_adjustments.findMany({
        where: {
          company_id: companyId,
          employee_id: employee.id,
          status: { in: ['Approved', 'Active'] },
          balance: { gt: 0 },
        },
      });
      for (const l of activeLoans) {
        loanBalance = loanBalance.plus(new Decimal(l.balance));
      }
      loanBalance = roundToCurrency(loanBalance);
    }

    // 7. Training Cost & Other Recoveries
    const trainingRecovery = roundToCurrency(new Decimal(options.trainingRecovery !== undefined ? options.trainingRecovery : (contract.training_cost || 0)));

    // 8. Clearance Checklist Recoveries
    let clearanceRecovery = new Decimal(0);
    if (options.clearanceRecovery !== undefined) {
      clearanceRecovery = new Decimal(options.clearanceRecovery);
    } else {
      for (const item of separation.clearance_items) {
        if (Number(item.amount_due) > 0) {
          clearanceRecovery = clearanceRecovery.plus(new Decimal(item.amount_due));
        }
      }
      clearanceRecovery = roundToCurrency(clearanceRecovery);
    }

    const otherRecovery = roundToCurrency(new Decimal(options.otherRecovery || 0));

    // Total Earnings & Deductions
    const totalDues = salaryDue.plus(gratuityAmount).plus(leaveEncashmentAmount);
    const totalRecoveries = noticeRecovery
      .plus(loanBalance)
      .plus(trainingRecovery)
      .plus(clearanceRecovery)
      .plus(otherRecovery);

    const netPayable = roundToCurrency(totalDues.minus(totalRecoveries));

    const workingDetails = {
      basic_salary: basicSalary.toNumber(),
      gross_salary: grossSalary.toNumber(),
      basic_daily_wage: basicDailyWage.toNumber(),
      joining_date: joiningDate.toISOString().slice(0, 10),
      last_working_day: lastWorkingDay.toISOString().slice(0, 10),
      raw_calendar_days: rawCalendarDays,
      unpaid_absence_days: unpaidAbsenceCount,
      net_service_days: netServiceDays,
      service_years: serviceYears.toNumber(),
      service_period_text: `${serviceYears.toFixed(2)} years (${netServiceDays} days)`,
      gratuity_working: {
        step1_days_up_to_5y: gratuityStep1Days.toNumber(),
        step2_days_over_5y: gratuityStep2Days.toNumber(),
        total_gratuity_days: gratuityDays.toNumber(),
        raw_gratuity: basicDailyWage.times(gratuityDays).toNumber(),
        cap_amount: basicSalary.times(24).toNumber(),
        final_gratuity: gratuityAmount.toNumber(),
      },
      leave_encashment_working: {
        unused_days: unusedLeaveDays.toNumber(),
        daily_rate: basicDailyWage.toNumber(),
        final_encashment: leaveEncashmentAmount.toNumber(),
      },
      salary_due_working: {
        departure_month_days: monthDays,
        days_worked: workedDaysInLastMonth,
        gross: grossSalary.toNumber(),
        final_salary_due: salaryDue.toNumber(),
      },
      recoveries: {
        notice_shortfall_days: shortfallDays,
        notice_recovery: noticeRecovery.toNumber(),
        loan_balance: loanBalance.toNumber(),
        training_recovery: trainingRecovery.toNumber(),
        clearance_recovery: clearanceRecovery.toNumber(),
        other_recovery: otherRecovery.toNumber(),
        total_recoveries: totalRecoveries.toNumber(),
      },
      total_dues: totalDues.toNumber(),
      total_recoveries: totalRecoveries.toNumber(),
      net_payable: netPayable.toNumber(),
      is_negative_net: netPayable.lessThan(0),
    };

    return {
      separation_id: separationId,
      salary_due: salaryDue.toNumber(),
      gratuity: gratuityAmount.toNumber(),
      leave_encashment_days: unusedLeaveDays.toNumber(),
      leave_encashment: leaveEncashmentAmount.toNumber(),
      notice_recovery: noticeRecovery.toNumber(),
      loan_recovery: loanBalance.toNumber(),
      training_recovery: trainingRecovery.toNumber(),
      clearance_recovery: clearanceRecovery.toNumber(),
      other_recovery: otherRecovery.toNumber(),
      net_payable: netPayable.toNumber(),
      snapshot: workingDetails,
    };
  }

  /**
   * Prepare Final Settlement (by Payroll Officer)
   */
  async prepareSettlement(companyId, separationId, options = {}, userId) {
    const calc = await this.calculateSettlement(companyId, separationId, options);

    const existing = await this.prisma.$base().final_settlements.findUnique({
      where: { separation_id: separationId },
    });

    if (existing && ['Approved', 'Paid'].includes(existing.status)) {
      const err = new Error(`Cannot re-prepare final settlement in '${existing.status}' status. It is frozen.`);
      err.status = 400;
      err.code = 'SETTLEMENT_FROZEN';
      throw err;
    }

    let settlement;
    if (existing) {
      settlement = await this.prisma.$base().final_settlements.update({
        where: { separation_id: separationId },
        data: {
          salary_due: new Decimal(calc.salary_due),
          gratuity: new Decimal(calc.gratuity),
          leave_encashment_days: new Decimal(calc.leave_encashment_days),
          leave_encashment: new Decimal(calc.leave_encashment),
          notice_recovery: new Decimal(calc.notice_recovery),
          loan_recovery: new Decimal(calc.loan_recovery),
          training_recovery: new Decimal(calc.training_recovery),
          clearance_recovery: new Decimal(calc.clearance_recovery),
          other_recovery: new Decimal(calc.other_recovery),
          net_payable: new Decimal(calc.net_payable),
          snapshot: calc.snapshot,
          status: 'Prepared',
          updated_by: userId,
        },
      });
    } else {
      settlement = await this.prisma.$base().final_settlements.create({
        data: {
          company_id: companyId,
          separation_id: separationId,
          salary_due: new Decimal(calc.salary_due),
          gratuity: new Decimal(calc.gratuity),
          leave_encashment_days: new Decimal(calc.leave_encashment_days),
          leave_encashment: new Decimal(calc.leave_encashment),
          notice_recovery: new Decimal(calc.notice_recovery),
          loan_recovery: new Decimal(calc.loan_recovery),
          training_recovery: new Decimal(calc.training_recovery),
          clearance_recovery: new Decimal(calc.clearance_recovery),
          other_recovery: new Decimal(calc.other_recovery),
          net_payable: new Decimal(calc.net_payable),
          snapshot: calc.snapshot,
          status: 'Prepared',
          created_by: userId,
        },
      });
    }

    await auditService.log({
      companyId,
      userId,
      action: 'PREPARE_FINAL_SETTLEMENT',
      tableName: 'final_settlements',
      recordId: settlement.id,
      newValues: {
        status: settlement.status,
        net_payable: settlement.net_payable,
      },
    }).catch(() => {});

    return settlement;
  }

  /**
   * Validate Final Settlement (by HR Manager)
   * T35: Settlement cannot be approved while any clearance item is open.
   */
  async validateSettlement(companyId, settlementId, userId) {
    const settlement = await this.prisma.$base().final_settlements.findFirst({
      where: { id: settlementId, company_id: companyId },
      include: {
        separation: {
          include: { clearance_items: true, employee: true },
        },
      },
    });

    if (!settlement) {
      const err = new Error('Final settlement not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (['Approved', 'Paid'].includes(settlement.status)) {
      const err = new Error(`Settlement is already in ${settlement.status} status.`);
      err.status = 400;
      err.code = 'SETTLEMENT_FROZEN';
      throw err;
    }

    // Segregation of duties: Preparer cannot validate their own preparation
    if (settlement.created_by === userId) {
      const err = new Error('Segregation of duties violation: You cannot validate a final settlement you prepared.');
      err.status = 403;
      err.code = 'SELF_VALIDATION_BLOCKED';
      throw err;
    }

    // T35: Verify all clearance items are cleared
    const unclearedItems = settlement.separation.clearance_items.filter(
      (c) => c.status !== 'Cleared'
    );
    if (unclearedItems.length > 0) {
      const err = new Error(
        `Settlement cannot be validated: ${unclearedItems.length} clearance item(s) are still pending (${unclearedItems.map((i) => i.item).join(', ')})`
      );
      err.status = 400;
      err.code = 'CLEARANCE_ITEMS_PENDING';
      err.unclearedItems = unclearedItems;
      throw err;
    }

    const updated = await this.prisma.$base().final_settlements.update({
      where: { id: settlementId },
      data: {
        status: 'Validated',
        updated_by: userId,
      },
    });

    await auditService.log({
      companyId,
      userId,
      action: 'VALIDATE_FINAL_SETTLEMENT',
      tableName: 'final_settlements',
      recordId: settlementId,
      oldValues: { status: settlement.status },
      newValues: { status: 'Validated' },
    }).catch(() => {});

    return updated;
  }

  /**
   * Approve Final Settlement (by GM)
   * Freezes settlement in final_settlements; DB trigger enforces immutability.
   */
  async approveSettlement(companyId, settlementId, userId) {
    const settlement = await this.prisma.$base().final_settlements.findFirst({
      where: { id: settlementId, company_id: companyId },
      include: {
        separation: {
          include: { clearance_items: true, employee: true },
        },
      },
    });

    if (!settlement) {
      const err = new Error('Final settlement not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (settlement.status !== 'Validated') {
      const err = new Error(`Cannot approve settlement in '${settlement.status}' status. It must be Validated first.`);
      err.status = 400;
      err.code = 'INVALID_STATUS';
      throw err;
    }

    // Segregation of duties: Validator cannot approve their own validation
    if (settlement.updated_by === userId) {
      const err = new Error('Segregation of duties violation: You cannot approve a settlement you validated.');
      err.status = 403;
      err.code = 'SELF_APPROVAL_BLOCKED';
      throw err;
    }

    // T35: Double check clearance gate
    const unclearedItems = settlement.separation.clearance_items.filter((c) => c.status !== 'Cleared');
    if (unclearedItems.length > 0) {
      const err = new Error(`Settlement cannot be approved: clearance item(s) are still open.`);
      err.status = 400;
      err.code = 'CLEARANCE_ITEMS_PENDING';
      throw err;
    }

    // Re-verify calculations and freeze snapshot
    const currentCalc = await this.calculateSettlement(companyId, settlement.separation_id);

    const approved = await this.prisma.$base().final_settlements.update({
      where: { id: settlementId },
      data: {
        status: 'Approved',
        snapshot: currentCalc.snapshot,
        updated_by: userId,
      },
    });

    await auditService.log({
      companyId,
      userId,
      action: 'APPROVE_FINAL_SETTLEMENT',
      tableName: 'final_settlements',
      recordId: settlementId,
      oldValues: { status: settlement.status },
      newValues: { status: 'Approved' },
    }).catch(() => {});

    return approved;
  }

  /**
   * Mark Final Settlement as Paid (by Finance)
   */
  async markSettlementPaid(companyId, settlementId, userId) {
    const settlement = await this.prisma.$base().final_settlements.findFirst({
      where: { id: settlementId, company_id: companyId },
      include: { separation: { include: { employee: true } } },
    });

    if (!settlement) {
      const err = new Error('Final settlement not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (settlement.status !== 'Approved') {
      const err = new Error(`Cannot mark settlement as Paid in '${settlement.status}' status. It must be Approved first.`);
      err.status = 400;
      err.code = 'INVALID_STATUS';
      throw err;
    }

    const paid = await this.prisma.$base().final_settlements.update({
      where: { id: settlementId },
      data: {
        status: 'Paid',
        updated_by: userId,
      },
    });

    await auditService.log({
      companyId,
      userId,
      action: 'PAY_FINAL_SETTLEMENT',
      tableName: 'final_settlements',
      recordId: settlementId,
      oldValues: { status: 'Approved' },
      newValues: { status: 'Paid' },
    }).catch(() => {});

    return paid;
  }

  /**
   * Get Final Settlement by ID
   */
  async getSettlement(companyId, settlementId) {
    const settlement = await this.prisma.$base().final_settlements.findFirst({
      where: { id: settlementId, company_id: companyId },
      include: {
        separation: {
          include: {
            employee: {
              include: {
                contracts: {
                  include: { department: true, job: true },
                  orderBy: { effective_date: 'desc' },
                },
                company_visa: true,
              },
            },
            clearance_items: {
              include: { department: true, owner_user: true, clearer: true },
            },
          },
        },
      },
    });

    if (!settlement) {
      const err = new Error('Final settlement not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    return settlement;
  }

  /**
   * Get Final Settlement by Separation ID
   */
  async getSettlementBySeparationId(companyId, separationId) {
    const settlement = await this.prisma.$base().final_settlements.findFirst({
      where: { separation_id: separationId, company_id: companyId },
      include: {
        separation: {
          include: {
            employee: {
              include: {
                contracts: {
                  include: { department: true, job: true },
                  orderBy: { effective_date: 'desc' },
                },
                company_visa: true,
              },
            },
            clearance_items: {
              include: { department: true, owner_user: true, clearer: true },
            },
          },
        },
      },
    });

    return settlement || null;
  }

  /**
   * Generate Settlement Payslip PDF
   */
  async generateSettlementPdf(companyId, settlementId) {
    const settlement = await this.getSettlement(companyId, settlementId);
    const snap = settlement.snapshot || {};
    const emp = settlement.separation.employee;
    const contract = emp.contracts[0];

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Final Settlement Payslip - ${emp.name}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 40px; color: #1e293b; background: #fff; font-size: 13px; line-height: 1.5; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 25px; }
        .title { font-size: 24px; font-weight: 700; color: #0f172a; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-weight: 600; font-size: 11px; text-transform: uppercase; }
        .badge-approved { background: #dcfce7; color: #15803d; }
        .badge-paid { background: #e0e7ff; color: #4338ca; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
        .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
        .card-title { font-weight: 700; color: #475569; margin-bottom: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #f1f5f9; text-align: left; padding: 8px 12px; font-weight: 600; color: #475569; border-bottom: 1px solid #cbd5e1; font-size: 12px; }
        td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
        .text-right { text-align: right; }
        .total-row { font-weight: 700; background: #f8fafc; }
        .net-card { background: #0f172a; color: #fff; padding: 20px; border-radius: 8px; text-align: center; margin-top: 20px; }
        .net-amount { font-size: 28px; font-weight: 800; color: #38bdf8; }
        .signatures { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 40px; }
        .sign-box { border-top: 1px dashed #94a3b8; padding-top: 8px; text-align: center; font-size: 11px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="title">END OF SERVICE SETTLEMENT</div>
          <div style="color: #64748b; margin-top: 4px;">Nextal HR &amp; Payroll Management · Statutory UAE Settlement</div>
        </div>
        <div style="text-align: right;">
          <span class="badge ${settlement.status === 'Paid' ? 'badge-paid' : 'badge-approved'}">${settlement.status}</span>
          <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Ref: ${settlement.id.slice(0, 8)}</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-title">Employee Details</div>
          <div><strong>${emp.name}</strong> (${emp.employee_code})</div>
          <div>Arabic Name: ${emp.arabic_name || '—'}</div>
          <div>Department: ${contract?.department?.name || '—'}</div>
          <div>Job Title: ${contract?.job?.title || '—'}</div>
          <div>Residency: ${emp.residency_type} · Visa: ${emp.company_visa?.name || '—'}</div>
        </div>
        <div class="card">
          <div class="card-title">Service Period &amp; Contract</div>
          <div>Joining Date: <strong>${snap.joining_date || '—'}</strong></div>
          <div>Last Working Day: <strong>${snap.last_working_day || '—'}</strong></div>
          <div>Net Service Length: <strong>${snap.service_period_text || '—'}</strong></div>
          <div>Contract Basic: <strong>AED ${Number(contract?.basic || 0).toFixed(2)}</strong></div>
          <div>Contract Gross: <strong>AED ${Number(contract?.gross || 0).toFixed(2)}</strong></div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Component / Step Breakdown</th>
            <th>Basis &amp; Statutory Working</th>
            <th class="text-right">Earnings (AED)</th>
            <th class="text-right">Deductions (AED)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Salary to Last Day</strong></td>
            <td>${snap.salary_due_working?.days_worked || 0} worked days in departure month (÷ ${snap.salary_due_working?.departure_month_days || 30})</td>
            <td class="text-right">${Number(settlement.salary_due).toFixed(2)}</td>
            <td class="text-right">—</td>
          </tr>
          <tr>
            <td><strong>End of Service Gratuity</strong></td>
            <td>Article 51: 21d (1-5y) + 30d (>5y) @ Basic Daily AED ${Number(snap.basic_daily_wage || 0).toFixed(2)}</td>
            <td class="text-right">${Number(settlement.gratuity).toFixed(2)}</td>
            <td class="text-right">—</td>
          </tr>
          <tr>
            <td><strong>Annual Leave Encashment</strong></td>
            <td>${Number(settlement.leave_encashment_days).toFixed(2)} unused days × Basic Daily Wage</td>
            <td class="text-right">${Number(settlement.leave_encashment).toFixed(2)}</td>
            <td class="text-right">—</td>
          </tr>
          <tr>
            <td><strong>Notice Shortfall Recovery</strong></td>
            <td>${snap.recoveries?.notice_shortfall_days || 0} shortfall day(s) not served</td>
            <td class="text-right">—</td>
            <td class="text-right">${Number(settlement.notice_recovery).toFixed(2)}</td>
          </tr>
          <tr>
            <td><strong>Outstanding Loan / Advance Balance</strong></td>
            <td>Company loan &amp; salary advance settlement balance</td>
            <td class="text-right">—</td>
            <td class="text-right">${Number(settlement.loan_recovery).toFixed(2)}</td>
          </tr>
          <tr>
            <td><strong>Clearance Checklist Deductions</strong></td>
            <td>Damaged / missing physical assets from clearance checklist</td>
            <td class="text-right">—</td>
            <td class="text-right">${Number(settlement.clearance_recovery).toFixed(2)}</td>
          </tr>
          <tr>
            <td><strong>Training Cost / Other Recoveries</strong></td>
            <td>Contractual training amortisation recovery</td>
            <td class="text-right">—</td>
            <td class="text-right">${(Number(settlement.training_recovery) + Number(settlement.other_recovery)).toFixed(2)}</td>
          </tr>
          <tr class="total-row">
            <td colspan="2"><strong>Total Dues &amp; Recoveries</strong></td>
            <td class="text-right"><strong>AED ${(Number(settlement.salary_due) + Number(settlement.gratuity) + Number(settlement.leave_encashment)).toFixed(2)}</strong></td>
            <td class="text-right"><strong>AED ${(Number(settlement.notice_recovery) + Number(settlement.loan_recovery) + Number(settlement.clearance_recovery) + Number(settlement.training_recovery) + Number(settlement.other_recovery)).toFixed(2)}</strong></td>
          </tr>
        </tbody>
      </table>

      <div class="net-card">
        <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8;">Final Net Settlement Payable to WPS</div>
        <div class="net-amount">AED ${Number(settlement.net_payable).toFixed(2)}</div>
      </div>

      <div class="signatures">
        <div class="sign-box">Prepared By<br><strong>Payroll Officer</strong></div>
        <div class="sign-box">Validated By<br><strong>HR Manager</strong></div>
        <div class="sign-box">Approved By<br><strong>General Manager</strong></div>
        <div class="sign-box">Received &amp; Acknowledged<br><strong>Employee Signature</strong></div>
      </div>
    </body>
    </html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
      });
      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }

  /**
   * Generate Gratuity Provision Report (Excel)
   * Monthly accrual per employee for Finance
   */
  async generateGratuityProvisionExcel(companyId, asOfDate = new Date()) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Gratuity Provision');

    const asOf = new Date(asOfDate);
    const employees = await this.prisma.$base().employees.findMany({
      where: { company_id: companyId, status: { in: ['Active', 'NewJoined'] } },
      include: {
        contracts: {
          where: { status: { in: ['Approved', 'Active'] } },
          include: { department: true },
          orderBy: { effective_date: 'desc' },
        },
        company_visa: true,
      },
      orderBy: { employee_code: 'asc' },
    });

    sheet.columns = [
      { header: 'Employee Code', key: 'code', width: 16 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Department', key: 'dept', width: 20 },
      { header: 'Joining Date', key: 'joining', width: 15 },
      { header: 'Basic Salary (AED)', key: 'basic', width: 18 },
      { header: 'Service Years', key: 'years', width: 15 },
      { header: 'Gratuity Days', key: 'days', width: 15 },
      { header: 'Total Provision (AED)', key: 'provision', width: 22 },
      { header: 'Monthly Accrual (AED)', key: 'monthly', width: 22 },
    ];

    let totalProvision = new Decimal(0);
    let totalMonthlyAccrual = new Decimal(0);

    for (const emp of employees) {
      const contract = emp.contracts[0];
      const basic = new Decimal(contract?.basic || 0);
      const jDate = new Date(emp.joining_date);
      const diffMs = asOf.getTime() - jDate.getTime();
      const serviceDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
      const serviceYears = new Decimal(serviceDays).dividedBy(365);

      const basicDaily = basic.times(12).dividedBy(365);
      let days = new Decimal(0);
      let prov = new Decimal(0);

      if (serviceYears.greaterThanOrEqualTo(1)) {
        if (serviceYears.lessThanOrEqualTo(5)) {
          days = serviceYears.times(21);
        } else {
          days = new Decimal(105).plus(serviceYears.minus(5).times(30));
        }
        prov = roundToCurrency(Decimal.min(basicDaily.times(days), basic.times(24)));
      }

      // Monthly accrual: 21/12 days wage per month for <= 5y, 30/12 for > 5y
      const monthlyDays = serviceYears.lessThanOrEqualTo(5) ? 21 / 12 : 30 / 12;
      const monthlyAccrual = roundToCurrency(basicDaily.times(monthlyDays));

      totalProvision = totalProvision.plus(prov);
      totalMonthlyAccrual = totalMonthlyAccrual.plus(monthlyAccrual);

      sheet.addRow({
        code: emp.employee_code,
        name: emp.name,
        dept: emp.contracts[0]?.department?.name || '—',
        joining: jDate.toISOString().slice(0, 10),
        basic: basic.toNumber(),
        years: Number(serviceYears.toFixed(2)),
        days: Number(days.toFixed(2)),
        provision: prov.toNumber(),
        monthly: monthlyAccrual.toNumber(),
      });
    }

    // Header styling
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

    return workbook.xlsx.writeBuffer();
  }

  /**
   * Generate Leave Liability Report (Excel)
   * Unused leave * daily basic wage
   */
  async generateLeaveLiabilityExcel(companyId, asOfDate = new Date()) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Leave Liability');

    const employees = await this.prisma.$base().employees.findMany({
      where: { company_id: companyId, status: { in: ['Active', 'NewJoined'] } },
      include: {
        contracts: {
          where: { status: { in: ['Approved', 'Active'] } },
          include: { department: true },
          orderBy: { effective_date: 'desc' },
        },
        leave_allocations: {
          include: { leave_type: true },
        },
      },
      orderBy: { employee_code: 'asc' },
    });

    sheet.columns = [
      { header: 'Employee Code', key: 'code', width: 16 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Department', key: 'dept', width: 20 },
      { header: 'Basic Salary (AED)', key: 'basic', width: 18 },
      { header: 'Basic Daily Wage (AED)', key: 'daily', width: 20 },
      { header: 'Unused Annual Leave Days', key: 'days', width: 25 },
      { header: 'Leave Liability (AED)', key: 'liability', width: 22 },
    ];

    let totalLiability = new Decimal(0);

    for (const emp of employees) {
      const contract = emp.contracts[0];
      const basic = new Decimal(contract?.basic || 0);
      const basicDaily = basic.times(12).dividedBy(365);

      const annualAlloc = emp.leave_allocations.find((a) =>
        a.leave_type?.code === 'ANNUAL' || a.leave_type?.name?.toLowerCase().includes('annual')
      );

      let unusedDays = new Decimal(0);
      if (annualAlloc) {
        const allocated = new Decimal(annualAlloc.days_allocated || 0).plus(new Decimal(annualAlloc.carry_over_days || 0));
        const taken = new Decimal(annualAlloc.days_taken || 0);
        unusedDays = Decimal.max(0, allocated.minus(taken));
      }

      const liability = roundToCurrency(basicDaily.times(unusedDays));
      totalLiability = totalLiability.plus(liability);

      sheet.addRow({
        code: emp.employee_code,
        name: emp.name,
        dept: emp.contracts[0]?.department?.name || '—',
        basic: basic.toNumber(),
        daily: Number(basicDaily.toFixed(2)),
        days: Number(unusedDays.toFixed(2)),
        liability: liability.toNumber(),
      });
    }

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

    return workbook.xlsx.writeBuffer();
  }
}

export default new SettlementService();

