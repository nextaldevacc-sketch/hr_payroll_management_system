import ExcelJS from 'exceljs';
import Decimal from 'decimal.js';
import prisma from '../lib/prisma.js';
import { validateAndResolveVisa } from './visaValidator.js';
import scopeService from './scopeService.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

const HEADER_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF0F172A' }, // Slate 900
};

const HEADER_FONT = {
  name: 'Calibri',
  size: 11,
  bold: true,
  color: { argb: 'FFFFFFFF' },
};

const BORDER_STYLE = {
  top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
};

export const NATIONALITY_NAMES = {
  ARE: { en: 'United Arab Emirates', ar: 'الإمارات العربية المتحدة' },
  GBR: { en: 'United Kingdom', ar: 'المملكة المتحدة' },
  IND: { en: 'India', ar: 'الهند' },
  PAK: { en: 'Pakistan', ar: 'باكستان' },
  EGY: { en: 'Egypt', ar: 'مصر' },
  PHL: { en: 'Philippines', ar: 'الفلبين' },
  JOR: { en: 'Jordan', ar: 'الأردن' },
};

export class ReportService {
  constructor(client = prisma) {
    this.prisma = client;
  }

  /**
   * 1. Attendance Report (Excel)
   * Late arrivals, early outs, absences, missing punches and OT by employee / department / month
   */
  async generateAttendanceReportExcel({ companyId, month, departmentId = null, companyVisaId = null, viewer = null }) {
    // month format: 'YYYY-MM'
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const [yearStr, monthStr] = targetMonth.split('-');
    const year = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10);

    const startDate = new Date(Date.UTC(year, m - 1, 1));
    const endDate = new Date(Date.UTC(year, m, 0)); // last day of month

    const scope = scopeService.resolveDataScope(viewer);
    const scopeWhere = scopeService.buildEmployeeWhere(scope, companyVisaId);

    const empWhere = {
      company_id: companyId,
      status: 'Active',
      ...(scopeWhere || {}),
    };
    if (departmentId) {
      empWhere.department_id = departmentId;
    }

    const [company, employees, attendanceDays] = await Promise.all([
      this.prisma.$base().companies.findUnique({ where: { id: companyId } }),
      this.prisma.$base().employees.findMany({
        where: empWhere,
        include: {
          contracts: { where: { status: 'Active' }, include: { department: true }, take: 1 },
          device_mappings: true,
        },
        orderBy: [{ employee_code: 'asc' }],
      }),
      this.prisma.$base().attendance_days.findMany({
        where: {
          company_id: companyId,
          work_date: { gte: startDate, lte: endDate },
        },
        include: {
          employee: {
            select: {
              id: true,
              employee_code: true,
              name: true,
              contracts: { where: { status: 'Active' }, include: { department: true }, take: 1 },
            },
          },
          shift: { select: { name: true, start_time: true, end_time: true } },
        },
        orderBy: [{ work_date: 'asc' }, { employee: { employee_code: 'asc' } }],
      }),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Nextal HR Platform';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Attendance Report', { views: [{ showGridLines: true }] });

    // Title banner
    sheet.mergeCells('A1:N1');
    const title = sheet.getCell('A1');
    title.value = `${company?.name || 'Company'} — Monthly Attendance Report (${targetMonth})`;
    title.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    title.fill = HEADER_FILL;
    title.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 28;

    const headers = [
      'Employee Code',
      'Employee Name',
      'Department',
      'Date',
      'Shift',
      'Scheduled In',
      'Scheduled Out',
      'Actual In',
      'Actual Out',
      'Late (Mins)',
      'Early Dep (Mins)',
      'Missing Punch',
      'Overtime (Hrs)',
      'Status',
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.font = HEADER_FONT;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = BORDER_STYLE;
    });

    let totalLateMins = 0;
    let totalEarlyMins = 0;
    let totalMissingPunches = 0;
    let totalOtHours = 0;

    for (const day of attendanceDays) {
      const inPunch = day.check_in;
      const outPunch = day.check_out;

      const isMissingPunch = Boolean(day.missing_punch || (day.status === 'WorkDay' && (!inPunch || !outPunch)));
      const lateMins = day.late_minutes || 0;
      const earlyMins = day.early_minutes || 0;
      const otHours = Number(day.overtime_hours || 0);

      totalLateMins += lateMins;
      totalEarlyMins += earlyMins;
      if (isMissingPunch) totalMissingPunches++;
      totalOtHours += otHours;

      const dateStr = new Date(day.work_date).toISOString().slice(0, 10);
      const row = sheet.addRow([
        day.employee?.employee_code || '',
        day.employee?.name || '',
        day.employee?.contracts?.[0]?.department?.name || 'General',
        dateStr,
        day.shift?.name || 'Standard 8h',
        day.shift?.start_time ? String(day.shift.start_time).slice(0, 5) : '08:00',
        day.shift?.end_time ? String(day.shift.end_time).slice(0, 5) : '17:00',
        inPunch ? new Date(inPunch).toISOString().slice(11, 16) : '—',
        outPunch ? new Date(outPunch).toISOString().slice(11, 16) : '—',
        lateMins,
        earlyMins,
        isMissingPunch ? 'YES' : 'NO',
        otHours.toFixed(2),
        day.status || 'Present',
      ]);

      row.eachCell((cell, colNum) => {
        cell.border = BORDER_STYLE;
        cell.font = { name: 'Calibri', size: 10 };
        if (colNum >= 10 && colNum <= 13) {
          cell.alignment = { horizontal: 'right' };
        } else if (colNum === 4 || colNum === 14) {
          cell.alignment = { horizontal: 'center' };
        }
      });
    }

    // Totals row
    const totalRow = sheet.addRow([
      'Total Records',
      `${attendanceDays.length} records`,
      '',
      '',
      '',
      '',
      '',
      '',
      'TOTALS:',
      totalLateMins,
      totalEarlyMins,
      totalMissingPunches,
      totalOtHours.toFixed(2),
      '',
    ]);
    totalRow.height = 22;
    totalRow.font = { name: 'Calibri', size: 10, bold: true };
    totalRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.border = BORDER_STYLE;
    });

    sheet.columns = [
      { width: 16 }, // Emp Code
      { width: 24 }, // Emp Name
      { width: 20 }, // Dept
      { width: 14 }, // Date
      { width: 16 }, // Shift
      { width: 14 }, // Sched In
      { width: 14 }, // Sched Out
      { width: 12 }, // Actual In
      { width: 12 }, // Actual Out
      { width: 14 }, // Late Mins
      { width: 16 }, // Early Mins
      { width: 16 }, // Missing
      { width: 16 }, // OT
      { width: 16 }, // Status
    ];

    return await workbook.xlsx.writeBuffer();
  }

  /**
   * 2. Leave Report (Excel)
   * Leave taken, balances and upcoming leave by employee, department and leave type
   */
  async generateLeaveReportExcel({ companyId, year = null, departmentId = null, leaveTypeId = null, companyVisaId = null, viewer = null }) {
    const targetYear = year ? parseInt(year, 10) : new Date().getUTCFullYear();
    const yearStart = new Date(Date.UTC(targetYear, 0, 1));
    const yearEnd = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59));

    const scope = scopeService.resolveDataScope(viewer);
    const scopeWhere = scopeService.buildEmployeeWhere(scope, companyVisaId);

    const empWhere = {
      company_id: companyId,
      status: 'Active',
      ...(scopeWhere || {}),
    };
    if (departmentId) {
      empWhere.department_id = departmentId;
    }

    const [company, employees, leaveTypes, allocations, leaveRequests] = await Promise.all([
      this.prisma.$base().companies.findUnique({ where: { id: companyId } }),
      this.prisma.$base().employees.findMany({
        where: empWhere,
        include: {
          contracts: { where: { status: 'Active' }, include: { department: true }, take: 1 },
        },
        orderBy: [{ employee_code: 'asc' }],
      }),
      this.prisma.$base().leave_types.findMany({
        where: { company_id: companyId, ...(leaveTypeId ? { id: leaveTypeId } : {}) },
      }),
      this.prisma.$base().leave_allocations.findMany({
        where: {
          company_id: companyId,
          valid_from: { lte: yearEnd },
          valid_to: { gte: yearStart },
          ...(leaveTypeId ? { leave_type_id: leaveTypeId } : {}),
        },
      }),
      this.prisma.$base().leave_requests.findMany({
        where: {
          company_id: companyId,
          date_from: { gte: yearStart },
          date_to: { lte: yearEnd },
        },
      }),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Nextal HR Platform';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Leave Report', { views: [{ showGridLines: true }] });

    sheet.mergeCells('A1:J1');
    const title = sheet.getCell('A1');
    title.value = `${company?.name || 'Company'} — Annual Leave Summary & Balances (${targetYear})`;
    title.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    title.fill = HEADER_FILL;
    title.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 28;

    const headers = [
      'Employee Code',
      'Employee Name',
      'Department',
      'Leave Type',
      'Annual Entitlement (Days)',
      'Opening Balance',
      'Accrued',
      'Taken (Approved)',
      'Remaining Balance',
      'Upcoming (Days)',
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.font = HEADER_FONT;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = BORDER_STYLE;
    });

    const now = new Date();

    for (const emp of employees) {
      for (const lt of leaveTypes) {
        const alloc = allocations.find((a) => a.employee_id === emp.id && a.leave_type_id === lt.id);
        const empRequests = leaveRequests.filter((r) => r.employee_id === emp.id && r.leave_type_id === lt.id);

        const takenDays = empRequests
          .filter((r) => r.status === 'Approved' || r.status === 'COMPLETED')
          .reduce((sum, r) => sum + Number(r.days || 0), 0);

        const upcomingDays = empRequests
          .filter((r) => r.status === 'Approved' && new Date(r.date_from) > now)
          .reduce((sum, r) => sum + Number(r.days || 0), 0);

        const entitlement = Number(alloc?.days_allocated || lt.days_per_year || 30);
        const opening = Number(alloc?.carry_over_days || 0);
        const accrued = entitlement;
        const balance = alloc ? (Number(alloc.days_allocated) - Number(alloc.days_taken)) : Math.max(0, accrued - takenDays);

        const row = sheet.addRow([
          emp.employee_code,
          emp.name,
          emp.contracts?.[0]?.department?.name || 'General',
          lt.name,
          entitlement.toFixed(1),
          opening.toFixed(1),
          accrued.toFixed(1),
          takenDays.toFixed(1),
          balance.toFixed(1),
          upcomingDays.toFixed(1),
        ]);

        row.eachCell((cell, colNum) => {
          cell.border = BORDER_STYLE;
          cell.font = { name: 'Calibri', size: 10 };
          if (colNum >= 5) {
            cell.alignment = { horizontal: 'right' };
          }
        });
      }
    }

    sheet.columns = [
      { width: 16 }, // Emp Code
      { width: 24 }, // Name
      { width: 20 }, // Dept
      { width: 18 }, // Type
      { width: 22 }, // Entitlement
      { width: 18 }, // Opening
      { width: 16 }, // Accrued
      { width: 18 }, // Taken
      { width: 20 }, // Remaining
      { width: 18 }, // Upcoming
    ];

    return await workbook.xlsx.writeBuffer();
  }

  /**
   * 3. Headcount & Attrition Report (Dashboard JSON & Excel)
   * Joiners, leavers, by department and nationality
   */
  async getHeadcountReportData({ companyId, year = null, companyVisaId = null, viewer = null }) {
    const targetYear = year ? parseInt(year, 10) : new Date().getUTCFullYear();
    const yearStart = new Date(Date.UTC(targetYear, 0, 1));
    const yearEnd = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59));

    const scope = scopeService.resolveDataScope(viewer);
    const scopeWhere = scopeService.buildEmployeeWhere(scope, companyVisaId);

    const empWhere = {
      company_id: companyId,
      ...(scopeWhere || {}),
    };

    const [allEmployees, departments] = await Promise.all([
      this.prisma.$base().employees.findMany({
        where: empWhere,
        include: {
          contracts: {
            where: { status: { in: ['Approved', 'Active'] } },
            include: { department: true },
            orderBy: { version_no: 'desc' },
            take: 1,
          },
          separations: { where: { status: 'Approved' }, take: 1 },
        },
      }),
      this.prisma.$base().departments.findMany({
        where: { company_id: companyId },
      }),
    ]);

    const activeEmployees = allEmployees.filter((e) => e.status === 'Active');
    const joiners = allEmployees.filter((e) => {
      const jd = new Date(e.joining_date);
      return jd >= yearStart && jd <= yearEnd;
    });
    const leavers = allEmployees.filter((e) => {
      const isLeaverStatus = e.status === 'Archived' || e.status === 'Separated' || e.separations?.length > 0;
      if (!isLeaverStatus) return false;
      const leaveDate = e.end_date || e.separations?.[0]?.last_working_day || e.updated_at;
      if (!leaveDate) return true;
      const ed = new Date(leaveDate);
      return ed >= yearStart && ed <= yearEnd;
    });

    const turnoverRate = activeEmployees.length > 0
      ? Number(((leavers.length / (activeEmployees.length + leavers.length)) * 100).toFixed(1))
      : 0;

    // By Department
    const departmentMap = {};
    for (const d of departments) {
      departmentMap[d.id] = { departmentId: d.id, name: d.name, active: 0, joiners: 0, leavers: 0 };
    }
    for (const e of activeEmployees) {
      const activeContract = e.contracts?.[0];
      const did = activeContract?.department_id || 'unassigned';
      if (!departmentMap[did]) {
        departmentMap[did] = { departmentId: did, name: activeContract?.department?.name || 'Unassigned', active: 0, joiners: 0, leavers: 0 };
      }
      departmentMap[did].active++;
    }
    for (const j of joiners) {
      const did = j.contracts?.[0]?.department_id || 'unassigned';
      if (departmentMap[did]) departmentMap[did].joiners++;
    }
    for (const l of leavers) {
      const did = l.contracts?.[0]?.department_id || 'unassigned';
      if (departmentMap[did]) departmentMap[did].leavers++;
    }

    // By Nationality (stored as ISO code, mapped to localized names)
    const nationalityMap = {};
    for (const e of activeEmployees) {
      const nat = e.nationality || 'Other';
      if (!nationalityMap[nat]) nationalityMap[nat] = 0;
      nationalityMap[nat]++;
    }

    // Monthly trends (1-12)
    const monthlyTrends = Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      const monthJoiners = joiners.filter((e) => new Date(e.joining_date).getUTCMonth() === i).length;
      const monthLeavers = leavers.filter((e) => {
        const lDate = e.end_date || e.separations?.[0]?.last_working_day || e.updated_at;
        return lDate && new Date(lDate).getUTCMonth() === i;
      }).length;
      return {
        month: monthNum,
        monthName: new Date(Date.UTC(targetYear, i, 1)).toLocaleString('en-US', { month: 'short' }),
        joiners: monthJoiners,
        leavers: monthLeavers,
      };
    });

    return {
      year: targetYear,
      activeHeadcount: activeEmployees.length,
      joinersCount: joiners.length,
      leaversCount: leavers.length,
      turnoverRate,
      departments: Object.values(departmentMap),
      nationalities: Object.entries(nationalityMap).map(([code, count]) => ({
        code,
        nationality: NATIONALITY_NAMES[code]?.en || code,
        nationality_ar: NATIONALITY_NAMES[code]?.ar || code,
        count,
      })),
      monthlyTrends,
      joinersList: joiners.map((j) => ({
        id: j.id,
        employee_code: j.employee_code,
        name: j.name,
        department: j.contracts?.[0]?.department?.name,
        joining_date: j.joining_date,
        nationality: j.nationality,
      })),
      leaversList: leavers.map((l) => ({
        id: l.id,
        employee_code: l.employee_code,
        name: l.name,
        department: l.contracts?.[0]?.department?.name,
        end_date: l.end_date || l.separations?.[0]?.last_working_day,
        status: l.status,
      })),
    };
  }

  async generateHeadcountReportExcel({ companyId, year = null, companyVisaId = null, viewer = null }) {
    const data = await this.getHeadcountReportData({ companyId, year, companyVisaId, viewer });
    const company = await this.prisma.$base().companies.findUnique({ where: { id: companyId } });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Nextal HR Platform';
    workbook.created = new Date();

    // Sheet 1: Summary & Department Breakdown
    const sheet1 = workbook.addWorksheet('Summary & Departments', { views: [{ showGridLines: true }] });

    sheet1.mergeCells('A1:E1');
    const title1 = sheet1.getCell('A1');
    title1.value = `${company?.name || 'Company'} — Headcount & Attrition Report (${data.year})`;
    title1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    title1.fill = HEADER_FILL;
    title1.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet1.getRow(1).height = 28;

    sheet1.addRow(['Active Headcount', data.activeHeadcount]);
    sheet1.addRow(['Joiners This Year', data.joinersCount]);
    sheet1.addRow(['Leavers This Year', data.leaversCount]);
    sheet1.addRow(['Turnover Rate', `${data.turnoverRate}%`]);
    sheet1.addRow([]);

    const deptHeader = sheet1.addRow(['Department', 'Active Headcount', 'Joiners', 'Leavers', 'Retention %']);
    deptHeader.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.font = HEADER_FONT;
      cell.border = BORDER_STYLE;
    });

    for (const d of data.departments) {
      const total = d.active + d.leavers;
      const retention = total > 0 ? ((d.active / total) * 100).toFixed(1) + '%' : '100%';
      const row = sheet1.addRow([d.name, d.active, d.joiners, d.leavers, retention]);
      row.eachCell((cell) => {
        cell.border = BORDER_STYLE;
        cell.font = { name: 'Calibri', size: 10 };
      });
    }

    sheet1.columns = [{ width: 28 }, { width: 18 }, { width: 16 }, { width: 16 }, { width: 16 }];

    // Sheet 2: Nationality Breakdown
    const sheet2 = workbook.addWorksheet('Nationality Breakdown', { views: [{ showGridLines: true }] });
    const natHeader = sheet2.addRow(['Nationality', 'Active Employees', 'Percentage']);
    natHeader.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.font = HEADER_FONT;
      cell.border = BORDER_STYLE;
    });
    for (const n of data.nationalities) {
      const pct = data.activeHeadcount > 0 ? ((n.count / data.activeHeadcount) * 100).toFixed(1) + '%' : '0%';
      const r = sheet2.addRow([n.nationality, n.count, pct]);
      r.eachCell((cell) => {
        cell.border = BORDER_STYLE;
        cell.font = { name: 'Calibri', size: 10 };
      });
    }
    sheet2.columns = [{ width: 24 }, { width: 18 }, { width: 16 }];

    return await workbook.xlsx.writeBuffer();
  }

  /**
   * 4. Accounting Export (CSV)
   * Debit and credit per salary rule by cost centre, from Locked runs only.
   * Debits must strictly equal credits; fails otherwise.
   */
  async generateAccountingExportCsv({ companyId, payRunId, viewer = null }) {
    const payRun = await this.prisma.$base().pay_runs.findUnique({
      where: { id: payRunId },
      include: {
        company_visa: true,
        payslips: {
          include: {
            employee: {
              include: {
                contracts: {
                  where: { status: { in: ['Approved', 'Active'] } },
                  include: { department: true },
                  orderBy: { version_no: 'desc' },
                  take: 1,
                },
              },
            },
            lines: {
              include: { salary_rule: true },
            },
          },
        },
      },
    });

    if (!payRun || payRun.company_id !== companyId) {
      const err = new Error('Pay run not found');
      err.status = 404;
      throw err;
    }

    if (viewer) {
      const scope = scopeService.resolveDataScope(viewer);
      if (!scope.all && scope.visaIds && scope.visaIds.length > 0) {
        if (!scope.visaIds.includes(payRun.company_visa_id)) {
          const err = new Error('Pay run not found');
          err.status = 404;
          err.code = 'NOT_FOUND';
          throw err;
        }
      }
    }

    // Status check: MUST be Locked or Paid
    if (payRun.status !== 'Locked' && payRun.status !== 'Paid') {
      const err = new Error(`Accounting export is only permitted for Locked or Paid pay runs (current status: '${payRun.status}')`);
      err.status = 400;
      err.code = 'INVALID_RUN_STATUS_FOR_EXPORT';
      throw err;
    }

    // Chart of accounts mapping per salary rule category
    // Standard UAE ERP General Ledger mapping
    const GL_ACCOUNTS = {
      BASIC: { code: '5101', name: 'Salaries & Wages — Basic', type: 'EXPENSE' },
      HRA: { code: '5102', name: 'Housing Allowance Expense', type: 'EXPENSE' },
      TRA: { code: '5103', name: 'Transport Allowance Expense', type: 'EXPENSE' },
      OTH: { code: '5104', name: 'Other Allowances Expense', type: 'EXPENSE' },
      OT: { code: '5105', name: 'Overtime Expense', type: 'EXPENSE' },
      ABS: { code: '5101', name: 'Salaries & Wages — Contra / Absence Offset', type: 'DEDUCTION_OFFSET' },
      UNPAID: { code: '5101', name: 'Salaries & Wages — Contra / Unpaid Leave', type: 'DEDUCTION_OFFSET' },
      LATE_DED: { code: '5101', name: 'Salaries & Wages — Contra / Late Deduction', type: 'DEDUCTION_OFFSET' },
      LOAN: { code: '1150', name: 'Employee Loans & Advances Receivable', type: 'ASSET_CREDIT' },
      GPSSA: { code: '2105', name: 'GPSSA Pension Payable', type: 'LIABILITY_CREDIT' },
      SALARY_PAYABLE: { code: '2101', name: 'Accrued Payroll & Salaries Payable', type: 'NET_PAYABLE' },
    };

    // Aggregate debits and credits by (Cost Centre / Department, Rule Code)
    const aggregated = {};

    let totalNetPay = new Decimal(0);

    for (const ps of payRun.payslips) {
      const dept = ps.employee?.contracts?.[0]?.department;
      const costCentreCode = dept?.cost_centre || 'CC-OPS';
      const costCentre = dept ? `${dept.cost_centre} - ${dept.name}` : 'CC-OPS - Operations';
      totalNetPay = totalNetPay.plus(new Decimal(ps.net || 0));

      for (const line of ps.lines) {
        const ruleCode = line.code;
        // Skip summary lines; journal entries are for component rules
        if (ruleCode === 'GROSS' || ruleCode === 'NET' || ruleCode === 'TOTAL_DEDUCTIONS' || ruleCode === 'NET_PAY') {
          continue;
        }

        const amount = new Decimal(line.amount || 0).abs();
        if (amount.isZero()) continue;

        const isDeduction = line.salary_rule?.category === 'Deduction' || ['ABS', 'UNPAID', 'LATE_DED', 'LOAN', 'GPSSA', 'DEDUCTION'].includes(ruleCode);

        const glInfo = GL_ACCOUNTS[ruleCode] || {
          code: !isDeduction ? '5199' : '2199',
          name: line.name || line.salary_rule?.name || ruleCode,
          type: !isDeduction ? 'EXPENSE' : 'DEDUCTION_OFFSET',
        };

        const key = `${costCentre}|${glInfo.code}|${ruleCode}`;
        if (!aggregated[key]) {
          aggregated[key] = {
            costCentre,
            costCentreCode,
            accountCode: glInfo.code,
            accountName: glInfo.name,
            ruleCode,
            ruleName: line.name || line.salary_rule?.name || ruleCode,
            debit: new Decimal(0),
            credit: new Decimal(0),
          };
        }

        if (ruleCode === 'GPSSA_ER') {
          // Employer GPSSA is both a DEBIT (Pension Expense) and a CREDIT (GPSSA Payable)
          const debitKey = `${costCentre}|5105|GPSSA_ER_EXP`;
          if (!aggregated[debitKey]) {
            aggregated[debitKey] = {
              costCentre,
              costCentreCode,
              accountCode: '5105',
              accountName: 'GPSSA Employer Pension Expense',
              ruleCode: 'GPSSA_ER',
              ruleName: 'GPSSA Employer Pension Expense',
              debit: new Decimal(0),
              credit: new Decimal(0),
            };
          }
          aggregated[debitKey].debit = aggregated[debitKey].debit.plus(amount);

          const creditKey = `Corporate / Treasury|2105|GPSSA_ER_PAY`;
          if (!aggregated[creditKey]) {
            aggregated[creditKey] = {
              costCentre: 'Corporate / Treasury',
              costCentreCode: 'CC-TREASURY',
              accountCode: '2105',
              accountName: 'GPSSA Pension Payable',
              ruleCode: 'GPSSA_ER',
              ruleName: 'GPSSA Employer Pension Payable',
              debit: new Decimal(0),
              credit: new Decimal(0),
            };
          }
          aggregated[creditKey].credit = aggregated[creditKey].credit.plus(amount);
        } else if (!isDeduction) {
          // Earnings are DEBITed to departmental expense accounts
          aggregated[key].debit = aggregated[key].debit.plus(amount);
        } else {
          // Deductions are CREDITed (offsetting expense or clearing loan asset)
          aggregated[key].credit = aggregated[key].credit.plus(amount);
        }
      }
    }

    // Add Net Salaries Payable entry (CREDIT to Accrued Payroll 2101)
    const netKey = `Company-Wide|${GL_ACCOUNTS.SALARY_PAYABLE.code}|NET_PAY`;
    aggregated[netKey] = {
      costCentre: 'Corporate / Treasury',
      costCentreCode: 'CC-TREASURY',
      accountCode: GL_ACCOUNTS.SALARY_PAYABLE.code,
      accountName: GL_ACCOUNTS.SALARY_PAYABLE.name,
      ruleCode: 'NET_PAY',
      ruleName: 'Net Salaries Payable to Employees',
      debit: new Decimal(0),
      credit: totalNetPay,
    };

    // Calculate total debits and credits
    let sumDebit = new Decimal(0);
    let sumCredit = new Decimal(0);

    const rows = Object.values(aggregated).map((item) => {
      sumDebit = sumDebit.plus(item.debit);
      sumCredit = sumCredit.plus(item.credit);
      return item;
    });

    const diff = sumDebit.minus(sumCredit).abs();
    // Strict verification: debits MUST equal credits
    if (diff.greaterThan(new Decimal('0.02'))) {
      const err = new Error(
        `Accounting export out of balance: Total Debit (${sumDebit.toFixed(2)}) does not equal Total Credit (${sumCredit.toFixed(2)}). Discrepancy: ${diff.toFixed(2)}`
      );
      err.status = 400;
      err.code = 'UNBALANCED_JOURNAL_ENTRIES';
      throw err;
    }

    // Format CSV
    const csvLines = [
      'Cost Centre,Account Code,Account Name,Rule Code,Rule Name,Description,Debit,Credit',
    ];

    const periodStr = typeof payRun.period_month === 'string'
      ? payRun.period_month.slice(0, 7)
      : new Date(payRun.period_month).toISOString().slice(0, 7);
    const visaLabel = payRun.company_visa?.name || 'All Visas';

    for (const r of rows) {
      const description = `Payroll Journal ${periodStr} [${visaLabel}] — ${r.ruleName}`;
      const debitStr = r.debit.greaterThan(0) ? r.debit.toFixed(2) : '0.00';
      const creditStr = r.credit.greaterThan(0) ? r.credit.toFixed(2) : '0.00';

      const line = [
        `"${r.costCentre}"`,
        `"${r.accountCode}"`,
        `"${r.accountName}"`,
        `"${r.ruleCode}"`,
        `"${r.ruleName}"`,
        `"${description}"`,
        debitStr,
        creditStr,
      ].join(',');

      csvLines.push(line);
    }

    // Totals line
    csvLines.push(`"TOTAL",,,,,,"${sumDebit.toFixed(2)}","${sumCredit.toFixed(2)}"`);

    return {
      csv: csvLines.join('\r\n'),
      totalDebit: sumDebit.toNumber(),
      totalCredit: sumCredit.toNumber(),
      payRunId,
      period: periodStr,
    };
  }

  /**
   * 5. Gratuity Provision Report (Excel)
   * Monthly accrual per employee for Finance
   */
  async generateGratuityProvisionExcel({ companyId, asOfDate = new Date() }) {
    const targetDate = new Date(asOfDate);
    const [company, employees] = await Promise.all([
      this.prisma.$base().companies.findUnique({ where: { id: companyId } }),
      this.prisma.$base().employees.findMany({
        where: { company_id: companyId, status: 'Active' },
        include: {
          contracts: { where: { status: 'Active' }, include: { department: true }, take: 1 },
          company_visa: { select: { name: true } },
        },
        orderBy: [{ employee_code: 'asc' }],
      }),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Nextal HR Platform';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Gratuity Provision', { views: [{ showGridLines: true }] });

    sheet.mergeCells('A1:J1');
    const title = sheet.getCell('A1');
    title.value = `${company?.name || 'Company'} — Monthly End of Service (Gratuity) Provision`;
    title.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    title.fill = HEADER_FILL;
    title.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 28;

    const headers = [
      'Employee Code',
      'Employee Name',
      'Department',
      'Visa Company',
      'Joining Date',
      'Years of Service',
      'Basic Salary (AED)',
      'Daily Basic (AED)',
      'Monthly Provision (AED)',
      'Cumulative Gratuity (AED)',
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.font = HEADER_FONT;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = BORDER_STYLE;
    });

    let totalMonthlyAccrual = new Decimal(0);
    let totalCumulativeGratuity = new Decimal(0);

    for (const emp of employees) {
      const basic = new Decimal(emp.contracts?.[0]?.basic || 0);
      const dailyBasic = basic.dividedBy(30);

      const joining = new Date(emp.joining_date);
      const tenureMs = targetDate.getTime() - joining.getTime();
      const tenureYears = Math.max(0, tenureMs / (365.25 * 24 * 60 * 60 * 1000));

      let monthlyAccrual = new Decimal(0);
      let cumulative = new Decimal(0);

      // UAE Labour Law Article 51:
      // First 5 years: 21 days basic salary per year
      // Over 5 years: 30 days basic salary per year
      if (tenureYears >= 1) {
        if (tenureYears <= 5) {
          cumulative = dailyBasic.times(21).times(tenureYears);
          monthlyAccrual = dailyBasic.times(21).dividedBy(12);
        } else {
          const first5Years = dailyBasic.times(21).times(5);
          const after5Years = dailyBasic.times(30).times(tenureYears - 5);
          cumulative = first5Years.plus(after5Years);
          monthlyAccrual = dailyBasic.times(30).dividedBy(12);
        }
      } else {
        // Less than 1 year: accrual accumulates provisionally for monthly accounting
        monthlyAccrual = dailyBasic.times(21).dividedBy(12);
        cumulative = dailyBasic.times(21).times(tenureYears);
      }

      totalMonthlyAccrual = totalMonthlyAccrual.plus(monthlyAccrual);
      totalCumulativeGratuity = totalCumulativeGratuity.plus(cumulative);

      const row = sheet.addRow([
        emp.employee_code,
        emp.name,
        emp.contracts?.[0]?.department?.name || 'General',
        emp.company_visa?.name || 'Visa 1',
        new Date(emp.joining_date).toISOString().slice(0, 10),
        tenureYears.toFixed(2),
        basic.toFixed(2),
        dailyBasic.toFixed(2),
        monthlyAccrual.toFixed(2),
        cumulative.toFixed(2),
      ]);

      row.eachCell((cell, colNum) => {
        cell.border = BORDER_STYLE;
        cell.font = { name: 'Calibri', size: 10 };
        if (colNum >= 6) {
          cell.alignment = { horizontal: 'right' };
        }
      });
    }

    const totalRow = sheet.addRow([
      'TOTALS',
      `${employees.length} active employees`,
      '',
      '',
      '',
      '',
      '',
      '',
      totalMonthlyAccrual.toFixed(2),
      totalCumulativeGratuity.toFixed(2),
    ]);
    totalRow.height = 22;
    totalRow.font = { name: 'Calibri', size: 10, bold: true };
    totalRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.border = BORDER_STYLE;
    });

    sheet.columns = [
      { width: 16 }, // Code
      { width: 24 }, // Name
      { width: 20 }, // Dept
      { width: 20 }, // Visa
      { width: 14 }, // Joining
      { width: 16 }, // Years
      { width: 18 }, // Basic
      { width: 16 }, // Daily Basic
      { width: 22 }, // Monthly Accrual
      { width: 24 }, // Cumulative
    ];

    return await workbook.xlsx.writeBuffer();
  }

  /**
   * 6. Leave Liability Report (Excel)
   * Unused leave × daily basic per employee for Finance
   */
  async generateLeaveLiabilityExcel({ companyId, asOfDate = new Date() }) {
    const targetDate = new Date(asOfDate);
    const targetYear = targetDate.getUTCFullYear();

    const [company, employees, annualLeaveType, allocations] = await Promise.all([
      this.prisma.$base().companies.findUnique({ where: { id: companyId } }),
      this.prisma.$base().employees.findMany({
        where: { company_id: companyId, status: 'Active' },
        include: {
          contracts: { where: { status: 'Active' }, include: { department: true }, take: 1 },
          company_visa: { select: { name: true } },
        },
        orderBy: [{ employee_code: 'asc' }],
      }),
      this.prisma.$base().leave_types.findFirst({
        where: { company_id: companyId, code: 'ANNUAL' },
      }),
      this.prisma.$base().leave_allocations.findMany({
        where: {
          company_id: companyId,
          valid_from: { lte: targetDate },
          valid_to: { gte: targetDate },
        },
      }),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Nextal HR Platform';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Leave Liability', { views: [{ showGridLines: true }] });

    sheet.mergeCells('A1:I1');
    const title = sheet.getCell('A1');
    title.value = `${company?.name || 'Company'} — Annual Leave Encashment / Accrued Liability`;
    title.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    title.fill = HEADER_FILL;
    title.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 28;

    const headers = [
      'Employee Code',
      'Employee Name',
      'Department',
      'Visa Company',
      'Basic Salary (AED)',
      'Daily Basic (AED)',
      'Annual Entitlement (Days)',
      'Unused Balance (Days)',
      'Total Leave Liability (AED)',
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.font = HEADER_FONT;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = BORDER_STYLE;
    });

    let grandTotalLiability = new Decimal(0);
    let totalUnusedDays = new Decimal(0);

    for (const emp of employees) {
      const basic = new Decimal(emp.contracts?.[0]?.basic || 0);
      const dailyBasic = basic.dividedBy(30);

      const alloc = allocations.find(
        (a) => a.employee_id === emp.id && (!annualLeaveType || a.leave_type_id === annualLeaveType.id)
      );

      const balanceDays = alloc
        ? new Decimal(Number(alloc.days_allocated) - Number(alloc.days_taken))
        : new Decimal(30);
      const liabilityAmount = dailyBasic.times(balanceDays);

      totalUnusedDays = totalUnusedDays.plus(balanceDays);
      grandTotalLiability = grandTotalLiability.plus(liabilityAmount);

      const row = sheet.addRow([
        emp.employee_code,
        emp.name,
        emp.contracts?.[0]?.department?.name || 'General',
        emp.company_visa?.name || 'Visa 1',
        basic.toFixed(2),
        dailyBasic.toFixed(2),
        (alloc ? Number(alloc.days_allocated) : 30).toFixed(1),
        balanceDays.toFixed(1),
        liabilityAmount.toFixed(2),
      ]);

      row.eachCell((cell, colNum) => {
        cell.border = BORDER_STYLE;
        cell.font = { name: 'Calibri', size: 10 };
        if (colNum >= 5) {
          cell.alignment = { horizontal: 'right' };
        }
      });
    }

    const totalRow = sheet.addRow([
      'TOTALS',
      `${employees.length} active employees`,
      '',
      '',
      '',
      '',
      '',
      totalUnusedDays.toFixed(1),
      grandTotalLiability.toFixed(2),
    ]);
    totalRow.height = 22;
    totalRow.font = { name: 'Calibri', size: 10, bold: true };
    totalRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.border = BORDER_STYLE;
    });

    sheet.columns = [
      { width: 16 }, // Code
      { width: 24 }, // Name
      { width: 20 }, // Dept
      { width: 20 }, // Visa
      { width: 18 }, // Basic
      { width: 16 }, // Daily Basic
      { width: 22 }, // Entitlement
      { width: 20 }, // Balance
      { width: 24 }, // Liability
    ];

    return await workbook.xlsx.writeBuffer();
  }
}

export const reportService = new ReportService();
export default reportService;

