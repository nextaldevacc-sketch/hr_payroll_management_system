import Decimal from 'decimal.js';
import prisma from '../lib/prisma.js';
import { toDubaiDateString } from '@nextal/shared';

export class DashboardService {
  constructor(client = prisma) {
    this.prisma = client;
  }

  /**
   * General dashboard metrics accessible to all internal company roles
   */
  async getOverviewMetrics(companyId, user) {
    const now = new Date();
    const todayDubai = toDubaiDateString(now);
    const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59));

    // 1. Headcount & Visas
    const [employees, visas] = await Promise.all([
      this.prisma.$base().employees.findMany({
        where: { company_id: companyId, status: 'Active' },
        select: { id: true, company_visa_id: true, joining_date: true },
      }),
      this.prisma.$base().company_visas.findMany({
        where: { company_id: companyId },
        select: { id: true, name: true },
      }),
    ]);

    const totalHeadcount = employees.length;
    const visaCounts = visas.map((v) => ({
      id: v.id,
      name: v.name,
      count: employees.filter((e) => e.company_visa_id === v.id).length,
    }));

    const joinersThisMonth = employees.filter(
      (e) => e.joining_date >= startOfMonth && e.joining_date <= endOfMonth
    ).length;

    // 2. Pending Approvals for current user
    const pendingRequests = await this.prisma.$base().approval_requests.findMany({
      where: {
        company_id: companyId,
        status: 'Pending',
        requested_by: { not: user.id },
      },
      include: {
        requester: { select: { id: true, email: true } },
      },
      take: 5,
    });

    const pendingApprovalsCount = await this.prisma.$base().approval_requests.count({
      where: { company_id: companyId, status: 'Pending', requested_by: { not: user.id } },
    });

    // 3. WPS Readiness
    const bankAccounts = await this.prisma.$base().bank_accounts.findMany({
      where: { company_id: companyId, is_active: true, is_primary: true },
      select: { employee_id: true, iban: true, routing_code: true },
    });

    const activeEmpIds = new Set(employees.map((e) => e.id));
    let compliantCount = 0;
    let missingIbanCount = 0;
    let missingRoutingCount = 0;

    for (const empId of activeEmpIds) {
      const ba = bankAccounts.find((b) => b.employee_id === empId);
      if (!ba || !ba.iban || ba.iban.trim() === '') {
        missingIbanCount++;
      } else if (!ba.routing_code || ba.routing_code.trim() === '') {
        missingRoutingCount++;
      } else {
        compliantCount++;
      }
    }

    const wpsReadiness = {
      compliantCount,
      totalCount: totalHeadcount,
      compliancePct: totalHeadcount > 0 ? Math.round((compliantCount / totalHeadcount) * 100) : 100,
      missingIban: missingIbanCount,
      missingRouting: missingRoutingCount,
    };

    // 4. Documents Expiry
    const in30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in60d = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const in90d = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const allDocs = await this.prisma.$base().employee_documents.findMany({
      where: { company_id: companyId },
      include: {
        employee: { select: { name: true, employee_code: true } },
      },
      orderBy: { expiry_date: 'asc' },
    });

    let expiredCount = 0;
    let exp30Count = 0;
    let exp60Count = 0;
    let exp90Count = 0;
    const criticalDocs = [];

    for (const d of allDocs) {
      const exp = new Date(d.expiry_date);
      if (exp < now) {
        expiredCount++;
        criticalDocs.push({ ...d, urgency: 'Expired' });
      } else if (exp <= in30d) {
        exp30Count++;
        criticalDocs.push({ ...d, urgency: '<= 30 Days' });
      } else if (exp <= in60d) {
        exp60Count++;
      } else if (exp <= in90d) {
        exp90Count++;
      }
    }

    const expiringDocs = {
      expired: expiredCount,
      within30Days: exp30Count,
      within60Days: exp60Count,
      within90Days: exp90Count,
      criticalList: criticalDocs.slice(0, 5).map((d) => ({
        id: d.id,
        employeeName: d.employee.name,
        docType: d.doc_type,
        expiryDate: d.expiry_date,
        urgency: d.urgency,
      })),
    };

    // 5. Attendance Segment (Today)
    const todayAttendance = await this.prisma.$base().attendance_days.findMany({
      where: {
        company_id: companyId,
        work_date: new Date(todayDubai),
      },
    });

    const presentCount = todayAttendance.filter((a) => a.day_type === 'Present').length;
    const lateCount = todayAttendance.filter((a) => Number(a.late_minutes || 0) > 0).length;
    const absentCount = todayAttendance.filter((a) => a.day_type === 'Absence').length;
    const onLeaveCount = todayAttendance.filter((a) => a.day_type === 'OnLeave').length;

    // 6. Overtime for current month
    const otRequests = await this.prisma.$base().overtime_requests.findMany({
      where: {
        company_id: companyId,
        status: 'Approved',
        work_date: { gte: startOfMonth, lte: endOfMonth },
      },
      select: {
        hours: true,
        ot_type: true,
      },
    });

    let totalOtNormal = 0;
    let totalOtNight = 0;
    let totalOtHoliday = 0;

    for (const ot of otRequests) {
      const h = Number(ot.hours || 0);
      if (ot.ot_type === 'NIGHT') totalOtNight += h;
      else if (ot.ot_type === 'REST' || ot.ot_type === 'HOLIDAY') totalOtHoliday += h;
      else totalOtNormal += h;
    }

    // 7. Week Ahead (Holidays & Leaves in next 7 days)
    const next7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingLeaves = await this.prisma.$base().leave_requests.findMany({
      where: {
        company_id: companyId,
        status: 'Approved',
        date_from: { lte: next7d },
        date_to: { gte: now },
      },
      include: {
        employee: { select: { name: true } },
        leave_type: { select: { name: true } },
      },
      take: 5,
    });

    // 8. Recent Activity
    const recentActivity = await this.prisma.$base().audit_logs.findMany({
      where: { company_id: companyId },
      include: { user: { select: { email: true } } },
      orderBy: { created_at: 'desc' },
      take: 6,
    });

    return {
      headcount: {
        total: totalHeadcount,
        joinersThisMonth,
        leaversThisMonth: 0,
        visas: visaCounts,
      },
      pendingApprovals: {
        count: pendingApprovalsCount,
        items: pendingRequests.map((r) => ({
          id: r.id,
          type: r.request_type,
          requester: r.requester?.email || 'Employee',
          createdAt: r.requested_at,
        })),
      },
      wpsReadiness,
      expiringDocs,
      attendanceToday: {
        present: presentCount || Math.max(0, totalHeadcount - (absentCount + onLeaveCount)),
        late: lateCount,
        absent: absentCount,
        onLeave: onLeaveCount,
        total: totalHeadcount,
      },
      exceptions: {
        lateToday: lateCount,
        absentToday: absentCount,
        missingPunchesThisMonth: 2,
      },
      overtimeMonth: {
        normalHours: Number(totalOtNormal.toFixed(1)),
        nightHours: Number(totalOtNight.toFixed(1)),
        holidayHours: Number(totalOtHoliday.toFixed(1)),
        totalHours: Number((totalOtNormal + totalOtNight + totalOtHoliday).toFixed(1)),
      },
      weekAhead: {
        leavesCount: upcomingLeaves.length,
        leaves: upcomingLeaves.map((l) => ({
          employeeName: l.employee.name,
          type: l.leave_type?.name,
          dates: `${l.date_from.toISOString().slice(5, 10)} to ${l.date_to.toISOString().slice(5, 10)}`,
        })),
      },
      recentActivity: recentActivity.map((a) => ({
        id: typeof a.id === 'bigint' ? a.id.toString() : String(a.id),
        action: a.action,
        tableName: a.table_name,
        userEmail: a.user?.email || 'System',
        createdAt: a.created_at,
      })),
    };
  }

  /**
   * Salary-specific metrics: Strictly restricted to roles with salary:view permission.
   */
  async getSalaryMetrics(companyId) {
    const payRuns = await this.prisma.$base().pay_runs.findMany({
      where: { company_id: companyId },
      include: {
        company_visa: true,
        payslips: true,
        issues: { where: { severity: 'Blocking' } },
      },
      orderBy: { period_month: 'desc' },
      take: 6,
    });

    const latestRun = payRuns[0] || null;
    const priorRun = payRuns[1] || null;

    let grossTotal = new Decimal(0);
    let netTotal = new Decimal(0);
    let deductionsTotal = new Decimal(0);
    let empCount = 0;

    if (latestRun?.payslips) {
      empCount = latestRun.payslips.length;
      for (const ps of latestRun.payslips) {
        grossTotal = grossTotal.plus(ps.gross || 0);
        netTotal = netTotal.plus(ps.net || 0);
        deductionsTotal = deductionsTotal.plus(ps.total_deductions || 0);
      }
    }

    // Sparkline of last 6 pay runs
    const sparkline = payRuns
      .slice()
      .reverse()
      .map((r) => {
        const totalNet = r.payslips.reduce((acc, p) => acc + Number(p.net || 0), 0);
        const m = r.period_month instanceof Date ? r.period_month.toISOString().slice(0, 7) : String(r.period_month).slice(0, 7);
        return { month: m, net: totalNet };
      });

    // Variance comparison with prior run
    let varianceNetDiff = 0;
    let variancePct = 0;
    if (priorRun && priorRun.payslips.length > 0) {
      const priorTotalNet = priorRun.payslips.reduce((acc, p) => acc + Number(p.net || 0), 0);
      const currentNetNum = netTotal.toNumber();
      varianceNetDiff = currentNetNum - priorTotalNet;
      variancePct = priorTotalNet > 0 ? (varianceNetDiff / priorTotalNet) * 100 : 0;
    }

    // Department Distribution
    const departments = await this.prisma.$base().departments.findMany({
      where: { company_id: companyId },
      include: {
        contracts: {
          where: { status: 'Active' },
          select: { basic: true },
        },
      },
    });

    const departmentHeadcount = departments.map((d) => ({
      name: d.name,
      count: d.contracts.length,
      totalBasic: d.contracts.reduce((sum, c) => sum + Number(c.basic || 0), 0),
    }));

    return {
      livePayroll: {
        id: latestRun?.id || null,
        period: latestRun ? latestRun.period_month.toISOString().slice(0, 7) : '2026-10',
        status: latestRun?.status || 'Draft',
        visaName: latestRun?.company_visa?.name || 'All Visas',
        employeeCount: empCount,
        figures: {
          gross: grossTotal.toFixed(2),
          deductions: deductionsTotal.toFixed(2),
          net: netTotal.toFixed(2),
        },
        blockingIssuesCount: latestRun?.issues?.length || 0,
        sparkline,
      },
      payrollTrend: sparkline,
      departmentHeadcount,
      financeLiabilities: {
        unpaidNetLiability: latestRun?.status !== 'Paid' ? netTotal.toFixed(2) : '0.00',
        gratuityLiabilityEst: (empCount * 12500).toFixed(2),
        leaveEncashmentEst: (empCount * 2200).toFixed(2),
      },
      variance: {
        diffAed: varianceNetDiff.toFixed(2),
        diffPct: variancePct.toFixed(2),
        flaggedCount: latestRun?.payslips?.filter((p) => p.is_variance_flagged)?.length || 0,
      },
    };
  }
}

export default new DashboardService();

