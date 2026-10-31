'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BentoGrid } from '../../components/primitives/BentoGrid';
import { LivePayrollHeroTile } from '../../components/features/dashboard/LivePayrollHeroTile';
import { HeadcountTile } from '../../components/features/dashboard/HeadcountTile';
import { PendingApprovalsTile } from '../../components/features/dashboard/PendingApprovalsTile';
import { WpsReadinessTile } from '../../components/features/dashboard/WpsReadinessTile';
import { DocumentsExpiryTile } from '../../components/features/dashboard/DocumentsExpiryTile';
import { ExceptionsTile } from '../../components/features/dashboard/ExceptionsTile';
import { AttendanceSegmentTile } from '../../components/features/dashboard/AttendanceSegmentTile';
import { OvertimeTile } from '../../components/features/dashboard/OvertimeTile';
import { PayrollTrendTile } from '../../components/features/dashboard/PayrollTrendTile';
import { DepartmentChartTile } from '../../components/features/dashboard/DepartmentChartTile';
import { FinanceLiabilitiesTile } from '../../components/features/dashboard/FinanceLiabilitiesTile';
import { WeekAheadTile } from '../../components/features/dashboard/WeekAheadTile';
import { QuickActionsTile } from '../../components/features/dashboard/QuickActionsTile';
import { RecentActivityTile } from '../../components/features/dashboard/RecentActivityTile';
import { VarianceTile } from '../../components/features/dashboard/VarianceTile';

import { Drawer } from '../../components/primitives/Drawer';
import { Modal } from '../../components/primitives/Modal';
import { Button } from '../../components/primitives/form/Button';
import { mockDashboardData } from '../../lib/mockData';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getDashboardOverview, getDashboardSalary } from '../../services/dashboardApi';
import { RouteGuard } from '../../components/common/RouteGuard';
import { formatCurrency } from '@nextal/shared';
import {
  Upload,
  Play,
  FileCheck2,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { user, seesSalary } = useAuth();
  const [activeDrawer, setActiveDrawer] = useState(null);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);

  const [overviewData, setOverviewData] = useState(null);
  const [salaryData, setSalaryData] = useState(null);
  const [loading, setLoading] = useState(true);

  // If logged in as purely an employee, redirect to /me
  useEffect(() => {
    if (user?.roles?.includes('EMPLOYEE') && user?.roles?.length === 1) {
      router.push('/me');
    }
  }, [user, router]);

  // Fetch overview metrics for all authorized users
  const loadOverview = async () => {
    try {
      const data = await getDashboardOverview();
      if (data) setOverviewData(data);
    } catch (e) {
      console.warn('Failed to fetch dashboard overview:', e.message);
    }
  };

  // Fetch salary metrics strictly for salary roles
  const loadSalary = async () => {
    if (!seesSalary) return;
    try {
      const data = await getDashboardSalary();
      if (data) setSalaryData(data);
    } catch (e) {
      console.warn('Failed to fetch dashboard salary metrics:', e.message);
    }
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([loadOverview(), seesSalary ? loadSalary() : Promise.resolve()]);
      setLoading(false);
    }
    init();

    // Live Payroll tile updates every 30 s (FR-DS / polling)
    if (seesSalary) {
      const interval = setInterval(loadSalary, 30000);
      return () => clearInterval(interval);
    }
  }, [seesSalary]);

  const handleQuickAction = (actionId) => {
    switch (actionId) {
      case 'import':
        setActiveDrawer('import');
        break;
      case 'new-emp':
        router.push('/employees');
        break;
      case 'leave':
        router.push('/leave');
        break;
      case 'salary-adj':
        router.push('/payroll/adjustments');
        break;
      case 'holiday':
        router.push('/leave');
        break;
      case 'payrun':
        router.push('/payroll');
        break;
      default:
        break;
    }
  };

  // Map API data to tile schemas, falling back gracefully to mockData if API response pending
  const headcountData = overviewData?.headcount ? {
    total: overviewData.headcount.total,
    joiners: overviewData.headcount.joinersThisMonth || 0,
    leavers: overviewData.headcount.leaversThisMonth || 0,
    netChange: `+${overviewData.headcount.joinersThisMonth || 0} net this month`,
    nationalityMix: {
      uaeNationals: Math.round(overviewData.headcount.total * 0.1),
      expats: Math.round(overviewData.headcount.total * 0.9),
      gpssaEligible: Math.round(overviewData.headcount.total * 0.1),
      uaePercent: 10,
      expatPercent: 90,
    },
  } : mockDashboardData.headcount;

  const pendingApprovalsData = overviewData?.pendingApprovals ? {
    total: overviewData.pendingApprovals.count,
    items: [
      { type: 'Leave Requests', count: overviewData.pendingApprovals.items.filter(i => i.type === 'Leave').length, code: 'leave' },
      { type: 'Overtime Hours', count: overviewData.pendingApprovals.items.filter(i => i.type === 'Overtime').length, code: 'ot' },
      { type: 'Salary Adjustments', count: 0, code: 'adj' },
      { type: 'Final Settlements', count: 0, code: 'settlement' },
    ],
    oldestItems: overviewData.pendingApprovals.items.map((i) => ({
      id: i.id,
      type: i.type,
      employee: i.requester,
      employeeAr: i.requester,
      avatar: i.requester.slice(0, 2).toUpperCase(),
      age: 'Pending',
      isOwn: false,
    })),
  } : mockDashboardData.pendingApprovals;

  const wpsData = overviewData?.wpsReadiness ? {
    percentage: overviewData.wpsReadiness.compliancePct,
    compliant: overviewData.wpsReadiness.compliantCount,
    total: overviewData.wpsReadiness.totalCount,
    readyCount: overviewData.wpsReadiness.compliantCount,
    needsAttentionCount: overviewData.wpsReadiness.missingIban + overviewData.wpsReadiness.missingRouting,
    issues: [
      { field: 'IBAN', count: overviewData.wpsReadiness.missingIban, label: 'Missing primary IBAN', severity: 'danger' },
      { field: 'Bank Routing', count: overviewData.wpsReadiness.missingRouting, label: 'Routing code unverified', severity: 'warning' },
    ],
  } : mockDashboardData.wpsReadiness;

  const expiringDocsData = overviewData?.expiringDocs ? {
    total: overviewData.expiringDocs.within90Days + overviewData.expiringDocs.expired,
    expired: overviewData.expiringDocs.expired,
    critical: overviewData.expiringDocs.within30Days,
    warning: overviewData.expiringDocs.within60Days,
    info: overviewData.expiringDocs.within90Days,
    nearestExpiry: overviewData.expiringDocs.criticalList?.[0] ? {
      name: overviewData.expiringDocs.criticalList[0].employeeName,
      nameAr: overviewData.expiringDocs.criticalList[0].employeeName,
      docType: overviewData.expiringDocs.criticalList[0].docType,
      days: 14,
    } : { name: 'None', nameAr: 'لا يوجد', docType: 'None', days: 99 },
  } : mockDashboardData.expiringDocs;

  const attendanceData = overviewData?.attendanceToday ? {
    present: overviewData.attendanceToday.present,
    late: overviewData.attendanceToday.late,
    absent: overviewData.attendanceToday.absent,
    onLeave: overviewData.attendanceToday.onLeave,
    total: overviewData.attendanceToday.total,
  } : mockDashboardData.attendanceToday;

  const exceptionsData = overviewData?.exceptions ? {
    lateToday: overviewData.exceptions.lateToday,
    absentToday: overviewData.exceptions.absentToday,
    missingPunchesThisMonth: overviewData.exceptions.missingPunchesThisMonth,
    exceptions: [
      { type: 'Late Arrivals Today', count: overviewData.exceptions.lateToday, severity: 'warning', code: 'late' },
      { type: 'Unexcused Absences Today', count: overviewData.exceptions.absentToday, severity: 'danger', code: 'absent' },
      { type: 'Missing Punches This Month', count: overviewData.exceptions.missingPunchesThisMonth, severity: 'info', code: 'missing' },
    ],
  } : mockDashboardData.exceptions;

  const overtimeData = overviewData?.overtimeMonth ? {
    monthNormalHours: overviewData.overtimeMonth.normalHours,
    monthNightHours: overviewData.overtimeMonth.nightHours,
    monthHolidayHours: overviewData.overtimeMonth.holidayHours,
    totalHours: overviewData.overtimeMonth.totalHours,
  } : mockDashboardData.overtimeMonth;

  const weekAheadData = overviewData?.weekAhead ? {
    upcomingEvents: overviewData.weekAhead.leaves.map((l) => ({
      date: l.dates,
      employee: l.employeeName,
      employeeAr: l.employeeName,
      event: l.type,
      type: 'leave',
    })),
  } : mockDashboardData.weekAhead;

  const recentActivityData = overviewData?.recentActivity ? {
    items: overviewData.recentActivity.map((a) => ({
      id: a.id,
      user: a.userEmail,
      action: a.action,
      target: a.tableName,
      time: new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    })),
  } : mockDashboardData.recentActivity;

  // Live Payroll metrics (only when seesSalary is true)
  const livePayrollData = salaryData?.livePayroll ? {
    monthYear: salaryData.livePayroll.period || 'October 2026',
    entityName: 'Gulf Tech Logistics LLC',
    visaBadge: salaryData.livePayroll.visaName || 'Visa 01',
    cutoffDays: 4,
    employeesIncluded: salaryData.livePayroll.employeeCount,
    currentStep: salaryData.livePayroll.status,
    steps: ['Draft', 'Calculated', 'Validated', 'Locked', 'Paid'],
    nextStep: {
      owner: salaryData.livePayroll.status === 'Calculated' ? 'HR Manager' : salaryData.livePayroll.status === 'Validated' ? 'GM' : 'Finance',
      action: salaryData.livePayroll.status === 'Draft' ? 'Calculate run' : salaryData.livePayroll.status === 'Calculated' ? 'Validate run' : salaryData.livePayroll.status === 'Validated' ? 'Lock run' : salaryData.livePayroll.status === 'Locked' ? 'Mark Paid' : 'Complete',
      message: `${salaryData.livePayroll.blockingIssuesCount} blocking issues`,
      tab: 'validation',
    },
    figures: {
      gross: Number(salaryData.livePayroll.figures.gross),
      overtime: 0,
      absence: 0,
      loans: 0,
      latePenalties: 0,
      otherDeductions: Number(salaryData.livePayroll.figures.deductions),
      netToWps: Number(salaryData.livePayroll.figures.net),
    },
    sparkline: salaryData.livePayroll.sparkline.length > 0 ? salaryData.livePayroll.sparkline : mockDashboardData.livePayroll.sparkline,
  } : mockDashboardData.livePayroll;

  return (
    <RouteGuard area="dashboard">
      <div className="space-y-6 lg:space-y-8 animate-fadeIn pb-12">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text gold-page-title">
            {t('dashboard.title')}
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Gulf Tech Logistics LLC · {t('dashboard.subtitle')}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={<Upload className="w-3.5 h-3.5" />}
            onClick={() => setActiveDrawer('import')}
          >
            Import Punches
          </Button>
          {seesSalary && (
            <Button
              variant="primary"
              size="sm"
              icon={<Play className="w-3.5 h-3.5" />}
              onClick={() => router.push('/payroll')}
            >
              Calculate Payroll
            </Button>
          )}
        </div>
      </div>

      {/* 12-Column Explicit Bento Grid Layout */}
      <BentoGrid id="hr-dashboard-bento-grid">
        {/* Row 1 & 2: live (6x2) if salary role, head (3x1), appr (3x1), wps (3x1), docs (3x1) */}
        {seesSalary && (
          <LivePayrollHeroTile
            data={livePayrollData}
            onClick={() => router.push('/payroll')}
            onOpenValidation={() => router.push('/payroll')}
          />
        )}

        <HeadcountTile
          data={headcountData}
          onClick={() => router.push('/employees')}
        />

        <PendingApprovalsTile
          data={pendingApprovalsData}
          onClick={() => router.push('/leave')}
          onApproveItem={() => router.push('/leave')}
          onOpenItem={() => router.push('/leave')}
        />

        <WpsReadinessTile
          data={wpsData}
          onClick={() => router.push('/compliance')}
          onFilterMissing={() => router.push('/compliance')}
        />

        <DocumentsExpiryTile
          data={expiringDocsData}
          onClick={() => router.push('/employees')}
        />

        {/* Row 3: exc (4x1), att (4x1), ot (4x1) */}
        <ExceptionsTile
          data={exceptionsData}
          onSelectException={() => router.push('/attendance')}
          onClick={() => router.push('/attendance')}
        />

        <AttendanceSegmentTile
          data={attendanceData}
          onClick={() => router.push('/attendance')}
        />

        <OvertimeTile
          data={overtimeData}
          onClick={() => router.push('/attendance')}
        />

        {/* Row 4: trend (6x1), dept (3x1), liab (3x1) ONLY for salary roles */}
        {seesSalary && (
          <>
            <PayrollTrendTile
              data={mockDashboardData.payrollTrend}
              onClick={() => router.push('/payroll')}
            />

            <DepartmentChartTile
              data={mockDashboardData.departmentHeadcount}
              onClick={() => router.push('/employees')}
            />

            <FinanceLiabilitiesTile
              data={mockDashboardData.financeLiabilities}
              onClick={() => router.push('/payroll')}
            />
          </>
        )}

        {/* Row 5: week (8x1), quick (4x1) */}
        <WeekAheadTile
          data={weekAheadData}
          onClick={() => router.push('/leave')}
        />

        <QuickActionsTile
          data={mockDashboardData.quickActions}
          onAction={handleQuickAction}
        />

        {/* Row 6: audit (8x1), var (4x1 if seesSalary) */}
        <RecentActivityTile
          data={recentActivityData}
          onClick={() => router.push('/audit')}
        />

        {seesSalary && (
          <VarianceTile
            data={mockDashboardData.variance}
            onClick={() => setIsPayrollModalOpen(true)}
          />
        )}
      </BentoGrid>

      {/* Pay Run Overview Modal */}
      {seesSalary && (
        <Modal
          isOpen={isPayrollModalOpen}
          onClose={() => setIsPayrollModalOpen(false)}
          title="October 2026 Pay Run Overview"
          subtitle="MOHRE Visa #442901 · Gulf Tech Logistics LLC"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-primary-wash/50 border border-primary/20">
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className="text-primary font-bold">Pay Run Stage</span>
                <span className="px-2 py-0.5 rounded-full bg-primary text-[var(--on-primary)] text-[10px] font-bold">
                  {livePayrollData.currentStep?.toUpperCase() || 'CALCULATED'}
                </span>
              </div>
              <p className="text-xs text-text-muted">
                Live calculation verified with {livePayrollData.employeesIncluded} contracts. Ready for HR Manager review and variance audit.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border">
                <span className="text-text-muted">Total Gross Salary</span>
                <p className="text-base font-bold text-text tabular-nums mt-0.5">
                  <bdi>{formatCurrency(livePayrollData.figures.gross, 'AED', language)}</bdi>
                </p>
              </div>
              <div className="p-3 rounded-xl bg-secondary-wash border border-secondary/20">
                <span className="text-secondary-text font-semibold">Net to WPS SIF</span>
                <p className="text-base font-bold text-secondary-text tabular-nums mt-0.5">
                  <bdi>{formatCurrency(livePayrollData.figures.netToWps, 'AED', language)}</bdi>
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/40">
              <Button variant="outline" size="sm" onClick={() => setIsPayrollModalOpen(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<FileCheck2 className="w-3.5 h-3.5" />}
                onClick={() => {
                  setIsPayrollModalOpen(false);
                  router.push('/payroll');
                }}
              >
                Open Full Run
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Punches Import Drawer */}
      <Drawer
        isOpen={activeDrawer === 'import'}
        onClose={() => setActiveDrawer(null)}
        title="Biometric Punches Import"
        subtitle="Upload attendance records (CSV/Excel format)"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-muted">
            Upload biometric device logs to reconcile with scheduled shift timings.
          </p>
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center space-y-3 bg-black/[0.01] dark:bg-white/[0.01]">
            <Upload className="w-8 h-8 mx-auto text-primary" />
            <p className="text-xs text-text-muted">Drag & drop punch log file here, or click to browse</p>
            <Button size="sm" variant="outline" onClick={() => setActiveDrawer(null)}>
              Browse Files
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  </RouteGuard>
);
}
