import Decimal from 'decimal.js';
import prisma from '../lib/prisma.js';
import auditService from './auditService.js';
import { executeRuleEngine, roundToCurrency, STATUTORY_UAE_DEFAULT_RULES, mapContractAndInputsToEngineVariables } from '@nextal/shared';
import { generateWpsSif } from '../lib/wps/sifGenerator.js';
import { generatePayslipPdf } from '../lib/pdf.js';
import { generatePayrollRegisterExcel, generateVarianceReportExcel } from '../lib/reports/payrollReportGenerator.js';
import notificationService from './notificationService.js';
import mailer from '../lib/mailer.js';
import { validateAndResolveVisa } from './visaValidator.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

const STATUTORY_FORMULA_MAP = new Map(STATUTORY_UAE_DEFAULT_RULES.map((r) => [r.code, r.formula]));

function toUuidOrNull(val) {
  if (!val || typeof val !== 'string') return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ? val : null;
}

export class PayrollService {
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
   * List pay runs with filtering and summary metrics
   */
  async listPayRuns(companyId, { companyVisaId, periodMonth, status, limit = 50, offset = 0 } = {}) {
    const where = { company_id: companyId };
    if (companyVisaId) {
      const validVisa = await validateAndResolveVisa({ companyId, companyVisaId });
      if (validVisa) where.company_visa_id = validVisa;
    }
    if (status) where.status = status;
    if (periodMonth) {
      const pmDate = new Date(periodMonth);
      const start = new Date(Date.UTC(pmDate.getUTCFullYear(), pmDate.getUTCMonth(), 1));
      where.period_month = start;
    }

    const [payRuns, total] = await Promise.all([
      this.prisma.$base().pay_runs.findMany({
        where,
        include: {
          company_visa: { select: { id: true, name: true, mol_establishment_id: true } },
          _count: {
            select: {
              payslips: true,
              issues: true,
            },
          },
          payslips: {
            select: {
              gross: true,
              total_deductions: true,
              net: true,
            },
          },
        },
        orderBy: { period_month: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      this.prisma.$base().pay_runs.count({ where }),
    ]);

    const formatted = payRuns.map((pr) => {
      let totalGross = new Decimal(0);
      let totalDeductions = new Decimal(0);
      let totalNet = new Decimal(0);

      for (const ps of pr.payslips) {
        totalGross = totalGross.plus(new Decimal(ps.gross || 0));
        totalDeductions = totalDeductions.plus(new Decimal(ps.total_deductions || 0));
        totalNet = totalNet.plus(new Decimal(ps.net || 0));
      }

      const { payslips, ...rest } = pr;
      return {
        ...rest,
        employee_count: pr._count.payslips,
        issues_count: pr._count.issues,
        total_gross: totalGross.toFixed(2),
        total_deductions: totalDeductions.toFixed(2),
        total_net: totalNet.toFixed(2),
      };
    });

    return { items: formatted, total };
  }

  /**
   * Get single pay run details, totals, and approval status
   */
  async getPayRun(companyId, payRunId) {
    const payRun = await this.prisma.$base().pay_runs.findFirst({
      where: { id: payRunId, company_id: companyId },
      include: {
        company: { select: { id: true, name: true, variance_threshold_pct: true, variance_threshold_aed: true } },
        company_visa: true,
        validator: { select: { id: true, email: true, employee: { select: { name: true } } } },
        locker: { select: { id: true, email: true, employee: { select: { name: true } } } },
        approval_request: {
          include: {
            actions: {
              include: { actor: { select: { id: true, email: true, employee: { select: { name: true } } } } },
              orderBy: { step_no: 'asc' },
            },
          },
        },
        _count: {
          select: {
            payslips: true,
            issues: true,
          },
        },
      },
    });

    if (!payRun) {
      const err = new Error('Pay run not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    // Aggregate totals from payslips
    const payslips = await this.prisma.$base().payslips.findMany({
      where: { pay_run_id: payRunId },
      select: { gross: true, total_deductions: true, net: true, variance_pct: true, variance_reason: true },
    });

    let totalGross = new Decimal(0);
    let totalDeductions = new Decimal(0);
    let totalNet = new Decimal(0);
    let varianceCount = 0;
    let pendingVarianceCount = 0;

    const thresholdPct = Number(payRun.company?.variance_threshold_pct || 10.0);
    for (const ps of payslips) {
      totalGross = totalGross.plus(new Decimal(ps.gross || 0));
      totalDeductions = totalDeductions.plus(new Decimal(ps.total_deductions || 0));
      totalNet = totalNet.plus(new Decimal(ps.net || 0));

      const vPct = Math.abs(Number(ps.variance_pct || 0));
      if (vPct >= thresholdPct) {
        varianceCount++;
        if (!ps.variance_reason) pendingVarianceCount++;
      }
    }

    const issuesCount = await this.prisma.$base().pay_run_issues.count({
      where: { pay_run_id: payRunId, resolved_at: null },
    });
    const blockingIssuesCount = await this.prisma.$base().pay_run_issues.count({
      where: { pay_run_id: payRunId, severity: 'Blocking', resolved_at: null },
    });

    return {
      ...payRun,
      employee_count: payslips.length,
      total_gross: totalGross.toFixed(2),
      total_deductions: totalDeductions.toFixed(2),
      total_net: totalNet.toFixed(2),
      issues_count: issuesCount,
      blocking_issues_count: blockingIssuesCount,
      variance_count: varianceCount,
      pending_variance_count: pendingVarianceCount,
      variance_threshold_pct: thresholdPct,
    };
  }

  /**
   * List payslips for a specific pay run with filtering
   */
  async listPayRunPayslips(companyId, payRunId, { search, hasVariance, limit = 100, offset = 0 } = {}) {
    const where = {
      company_id: companyId,
      pay_run_id: payRunId,
    };

    if (search) {
      where.employee = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { employee_code: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    if (hasVariance === 'true' || hasVariance === true) {
      where.variance_pct = {
        not: null,
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.$base().payslips.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              employee_code: true,
              name: true,
              arabic_name: true,
              residency_type: true,
              nationality: true,
              bank_accounts: {
                where: { is_active: true },
                select: { id: true, bank_name: true, iban: true, routing_code: true, is_primary: true },
              },
            },
          },
          contract: {
            select: {
              id: true,
              job: { select: { id: true, title: true } },
              department: { select: { id: true, name: true } },
            },
          },
          lines: {
            include: { salary_rule: true },
            orderBy: { salary_rule: { sequence: 'asc' } },
          },
        },
        orderBy: { employee: { employee_code: 'asc' } },
        take: Number(limit),
        skip: Number(offset),
      }),
      this.prisma.$base().payslips.count({ where }),
    ]);

    const formatted = items.map((ps) => {
      const primaryBank = ps.employee?.bank_accounts?.find((b) => b.is_primary) || ps.employee?.bank_accounts?.[0] || null;
      return {
        ...ps,
        bankAccount: primaryBank
          ? {
              id: primaryBank.id,
              bank_name: primaryBank.bank_name,
              iban: primaryBank.iban,
              routing_code: primaryBank.routing_code,
            }
          : null,
      };
    });

    return { items: formatted, total };
  }

  /**
   * List issues for a specific pay run
   */
  async listPayRunIssues(companyId, payRunId, { severity, resolved } = {}) {
    const where = {
      company_id: companyId,
      pay_run_id: payRunId,
    };

    if (severity) {
      where.severity = severity;
    }

    if (resolved === 'false' || resolved === false) {
      where.resolved_at = null;
    } else if (resolved === 'true' || resolved === true) {
      where.resolved_at = { not: null };
    }

    const issues = await this.prisma.$base().pay_run_issues.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employee_code: true,
            name: true,
          },
        },
      },
      orderBy: [{ severity: 'asc' }, { created_at: 'asc' }],
    });

    return issues;
  }

  /**
   * Create a new Pay Run (Starts in Draft status)
   */
  async createPayRun(companyId, data, userId) {
    const { company_visa_id, period_month, cutoff_date, run_type = 'Regular' } = data;

    if (!company_visa_id || !period_month) {
      const err = new Error('company_visa_id and period_month are mandatory');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const pm = new Date(period_month);
    const startMonth = new Date(Date.UTC(pm.getUTCFullYear(), pm.getUTCMonth(), 1));

    // Verify company visa
    const visa = await this.prisma.$base().company_visas.findFirst({
      where: { id: company_visa_id, company_id: companyId },
    });
    if (!visa) {
      const err = new Error('Company visa not found');
      err.status = 404;
      err.code = 'VISA_NOT_FOUND';
      throw err;
    }

    // Verify uniqueness for visa, period and run_type
    const existing = await this.prisma.$base().pay_runs.findFirst({
      where: {
        company_visa_id,
        period_month: startMonth,
        run_type,
      },
    });
    if (existing) {
      const err = new Error(`A pay run already exists for visa '${visa.name}' for period ${startMonth.toISOString().slice(0, 7)}`);
      err.status = 400;
      err.code = 'PAY_RUN_EXISTS';
      throw err;
    }

    // Default cut-off date: 25th of month unless provided
    let finalCutoff;
    if (cutoff_date) {
      finalCutoff = new Date(cutoff_date);
    } else {
      const company = await this.prisma.$base().companies.findUnique({
        where: { id: companyId },
        select: { default_cutoff_day: true },
      });
      const cutoffDay = company?.default_cutoff_day || 25;
      finalCutoff = new Date(Date.UTC(pm.getUTCFullYear(), pm.getUTCMonth(), cutoffDay));
    }

    const payRun = await this.prisma.$base().pay_runs.create({
      data: {
        company_id: companyId,
        company_visa_id,
        period_month: startMonth,
        cutoff_date: finalCutoff,
        run_type,
        status: 'Draft',
        created_by: toUuidOrNull(userId),
      },
    });

    await auditService.log({
      companyId,
      userId,
      action: 'CREATE_PAY_RUN',
      tableName: 'pay_runs',
      recordId: payRun.id,
      newValues: {
        company_visa_id,
        period_month: startMonth.toISOString().slice(0, 7),
        status: 'Draft',
      },
    });

    return payRun;
  }

  /**
   * Run the Calculation Engine for a Pay Run (Idempotent: replaces existing payslips/lines)
   *
   * Flow:
   * 1. Idempotency guard: verify pay run is not Locked or Paid.
   * 2. Determine period bounds (e.g. 2026-10-01 to 2026-10-31) and total calendar days (e.g. 31).
   * 3. Fetch active employees under the visa.
   * 4. Fetch contracts, handling mid-month contract changes split by days and joiner/leaver pro-ration.
   * 5. Gather confirmed attendance inputs up to cutoff_date (holding unconfirmed days for next month).
   * 6. Gather approved overtime up to cutoff_date.
   * 7. Gather approved scheduled salary_adjustments (Loans, Advances, Corrections).
   * 8. Execute 17 statutory salary rules via executeRuleEngine.
   * 9. Compute variance against previous month's net.
   * 10. Persist payslips, payslip lines, and pay_run_issues in a clean transaction.
   * 11. Update status to 'Calculated'.
   */
  async calculatePayRun(companyId, payRunId, userId) {
    const payRun = await this.prisma.$base().pay_runs.findFirst({
      where: { id: payRunId, company_id: companyId },
      include: {
        company: { select: { id: true, name: true, variance_threshold_pct: true, variance_threshold_aed: true } },
        company_visa: true,
        company: true,
      },
    });

    if (!payRun) {
      const err = new Error('Pay run not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (['Locked', 'Paid'].includes(payRun.status)) {
      const err = new Error(`Cannot re-calculate pay run in '${payRun.status}' status. It is locked against modifications.`);
      err.status = 400;
      err.code = 'PAY_RUN_LOCKED';
      throw err;
    }

    const year = payRun.period_month.getUTCFullYear();
    const month = payRun.period_month.getUTCMonth(); // 0-indexed
    const periodFrom = new Date(Date.UTC(year, month, 1));
    const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const periodTo = new Date(Date.UTC(year, month, lastDayOfMonth));
    const monthDays = lastDayOfMonth; // 30, 31, 28, etc.

    const cutoff = new Date(payRun.cutoff_date);
    cutoff.setUTCHours(23, 59, 59, 999);

    // Previous month period for variance calculations
    const prevMonthDate = new Date(Date.UTC(year, month - 1, 1));

    // 1. Fetch all eligible employees under this visa
    const employees = await this.prisma.$base().employees.findMany({
      where: {
        company_id: companyId,
        company_visa_id: payRun.company_visa_id,
        status: { in: ['Active', 'Suspended', 'NewJoined'] },
        joining_date: { lte: periodTo },
      },
      include: {
        contracts: {
          where: { status: { notIn: ['Pending', 'Rejected'] } },
          orderBy: { effective_date: 'desc' },
          include: { salary_structure: { include: { rules: { where: { is_active: true } } } } },
        },
        bank_accounts: { where: { is_active: true } },
      },
    });

    // 2. Fetch active salary rules from company default structure
    const rawSalaryRules = await this.prisma.$base().salary_rules.findMany({
      where: { company_id: companyId, is_active: true },
      orderBy: { sequence: 'asc' },
    });
    const salaryRules = rawSalaryRules.map((rule) => {
      const statutoryFormula = STATUTORY_FORMULA_MAP.get(rule.code);
      if (statutoryFormula && (!rule.formula || rule.formula.includes('approved') || rule.formula.includes('substitute') || rule.formula.includes('from attendance') || rule.formula.includes('50% of') || rule.formula.includes('100% deduction') || rule.formula.includes('monthly instalment') || rule.formula.includes('all allowances'))) {
        return { ...rule, formula: statutoryFormula };
      }
      return rule;
    });

    // 3. Fetch confirmed attendance inputs for all employees in date range up to periodTo
    const attendanceDays = await this.prisma.$base().attendance_days.findMany({
      where: {
        company_id: companyId,
        work_date: { gte: periodFrom, lte: periodTo },
      },
    });

    // 4. Fetch approved overtime requests up to cutoff
    const overtimeRequests = await this.prisma.$base().overtime_requests.findMany({
      where: {
        company_id: companyId,
        work_date: { gte: periodFrom, lte: cutoff },
        status: 'Approved',
        compensation: 'Pay',
      },
    });

    // 5. Fetch approved salary adjustments scheduled for this month
    const adjustments = await this.prisma.$base().salary_adjustments.findMany({
      where: {
        company_id: companyId,
        status: { in: ['Approved', 'Active'] },
        start_month: { lte: periodTo },
        balance: { gt: 0 },
      },
    });

    // 6. Fetch previous month payslips for variance review
    const prevPayRun = await this.prisma.$base().pay_runs.findFirst({
      where: {
        company_visa_id: payRun.company_visa_id,
        period_month: prevMonthDate,
      },
      include: { payslips: true },
    });
    const prevPayslipMap = new Map();
    if (prevPayRun?.payslips) {
      for (const ps of prevPayRun.payslips) {
        prevPayslipMap.set(ps.employee_id, Number(ps.net || 0));
      }
    }

    const calculatedPayslips = [];
    const generatedIssues = [];
    const varianceThresholdPct = Number(payRun.company?.variance_threshold_pct || 10.0);

    for (const emp of employees) {
      // Find active contract versions during this month (excluding Pending and Rejected)
      const activeContracts = emp.contracts.filter((c) => {
        if (c.status === 'Pending' || c.status === 'Rejected') return false;
        const eff = new Date(c.effective_date);
        return eff <= periodTo;
      });

      if (activeContracts.length === 0) {
        generatedIssues.push({
          company_id: companyId,
          pay_run_id: payRun.id,
          employee_id: emp.id,
          issue_code: 'NO_ACTIVE_CONTRACT',
          message: `Employee ${emp.name} (${emp.employee_code}) has no active contract for this period`,
          severity: 'Blocking',
        });
        continue;
      }

      // Check primary bank account
      const primaryBank = emp.bank_accounts.find((b) => b.is_primary) || emp.bank_accounts[0];
      if (!primaryBank || !primaryBank.iban) {
        generatedIssues.push({
          company_id: companyId,
          pay_run_id: payRun.id,
          employee_id: emp.id,
          issue_code: 'MISSING_IBAN',
          message: `Employee ${emp.name} (${emp.employee_code}) is missing an active UAE IBAN on bank account`,
          severity: 'Blocking',
        });
      } else if (!primaryBank.routing_code) {
        generatedIssues.push({
          company_id: companyId,
          pay_run_id: payRun.id,
          employee_id: emp.id,
          issue_code: 'MISSING_ROUTING_CODE',
          message: `Bank routing code missing for employee ${emp.name} (${emp.employee_code}) for SIF file export`,
          severity: 'Blocking',
        });
      }

      // Determine contract split for mid-month changes
      // If employee has a contract raise/amendment effective mid-month (e.g. eff date > periodFrom and <= periodTo)
      let primaryContract = activeContracts[0];
      let basicSalary = new Decimal(primaryContract.basic);
      let grossSalary = new Decimal(primaryContract.gross);
      let hra = new Decimal(primaryContract.housing || 0);
      let tra = new Decimal(primaryContract.transport || 0);
      let oth = new Decimal(primaryContract.other_allowances || 0);

      // Check if mid-month contract transition exists
      const midMonthContract = activeContracts.find((c) => {
        const eff = new Date(c.effective_date);
        return eff > periodFrom && eff <= periodTo;
      });

      let paidDays = monthDays;
      // Pro-rate if joined mid-month
      const joinDate = new Date(emp.joining_date);
      if (joinDate > periodFrom) {
        const joinDay = joinDate.getUTCDate();
        paidDays = monthDays - joinDay + 1;
      }

      if (midMonthContract && activeContracts.length >= 2) {
        // Contract split: Contract 1 applies up to change day - 1, Contract 2 applies from change day onwards
        const changeDay = new Date(midMonthContract.effective_date).getUTCDate();
        const daysPre = changeDay - 1;
        const daysPost = monthDays - daysPre;

        const prevContract = activeContracts.find((c) => new Date(c.effective_date) < new Date(midMonthContract.effective_date)) || activeContracts[1];

        const preBasic = new Decimal(prevContract.basic).times(daysPre).dividedBy(monthDays);
        const postBasic = new Decimal(midMonthContract.basic).times(daysPost).dividedBy(monthDays);
        basicSalary = roundToCurrency(preBasic.plus(postBasic));

        const preGross = new Decimal(prevContract.gross).times(daysPre).dividedBy(monthDays);
        const postGross = new Decimal(midMonthContract.gross).times(daysPost).dividedBy(monthDays);
        grossSalary = roundToCurrency(preGross.plus(postGross));

        primaryContract = midMonthContract;
      }

      // Attendance processing
      const empAttendance = attendanceDays.filter((a) => a.employee_id === emp.id);

      // Check for unconfirmed attendance days held for next month (up to cutoff)
      const cutoffAttendance = empAttendance.filter((a) => new Date(a.work_date) <= cutoff);
      const unconfirmedDays = cutoffAttendance.filter((a) => a.review_status?.toLowerCase() !== 'hrconfirmed');
      if (unconfirmedDays.length > 0) {
        generatedIssues.push({
          company_id: companyId,
          pay_run_id: payRun.id,
          employee_id: emp.id,
          issue_code: 'UNCONFIRMED_ATTENDANCE_HELD',
          message: `${unconfirmedDays.length} attendance day(s) for ${emp.name} were not HR-confirmed by cut-off and are held for next month's inputs`,
          severity: 'Warning',
        });
      }

      // Confirmed days up to cutoff contribute to deductions in this run
      const confirmedDaysForDeductions = cutoffAttendance.filter((a) => a.review_status?.toLowerCase() === 'hrconfirmed');

      let absentDays = 0;
      let lateUnits = 0;
      let sickHalfDays = 0;
      let sickNoneDays = 0;

      for (const d of confirmedDaysForDeductions) {
        if (d.day_type === 'Absence' || d.day_type === 'UnpaidLeave') {
          absentDays += 1;
        }
        if (Number(d.late_penalty_days) > 0) {
          lateUnits += Number(d.late_penalty_days);
        }
        if (d.pay_band === 'HalfPay') {
          sickHalfDays += 1;
        } else if (d.pay_band === 'NoPay') {
          sickNoneDays += 1;
        }
      }

      // Overtime processing up to cutoff
      const empOT = overtimeRequests.filter((ot) => ot.employee_id === emp.id);
      let otHoursNormal = new Decimal(0);
      let otHoursNight = new Decimal(0);
      let otHoursRest = new Decimal(0);

      for (const ot of empOT) {
        const hrs = new Decimal(ot.hours);
        if (ot.ot_type === 'Night') {
          otHoursNight = otHoursNight.plus(hrs);
        } else if (ot.ot_type === 'RestDay' || ot.ot_type === 'PublicHoliday') {
          otHoursRest = otHoursRest.plus(hrs);
        } else {
          otHoursNormal = otHoursNormal.plus(hrs);
        }
      }

      // Scheduled salary adjustments (Loans, Advances)
      const empAdjustments = adjustments.filter((a) => a.employee_id === emp.id);
      let loanInstalment = new Decimal(0);
      let advInstalment = new Decimal(0);

      for (const adj of empAdjustments) {
        const mAmount = Decimal.min(new Decimal(adj.monthly_amount), new Decimal(adj.balance));
        if (adj.type === 'Loan') {
          loanInstalment = loanInstalment.plus(mAmount);
        } else if (adj.type === 'Advance') {
          advInstalment = advInstalment.plus(mAmount);
        }
      }

      // Pension parameters
      const isUaeNational = emp.residency_type === 'UAENational' || emp.residency_type === 'National' || emp.nationality === 'ARE' || emp.nationality === 'Emirati';
      const gpssaSalary = isUaeNational ? basicSalary.plus(hra) : new Decimal(0);

      // Confirmed worked days from attendance records across the period
      const allConfirmedDays = empAttendance.filter((a) => a.review_status?.toLowerCase() === 'hrconfirmed');
      const confirmedWorkedDaysCount = allConfirmedDays.filter(
        (a) => a.day_type === 'WorkDay'
      ).length;
      const workedDays = allConfirmedDays.length > 0
        ? new Decimal(confirmedWorkedDaysCount)
        : new Decimal(paidDays - absentDays);

      // Single mapping function shared with simulator & tests
      const engineInputs = mapContractAndInputsToEngineVariables(
        {
          basic: basicSalary.toNumber(),
          housing: hra.toNumber(),
          transport: tra.toNumber(),
          other_allowances: oth.toNumber(),
        },
        {
          paid_days: paidDays,
          month_days: monthDays,
          absent_days: absentDays,
          late_units: lateUnits,
          sick_half_days: sickHalfDays,
          sick_none_days: sickNoneDays,
          ot_hours_normal: otHoursNormal.toNumber(),
          ot_hours_night: otHoursNight.toNumber(),
          ot_hours_rest: otHoursRest.toNumber(),
          loan_instalment: loanInstalment.toNumber(),
          adv_instalment: advInstalment.toNumber(),
          gpssa_salary: gpssaSalary.toNumber(),
          isUaeNational,
          is_legacy: false,
          absence_divisor: payRun.company?.absence_divisor || 'DAYS_30',
        }
      );

      // Execute calculation rule engine
      const ruleResult = executeRuleEngine(salaryRules.length > 0 ? salaryRules : undefined, engineInputs);

      const netAmount = new Decimal(ruleResult.net || 0);
      // "Total Gross" on payslips = all earnings (BASIC + HRA + TRA + OTH + OT + other earnings)
      const grossAmount = new Decimal(ruleResult.totalGross || ruleResult.gross || grossSalary);
      const totalDeductions = new Decimal(ruleResult.totalDeductions || 0);

      // Negative salary protection
      if (netAmount.lessThan(0)) {
        generatedIssues.push({
          company_id: companyId,
          pay_run_id: payRun.id,
          employee_id: emp.id,
          issue_code: 'NEGATIVE_NET_SALARY',
          message: `Deductions exceed earnings for ${emp.name}: Net calculated as AED ${netAmount.toFixed(2)}`,
          severity: 'Blocking',
        });
      }

      // Variance calculation against previous month
      const prevNet = prevPayslipMap.get(emp.id);
      let variancePct = null;
      if (prevNet !== undefined && prevNet > 0) {
        const diff = netAmount.minus(prevNet);
        variancePct = roundToCurrency(diff.dividedBy(prevNet).times(100)).toNumber();

        if (Math.abs(variancePct) >= varianceThresholdPct) {
          generatedIssues.push({
            company_id: companyId,
            pay_run_id: payRun.id,
            employee_id: emp.id,
            issue_code: 'VARIANCE_EXCEEDED_THRESHOLD',
            message: `Net salary for ${emp.name} changed by ${variancePct.toFixed(2)}% (threshold: ${varianceThresholdPct}%). Explanation required before validation.`,
            severity: 'Blocking',
          });
        }
      }

      calculatedPayslips.push({
        payslipData: {
          company_id: companyId,
          pay_run_id: payRun.id,
          employee_id: emp.id,
          contract_id: primaryContract.id,
          period_from: periodFrom,
          period_to: periodTo,
          paid_days: new Decimal(paidDays),
          worked_days: workedDays,
          basic: basicSalary,
          gross: grossAmount,
          total_deductions: totalDeductions,
          net: netAmount,
          previous_net: prevNet !== undefined ? new Decimal(prevNet) : null,
          variance_pct: variancePct !== null ? new Decimal(variancePct) : null,
          status: 'Draft',
        },
        steps: ruleResult.steps || [],
      });
    }

    // Check for unapproved adjustments scheduled for this month
    const unapprovedAdjustments = await this.prisma.$base().salary_adjustments.findMany({
      where: {
        company_id: companyId,
        status: 'Pending',
        start_month: { lte: periodTo },
      },
      include: { employee: true },
    });
    for (const unapproved of unapprovedAdjustments) {
      generatedIssues.push({
        company_id: companyId,
        pay_run_id: payRun.id,
        employee_id: unapproved.employee_id,
        issue_code: 'UNAPPROVED_SALARY_ADJUSTMENT',
        message: `Salary adjustment (${unapproved.type} for AED ${Number(unapproved.total_amount).toFixed(2)}) for ${unapproved.employee.name} is entered but not approved. It will not be used in the pay run until approved.`,
        severity: 'Warning',
      });
    }

    // 7. Atomic transaction: clear previous draft lines & payslips, insert new calculated payslips & lines
    await this.prisma.$base().$transaction(async (tx) => {
      // Clear previous issues
      await tx.pay_run_issues.deleteMany({ where: { pay_run_id: payRunId } });

      // Clear previous payslips and lines for this pay run
      const oldPayslips = await tx.payslips.findMany({
        where: { pay_run_id: payRunId },
        select: { id: true },
      });
      const oldIds = oldPayslips.map((p) => p.id);
      if (oldIds.length > 0) {
        await tx.payslip_lines.deleteMany({ where: { payslip_id: { in: oldIds } } });
        await tx.payslips.deleteMany({ where: { id: { in: oldIds } } });
      }

      // Insert new calculated payslips and lines
      for (const item of calculatedPayslips) {
        const createdPayslip = await tx.payslips.create({
          data: item.payslipData,
        });

        // Insert step lines
        if (item.steps.length > 0) {
          const linesToInsert = [];
          for (const s of item.steps) {
            const decAmount = new Decimal(s.amount || 0);
            if (decAmount.isZero() && !['BASIC', 'HRA', 'TRA', 'OTH', 'GROSS', 'NET'].includes(s.code)) {
              continue;
            }
            const matchedRule = salaryRules.find((r) => r.code === s.code);
            if (matchedRule) {
              linesToInsert.push({
                company_id: companyId,
                payslip_id: createdPayslip.id,
                salary_rule_id: matchedRule.id,
                code: s.code,
                name: s.name || matchedRule.name,
                amount: decAmount,
              });
            }
          }
          if (linesToInsert.length > 0) {
            await tx.payslip_lines.createMany({ data: linesToInsert });
          }
        }
      }

      // Insert generated issues
      if (generatedIssues.length > 0) {
        await tx.pay_run_issues.createMany({ data: generatedIssues });
      }

      // Update pay run status to Calculated
      await tx.pay_runs.update({
        where: { id: payRunId },
        data: {
          status: 'Calculated',
          calculated_at: new Date(),
          updated_by: toUuidOrNull(userId),
        },
      });
    }, { timeout: 60000, maxWait: 10000 });

    await auditService.log({
      companyId,
      userId,
      action: 'CALCULATE_PAY_RUN',
      tableName: 'pay_runs',
      recordId: payRunId,
      newValues: {
        status: 'Calculated',
        employee_count: calculatedPayslips.length,
        issues_count: generatedIssues.length,
      },
    });

    return await this.getPayRun(companyId, payRunId);
  }

  /**
   * Validate a calculated Pay Run
   *
   * Rules:
   * - Must be in 'Calculated' status
   * - Cannot validate if Blocking issues exist (e.g. missing IBAN, negative net)
   * - Cannot validate if any payslip with variance >= threshold has an empty variance_reason
   * - Sets status to 'Validated', records validated_by and validated_at
   */
  async validatePayRun(companyId, payRunId, userId) {
    const payRun = await this.prisma.$base().pay_runs.findFirst({
      where: { id: payRunId, company_id: companyId },
      include: {
        issues: { where: { severity: 'Blocking', resolved_at: null } },
        payslips: true,
      },
    });

    if (!payRun) {
      const err = new Error('Pay run not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (payRun.status !== 'Calculated') {
      const err = new Error(`Cannot validate pay run with status '${payRun.status}'. Pay run must be calculated first.`);
      err.status = 400;
      err.code = 'INVALID_STATUS';
      throw err;
    }

    // Segregation of duties (P9): The user who calculated/prepared cannot validate
    if (userId && ((payRun.created_by && payRun.created_by === userId) || (payRun.updated_by && payRun.updated_by === userId))) {
      const err = new Error('Segregation of duties violation: You cannot validate a pay run you calculated or prepared.');
      err.status = 403;
      err.code = 'SELF_VALIDATION_BLOCKED';
      throw err;
    }

    // 1. Check blocking issues
    if (payRun.issues && payRun.issues.length > 0) {
      const err = new Error(
        `Pay run validation failed: ${payRun.issues.length} blocking error(s) must be resolved before the pay run can be validated.`
      );
      err.status = 400;
      err.code = 'PAY_RUN_BLOCKING_ISSUES';
      err.issues = payRun.issues;
      throw err;
    }

    // 2. Check pending variance reasons (T29)
    const thresholdPct = Number(payRun.company?.variance_threshold_pct || 10.0);
    const unreasonedVariances = payRun.payslips.filter((ps) => {
      const vPct = Math.abs(Number(ps.variance_pct || 0));
      return vPct >= thresholdPct && (!ps.variance_reason || ps.variance_reason.trim() === '');
    });

    if (unreasonedVariances.length > 0) {
      const err = new Error(
        `Pay run cannot be validated: ${unreasonedVariances.length} employee payslip(s) have net variances exceeding ±${thresholdPct}% that require an explanatory justification reason.`
      );
      err.status = 400;
      err.code = 'VARIANCE_REASON_REQUIRED';
      err.pendingPayslipIds = unreasonedVariances.map((p) => p.id);
      throw err;
    }

    const updated = await this.prisma.$base().pay_runs.update({
      where: { id: payRunId },
      data: {
        status: 'Validated',
        validated_by: toUuidOrNull(userId),
        validated_at: new Date(),
      },
    });

    await auditService.log({
      companyId,
      userId,
      action: 'VALIDATE_PAY_RUN',
      tableName: 'pay_runs',
      recordId: payRunId,
      newValues: { status: 'Validated', validated_at: updated.validated_at },
    });

    return updated;
  }

  /**
   * Lock a validated Pay Run (Freezes payslips and enables WPS SIF export)
   *
   * Rules:
   * - Must be in 'Validated' status (T30)
   * - Sets status to 'Locked', sets locked_by and locked_at
   * - Advances and updates loan and advance scheduled balances in salary_adjustments
   * - PostgreSQL trigger prevents updates or deletes to payslips & lines once Locked
   */
  async lockPayRun(companyId, payRunId, userId) {
    const payRun = await this.prisma.$base().pay_runs.findFirst({
      where: { id: payRunId, company_id: companyId },
      include: {
        payslips: { include: { lines: true } },
      },
    });

    if (!payRun) {
      const err = new Error('Pay run not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (payRun.status !== 'Validated') {
      const err = new Error(`Cannot lock pay run in '${payRun.status}' status. Pay run must be Validated before locking.`);
      err.status = 400;
      err.code = 'INVALID_STATUS';
      throw err;
    }

    // Segregation of duties (P9): The validator cannot approve/lock
    if (userId && payRun.validated_by && payRun.validated_by === userId) {
      const err = new Error('Segregation of duties violation: You cannot approve or lock a pay run you validated.');
      err.status = 403;
      err.code = 'SELF_APPROVAL_BLOCKED';
      throw err;
    }

    // Deduct scheduled salary adjustments for all employees in this run
    await this.prisma.$base().$transaction(async (tx) => {
      for (const ps of payRun.payslips) {
        for (const line of ps.lines) {
          if (line.code === 'LOAN' || line.code === 'ADV') {
            const deductionAmt = new Decimal(line.amount || 0);
            if (deductionAmt.greaterThan(0)) {
              const adj = await tx.salary_adjustments.findFirst({
                where: {
                  company_id: companyId,
                  employee_id: ps.employee_id,
                  type: line.code === 'LOAN' ? 'Loan' : 'Advance',
                  status: { in: ['Approved', 'Active'] },
                  balance: { gt: 0 },
                },
                orderBy: { start_month: 'asc' },
              });

              if (adj) {
                const newBalance = Decimal.max(0, new Decimal(adj.balance).minus(deductionAmt));
                const newStatus = newBalance.isZero() ? 'Completed' : 'Active';
                await tx.salary_adjustments.update({
                  where: { id: adj.id },
                  data: {
                    balance: newBalance,
                    status: newStatus,
                  },
                });
              }
            }
          }
        }

        // Lock individual payslips
        await tx.payslips.update({
          where: { id: ps.id },
          data: { status: 'Locked' },
        });
      }

      await tx.pay_runs.update({
        where: { id: payRunId },
        data: {
          status: 'Locked',
          locked_by: toUuidOrNull(userId),
          locked_at: new Date(),
        },
      });
    }, { timeout: 60000, maxWait: 10000 });

    await auditService.log({
      companyId,
      userId,
      action: 'LOCK_PAY_RUN',
      tableName: 'pay_runs',
      recordId: payRunId,
      newValues: { status: 'Locked' },
    });

    return await this.getPayRun(companyId, payRunId);
  }

  /**
   * Mark a locked pay run as Paid
   */
  async markPayRunPaid(companyId, payRunId, userId) {
    const payRun = await this.prisma.$base().pay_runs.findFirst({
      where: { id: payRunId, company_id: companyId },
    });

    if (!payRun) {
      const err = new Error('Pay run not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (payRun.status !== 'Locked') {
      const err = new Error(`Cannot mark pay run as Paid from '${payRun.status}' status. Pay run must be Locked first.`);
      err.status = 400;
      err.code = 'INVALID_STATUS';
      throw err;
    }

    // Segregation of duties (P9): The approver cannot mark Paid
    if (userId && payRun.locked_by && payRun.locked_by === userId) {
      const err = new Error('Segregation of duties violation: You cannot mark paid a pay run you approved.');
      err.status = 403;
      err.code = 'SELF_PAYMENT_BLOCKED';
      throw err;
    }

    const paidAt = new Date();
    await this.prisma.$base().$transaction(async (tx) => {
      await tx.payslips.updateMany({
        where: { pay_run_id: payRunId },
        data: { status: 'Paid' },
      });

      await tx.pay_runs.update({
        where: { id: payRunId },
        data: {
          status: 'Paid',
          paid_at: paidAt,
          payment_date: paidAt,
        },
      });
    }, { timeout: 60000, maxWait: 10000 });

    await auditService.log({
      companyId,
      userId,
      action: 'PAY_PAY_RUN',
      tableName: 'pay_runs',
      recordId: payRunId,
      newValues: { status: 'Paid', paid_at: paidAt },
    });

    // Notify employees that their payslips have been released
    try {
      const payslips = await this.prisma.$base().payslips.findMany({
        where: { pay_run_id: payRunId },
        include: { employee: { include: { user: true } } },
      });
      const periodMonth = payRun.period_month instanceof Date
        ? payRun.period_month.toISOString().slice(0, 7)
        : String(payRun.period_month).slice(0, 7);
      for (const ps of payslips) {
        if (ps.employee?.user?.id) {
          await notificationService.notifyPayslipReleased(
            companyId,
            ps.employee.user.id,
            periodMonth,
            Number(ps.net || 0).toFixed(2)
          );
        }
        const recipientEmail = ps.employee?.user?.email || (ps.employee?.employee_code ? `${ps.employee.employee_code.toLowerCase()}@gulftech.ae` : null);
        if (recipientEmail) {
          await mailer.sendMail({
            to: recipientEmail,
            subject: `Your payslip for ${periodMonth} is available`,
            html: `<p>Dear ${ps.employee?.name || 'Employee'},</p><p>Your payslip for <strong>${periodMonth}</strong> is now available in your employee self-service portal.</p><p><a href="http://localhost:3100/me/payslips">View My Payslips</a></p><p>Best regards,<br/>Nextal HR & Payroll</p>`,
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Failed to dispatch payslip released notifications:', e.message);
    }

    return await this.getPayRun(companyId, payRunId);
  }

  /**
   * Enter explanation reason for a payslip variance exceeding threshold
   */
  async updateVarianceReason(companyId, payslipId, reason, userId) {
    if (!reason || reason.trim() === '') {
      const err = new Error('Variance justification reason cannot be empty');
      err.status = 400;
      err.code = 'REASON_REQUIRED';
      throw err;
    }

    const payslip = await this.prisma.$base().payslips.findFirst({
      where: { id: payslipId, company_id: companyId },
      include: { pay_run: true },
    });

    if (!payslip) {
      const err = new Error('Payslip not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (['Locked', 'Paid'].includes(payslip.pay_run?.status)) {
      const err = new Error('Cannot update variance reason for a locked or paid pay run');
      err.status = 400;
      err.code = 'PAY_RUN_LOCKED';
      throw err;
    }

    const updated = await this.prisma.$base().payslips.update({
      where: { id: payslipId },
      data: {
        variance_reason: reason.trim(),
        updated_by: toUuidOrNull(userId),
      },
    });

    // Automatically resolve corresponding blocking variance issue for this employee
    await this.prisma.$base().pay_run_issues.updateMany({
      where: {
        pay_run_id: payslip.pay_run_id,
        employee_id: payslip.employee_id,
        issue_code: 'VARIANCE_EXCEEDED_THRESHOLD',
        resolved_at: null,
      },
      data: {
        resolved_at: new Date(),
      },
    });

    await auditService.log({
      companyId,
      userId,
      action: 'UPDATE_VARIANCE_REASON',
      tableName: 'payslips',
      recordId: payslipId,
      newValues: { variance_reason: reason.trim() },
    });

    return updated;
  }

  /**
   * Get single payslip details
   */
  async getPayslip(companyId, payslipId) {
    const payslip = await this.prisma.$base().payslips.findFirst({
      where: { id: payslipId, company_id: companyId },
      include: {
        employee: {
          include: {
            bank_accounts: { where: { is_active: true } },
          },
        },
        contract: {
          include: { job: true, department: true },
        },
        pay_run: {
          include: { company_visa: true },
        },
        lines: {
          include: { salary_rule: true },
          orderBy: { salary_rule: { sequence: 'asc' } },
        },
      },
    });

    if (!payslip) {
      const err = new Error('Payslip not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const primaryBank = payslip.employee?.bank_accounts?.find((b) => b.is_primary) || payslip.employee?.bank_accounts?.[0] || null;

    return {
      ...payslip,
      bankAccount: primaryBank
        ? {
            id: primaryBank.id,
            bank_name: primaryBank.bank_name,
            iban: primaryBank.iban,
            routing_code: primaryBank.routing_code,
          }
        : null,
    };
  }

  /**
   * Export WPS SIF file (Restricted to Locked or Paid pay runs)
   */
  async getPayRunSif(companyId, payRunId) {
    const payRun = await this.prisma.$base().pay_runs.findFirst({
      where: { id: payRunId, company_id: companyId },
      include: {
        company: true,
        company_visa: true,
        payslips: {
          include: {
            employee: {
              include: { bank_accounts: { where: { is_active: true } } },
            },
            lines: true,
          },
        },
      },
    });

    if (!payRun) {
      const err = new Error('Pay run not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    return generateWpsSif({
      payRun,
      company: payRun.company,
      companyVisa: payRun.company_visa,
      payslips: payRun.payslips,
    });
  }

  /**
   * Generate Payslip PDF Buffer
   */
  async getPayslipPdf(companyId, payslipId) {
    const payslip = await this.getPayslip(companyId, payslipId);
    const company = await this.prisma.$base().companies.findUnique({
      where: { id: companyId },
    });

    return await generatePayslipPdf({
      payslip,
      company,
      employee: payslip.employee,
      contract: payslip.contract,
    });
  }

  /**
   * Generate Payroll Register Excel report
   */
  async getPayrollRegisterExcel(companyId, payRunId) {
    const payRun = await this.prisma.$base().pay_runs.findFirst({
      where: { id: payRunId, company_id: companyId },
      include: {
        company: true,
        company_visa: true,
        payslips: {
          include: {
            employee: {
              include: {
                bank_accounts: { where: { is_active: true } },
              },
            },
            contract: { include: { job: true, department: true } },
            lines: true,
          },
          orderBy: { employee: { employee_code: 'asc' } },
        },
      },
    });

    if (!payRun) {
      const err = new Error('Pay run not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    return await generatePayrollRegisterExcel({
      payRun,
      company: payRun.company,
      companyVisa: payRun.company_visa,
      payslips: payRun.payslips,
    });
  }

  /**
   * Generate Payroll Variance Excel report
   */
  async getVarianceReportExcel(companyId, payRunId) {
    const payRun = await this.prisma.$base().pay_runs.findFirst({
      where: { id: payRunId, company_id: companyId },
      include: {
        company: true,
        payslips: {
          include: {
            employee: true,
            contract: { include: { department: true } },
          },
          orderBy: { variance_pct: 'desc' },
        },
      },
    });

    if (!payRun) {
      const err = new Error('Pay run not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const threshold = Number(payRun.company?.variance_threshold_pct || 10.0);
    return await generateVarianceReportExcel({
      payRun,
      company: payRun.company,
      variances: payRun.payslips,
      thresholdPct: threshold,
    });
  }
}

export default new PayrollService();
