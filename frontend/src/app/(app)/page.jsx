'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
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
import { FinanceLiabilitiesTile } from '../../components/features/dashboard/FinanceLiabilitiesTile';
import { WeekAheadTile } from '../../components/features/dashboard/WeekAheadTile';
import { QuickActionsTile } from '../../components/features/dashboard/QuickActionsTile';
import { RecentActivityTile } from '../../components/features/dashboard/RecentActivityTile';
import { VarianceTile } from '../../components/features/dashboard/VarianceTile';
import { CompanyOnboardingChecklistTile } from '../../components/features/dashboard/CompanyOnboardingChecklistTile';

import { SkeletonCard } from '../../components/ui/skeleton';

// Dynamic code-splitting for below-the-fold Recharts & heavy drawers
const PayrollTrendTile = dynamic(
  () => import('../../components/features/dashboard/PayrollTrendTile').then((mod) => mod.PayrollTrendTile),
  { ssr: false, loading: () => <SkeletonCard className="col-span-12 lg:col-span-8 min-h-[280px]" /> }
);
const DepartmentChartTile = dynamic(
  () => import('../../components/features/dashboard/DepartmentChartTile').then((mod) => mod.DepartmentChartTile),
  { ssr: false, loading: () => <SkeletonCard className="col-span-12 lg:col-span-4 min-h-[280px]" /> }
);
const BiometricImportFeature = dynamic(
  () => import('../../components/features/attendance/BiometricImportFeature'),
  { ssr: false }
);

import { Drawer } from '../../components/primitives/Drawer';
import { Modal } from '../../components/primitives/Modal';
import { Button } from '../../components/primitives/form/Button';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useVisa } from '../../context/VisaContext';
import { getDashboardOverview, getDashboardSalary } from '../../services/dashboardApi';
import { withVisa } from '../../lib/visaQuery';
import { RouteGuard } from '../../components/common/RouteGuard';
import { formatCurrency, canAccessNavArea } from '@nextal/shared';
import {
  Upload,
  Play,
  FileCheck2,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { user, seesSalary, canAccess } = useAuth();
  const userRoles = user?.roles || [];
  const canImportPunches = canAccess('attendance', 'edit');
  const canNavEmployees = canAccessNavArea(userRoles, 'employees', seesSalary);
  const canNavLeave = canAccessNavArea(userRoles, 'leave', seesSalary);
  const canNavCompliance = canAccessNavArea(userRoles, 'compliance', seesSalary);
  const canNavAttendance = canAccessNavArea(userRoles, 'attendance', seesSalary);
  const canNavPayroll = canAccessNavArea(userRoles, 'payroll', seesSalary);
  const canNavAudit = canAccessNavArea(userRoles, 'audit', seesSalary);
  const canNavApprovals = canAccessNavArea(userRoles, 'approvals', seesSalary);
  const { selectedVisaId, selectedVisa, companyName, companyNameAr } = useVisa();
  const [activeDrawer, setActiveDrawer] = useState(null);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);

  const [overviewData, setOverviewData] = useState(null);
  const [salaryData, setSalaryData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch overview metrics for all authorized users
  const loadOverview = async () => {
    try {
      const data = await getDashboardOverview(withVisa({}, selectedVisaId));
      if (data) setOverviewData(data);
    } catch (e) {
      console.warn('Failed to fetch dashboard overview:', e.message);
    }
  };

  // Fetch salary metrics strictly for salary roles
  const loadSalary = async () => {
    if (!seesSalary) return;
    try {
      const data = await getDashboardSalary(withVisa({}, selectedVisaId));
      if (data) setSalaryData(data);
    } catch (e) {
      console.warn('Failed to fetch dashboard salary metrics:', e.message);
    }
  };

  const isEmployeeOnly = user?.roles?.length === 1 && user?.roles?.[0] === 'EMPLOYEE';

  useEffect(() => {
    if (isEmployeeOnly) {
      router.replace('/me');
    }
  }, [isEmployeeOnly, router]);

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
  }, [seesSalary, selectedVisaId]);

  const handleQuickAction = (actionId) => {
    switch (actionId) {
      case 'import':
        if (canImportPunches) setActiveDrawer('import');
        break;
      case 'new-emp':
        if (canNavEmployees) router.push('/employees');
        break;
      case 'leave':
        if (canNavLeave) router.push('/leave');
        else if (user?.employee_id) router.push('/me/leave');
        break;
      case 'salary-adj':
        if (canNavPayroll) router.push('/payroll/adjustments');
        break;
      case 'holiday':
        if (canNavLeave) router.push('/leave');
        break;
      case 'payrun':
        if (canNavPayroll) router.push('/payroll');
        break;
      default:
        break;
    }
  };

  // Fallback schemas when data is loading or empty
  const defaultHeadcount = {
    total: 0,
    joiners: 0,
    leavers: 0,
    netChange: '0 net this month',
    nationalityMix: {
      uaeNationals: 0,
      expats: 0,
      gpssaEligible: 0,
      uaePercent: 0,
      expatPercent: 0,
    },
  };

  const defaultPendingApprovals = {
    total: 0,
    items: [
      { type: 'Leave Requests', count: 0, code: 'leave' },
      { type: 'Overtime Hours', count: 0, code: 'ot' },
      { type: 'Salary Adjustments', count: 0, code: 'adj' },
      { type: 'Final Settlements', count: 0, code: 'settlement' },
    ],
    oldestItems: [],
  };

  const defaultWps = {
    ready: 0,
    total: 0,
    percentage: 0,
    compliant: 0,
    readyCount: 0,
    needsAttentionCount: 0,
    checks: [],
    issues: [],
  };

  const defaultExpiringDocs = {
    total: 0,
    expired: 0,
    critical: 0,
    warning: 0,
    info: 0,
    nearestExpiry: { name: 'None', nameAr: 'لا يوجد', docType: 'None', days: 99 },
  };

  const defaultAttendance = {
    present: 0,
    late: 0,
    absent: 0,
    onLeave: 0,
    total: 0,
    presentPercent: 0,
    latePercent: 0,
    absentPercent: 0,
    leavePercent: 0,
  };

  const defaultExceptions = {
    lateToday: 0,
    absentToday: 0,
    missingPunchesThisMonth: 0,
    exceptions: [],
  };

  const defaultOvertime = {
    totalHours: 0,
    pendingHours: 0,
    monthNormalHours: 0,
    monthNightHours: 0,
    monthHolidayHours: 0,
    types: [],
  };

  const getVisaBadge = (visaName) => {
    if (!visaName || visaName === 'All Visas' || visaName === 'All Entities') {
      return language === 'ar' ? 'جميع التأشيرات' : 'All Visas';
    }
    if (language === 'ar') {
      if (visaName.includes('01') || visaName.includes('Visa 01')) {
        return 'تأشيرة 01 دبي';
      }
      if (visaName.includes('02') || visaName.includes('Visa 02')) {
        return 'تأشيرة 02 مركز دبي المالي';
      }
      return visaName.replace(/[()]/g, '').trim();
    }
    return visaName;
  };

  const defaultLivePayroll = {
    monthYear: new Date().toISOString().slice(0, 7),
    entityName: language === 'ar' ? (companyNameAr || companyName || '') : (companyName || ''),
    visaBadge: getVisaBadge(selectedVisa?.name || 'All Visas'),
    cutoffDays: 0,
    employeesIncluded: 0,
    currentStep: 'Draft',
    steps: ['Draft', 'Calculated', 'Validated', 'Locked', 'Paid'],
    nextStep: {
      owner: 'Payroll Officer',
      action: 'Calculate run',
      message: '0 blocking issues',
      tab: 'validation',
    },
    figures: {
      gross: 0,
      overtime: 0,
      absence: 0,
      loans: 0,
      latePenalties: 0,
      otherDeductions: 0,
      netToWps: 0,
    },
    sparkline: [],
  };

  const defaultPayrollTrend = {
    months: [],
    thresholdMin: 0,
    thresholdMax: 0,
  };

  const defaultDepartmentHeadcount = [];

  const defaultFinanceLiabilities = {
    gratuity: {
      totalAccrued: 0,
      monthDelta: 0,
      deltaPercent: '0%',
      isPositive: true,
    },
    leaveLiability: {
      totalAccrued: 0,
      monthDelta: 0,
      deltaPercent: '0%',
      isPositive: true,
    },
  };

  const defaultQuickActions = [
    { id: 'import', label: 'Import Punches', icon: 'Upload' },
    { id: 'new-emp', label: 'Add Employee', icon: 'UserPlus' },
    { id: 'leave', label: 'Apply Leave', icon: 'Calendar' },
    { id: 'payrun', label: 'Pay Run', icon: 'DollarSign' },
  ];

  const visibleQuickActions = useMemo(() => {
    return defaultQuickActions.filter((action) => {
      if (action.id === 'import') return canImportPunches;
      if (action.id === 'new-emp') return canAccess('employees', 'create') && canNavEmployees;
      if (action.id === 'leave') return canNavLeave || Boolean(user?.employee_id);
      if (action.id === 'payrun') return canAccess('pay_runs', 'prepare') && canNavPayroll;
      return true;
    });
  }, [canImportPunches, canAccess, canNavEmployees, canNavLeave, canNavPayroll, user?.employee_id]);

  const defaultVariance = {
    currentMonthNet: 0,
    previousMonthNet: 0,
    diffAmount: 0,
    diffPercent: '0.0%',
    isPositive: true,
    topChanges: [],
  };

  // Map API data to tile schemas, falling back gracefully
  const headcountData = overviewData?.headcount ? (() => {
    const total = Number(overviewData.headcount.total || 0);
    const joiners = Number(overviewData.headcount.joinersThisMonth || 0);
    const leavers = Number(overviewData.headcount.leaversThisMonth || 0);
    const netCount = joiners - leavers;
    const uaeNationals = Number(overviewData.headcount.uaeNationals || 0);
    const expats = Number(overviewData.headcount.expats ?? Math.max(0, total - uaeNationals));
    const uaePercent = total > 0 ? Math.round((uaeNationals / total) * 100) : 0;
    const expatPercent = total > 0 ? Math.max(0, 100 - uaePercent) : 0;
    return {
      total,
      joiners,
      leavers,
      netCount,
      netChange: language === 'ar' ? `${netCount >= 0 ? `+${netCount}` : netCount} صافي هذا الشهر` : `${netCount >= 0 ? `+${netCount}` : netCount} net this month`,
      nationalityMix: {
        uaeNationals,
        expats,
        gpssaEligible: Number(overviewData.headcount.gpssaEligible || uaeNationals),
        uaePercent,
        expatPercent,
      },
    };
  })() : defaultHeadcount;

  const pendingApprovalsData = overviewData?.pendingApprovals ? {
    total: overviewData.pendingApprovals.count || 0,
    items: [
      { type: 'Leave Requests', count: (overviewData.pendingApprovals.items || []).filter(i => i.type === 'Leave').length, code: 'leave' },
      { type: 'Overtime Hours', count: (overviewData.pendingApprovals.items || []).filter(i => i.type === 'Overtime').length, code: 'ot' },
      { type: 'Salary Adjustments', count: 0, code: 'adj' },
      { type: 'Final Settlements', count: 0, code: 'settlement' },
    ],
    oldestItems: (overviewData.pendingApprovals.items || []).map((i) => ({
      id: i.id,
      type: i.type,
      employee: i.requester || 'Employee',
      employeeAr: i.requester || 'Employee',
      avatar: (i.requester || 'EM').slice(0, 2).toUpperCase(),
      age: 'Pending',
      isOwn: false,
    })),
  } : defaultPendingApprovals;

  const wpsData = overviewData?.wpsReadiness ? {
    ready: overviewData.wpsReadiness.compliantCount ?? 0,
    total: overviewData.wpsReadiness.totalCount ?? 0,
    percentage: overviewData.wpsReadiness.compliancePct ?? 0,
    compliant: overviewData.wpsReadiness.compliantCount ?? 0,
    readyCount: overviewData.wpsReadiness.compliantCount ?? 0,
    needsAttentionCount: (overviewData.wpsReadiness.missingIban || 0) + (overviewData.wpsReadiness.missingRouting || 0),
    checks: [
      {
        key: 'iban',
        label: language === 'ar' ? 'حساب الآيبان (IBAN) متوفر' : 'IBAN account present',
        missing: overviewData.wpsReadiness.missingIban || 0,
        status: (overviewData.wpsReadiness.missingIban || 0) > 0 ? 'warning' : 'success',
      },
      {
        key: 'routing',
        label: language === 'ar' ? 'رمز التوجيه المصرفي متوفر' : 'Bank routing code present',
        missing: overviewData.wpsReadiness.missingRouting || 0,
        status: (overviewData.wpsReadiness.missingRouting || 0) > 0 ? 'warning' : 'success',
      },
      {
        key: 'personId',
        label: language === 'ar' ? 'بطاقة العمل / رقم المنشأة متوفر' : 'Labour Card / Person ID present',
        missing: overviewData.wpsReadiness.missingPersonId || 0,
        status: (overviewData.wpsReadiness.missingPersonId || 0) > 0 ? 'warning' : 'success',
      },
    ],
    issues: [
      { field: 'IBAN', count: overviewData.wpsReadiness.missingIban || 0, label: 'Missing primary IBAN', severity: 'danger' },
      { field: 'Bank Routing', count: overviewData.wpsReadiness.missingRouting || 0, label: 'Routing code unverified', severity: 'warning' },
    ],
  } : defaultWps;

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
  } : defaultExpiringDocs;

  const attendanceData = overviewData?.attendanceToday ? (() => {
    const att = overviewData.attendanceToday;
    const tot = Number(att.total || 0);
    return {
      present: att.present || 0,
      late: att.late || 0,
      absent: att.absent || 0,
      onLeave: att.onLeave || 0,
      total: tot,
      presentPercent: tot > 0 ? Math.round(((att.present || 0) / tot) * 100) : 0,
      latePercent: tot > 0 ? Math.round(((att.late || 0) / tot) * 100) : 0,
      absentPercent: tot > 0 ? Math.round(((att.absent || 0) / tot) * 100) : 0,
      leavePercent: tot > 0 ? Math.round(((att.onLeave || 0) / tot) * 100) : 0,
    };
  })() : defaultAttendance;

  const exceptionsData = overviewData?.exceptions ? {
    lateToday: overviewData.exceptions.lateToday,
    absentToday: overviewData.exceptions.absentToday,
    missingPunchesThisMonth: overviewData.exceptions.missingPunchesThisMonth,
    exceptions: [
      { type: language === 'ar' ? 'تأخرات الحضور اليوم' : 'Late Arrivals Today', count: overviewData.exceptions.lateToday, severity: 'warning', code: 'late' },
      { type: language === 'ar' ? 'غياب غير مبرر اليوم' : 'Unexcused Absences Today', count: overviewData.exceptions.absentToday, severity: 'danger', code: 'absent' },
      { type: language === 'ar' ? 'بصمات مفقودة هذا الشهر' : 'Missing Punches This Month', count: overviewData.exceptions.missingPunchesThisMonth, severity: 'info', code: 'missing' },
    ],
  } : defaultExceptions;

  const overtimeData = overviewData?.overtimeMonth ? {
    totalHours: overviewData.overtimeMonth.totalHours ?? 0,
    pendingHours: overviewData.overtimeMonth.pendingHours ?? 0,
    monthNormalHours: overviewData.overtimeMonth.normalHours ?? 0,
    monthNightHours: overviewData.overtimeMonth.nightHours ?? 0,
    monthHolidayHours: overviewData.overtimeMonth.holidayHours ?? 0,
    types: overviewData.overtimeMonth.totalHours > 0 ? [
      {
        name: 'Normal ×1.25',
        hours: overviewData.overtimeMonth.normalHours ?? 0,
        percent: Math.round(((overviewData.overtimeMonth.normalHours || 0) / overviewData.overtimeMonth.totalHours) * 100),
      },
      {
        name: 'Night ×1.5',
        hours: overviewData.overtimeMonth.nightHours ?? 0,
        percent: Math.round(((overviewData.overtimeMonth.nightHours || 0) / overviewData.overtimeMonth.totalHours) * 100),
      },
      {
        name: 'Holiday/Rest ×1.5',
        hours: overviewData.overtimeMonth.holidayHours ?? 0,
        percent: Math.round(((overviewData.overtimeMonth.holidayHours || 0) / overviewData.overtimeMonth.totalHours) * 100),
      },
    ] : [],
  } : defaultOvertime;

  const weekAheadData = Array.isArray(overviewData?.weekAhead)
    ? overviewData.weekAhead
    : [];

  const recentActivityData = Array.isArray(overviewData?.recentActivity)
    ? overviewData.recentActivity.map((a) => ({
        id: a.id,
        avatar: a.userEmail ? a.userEmail.slice(0, 2).toUpperCase() : 'SY',
        actor: a.userEmail || 'System',
        role: 'Audit',
        action: a.action,
        target: a.tableName,
        timestamp: new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }))
    : [];

  // Live Payroll metrics (only when seesSalary is true)
  const livePayrollData = salaryData?.livePayroll ? {
    monthYear: salaryData.livePayroll.period || new Date().toISOString().slice(0, 7),
    entityName: language === 'ar' ? (companyNameAr || companyName || '') : (companyName || ''),
    visaBadge: getVisaBadge(selectedVisa?.name || salaryData.livePayroll.visaName || 'All Visas'),
    cutoffDays: 4,
    employeesIncluded: salaryData.livePayroll.employeeCount,
    currentStep: salaryData.livePayroll.status,
    steps: ['Draft', 'Calculated', 'Validated', 'Locked', 'Paid'],
    nextStep: {
      owner: salaryData.livePayroll.status === 'Calculated' ? (language === 'ar' ? 'مدير الموارد البشرية' : 'HR Manager') : salaryData.livePayroll.status === 'Validated' ? (language === 'ar' ? 'المدير العام' : 'GM') : (language === 'ar' ? 'المالية' : 'Finance'),
      action: salaryData.livePayroll.status === 'Draft' ? (language === 'ar' ? 'حساب المسير' : 'Calculate run') : salaryData.livePayroll.status === 'Calculated' ? (language === 'ar' ? 'تدقيق المسير' : 'Validate run') : salaryData.livePayroll.status === 'Validated' ? (language === 'ar' ? 'إقفال المسير' : 'Lock run') : salaryData.livePayroll.status === 'Locked' ? (language === 'ar' ? 'تأكيد الصرف' : 'Mark Paid') : (language === 'ar' ? 'مكتمل' : 'Complete'),
      message: `${salaryData.livePayroll.blockingIssuesCount} ${language === 'ar' ? 'مشاكل معلقة' : 'blocking issues'}`,
      tab: 'validation',
    },
    figures: {
      gross: Number(salaryData.livePayroll?.figures?.gross || 0),
      overtime: 0,
      absence: 0,
      loans: 0,
      latePenalties: 0,
      otherDeductions: Number(salaryData.livePayroll?.figures?.deductions || 0),
      netToWps: Number(salaryData.livePayroll?.figures?.net || 0),
    },
    sparkline: Array.isArray(salaryData.livePayroll?.sparkline) ? salaryData.livePayroll.sparkline : [],
  } : defaultLivePayroll;

  return (
    <RouteGuard area="dashboard">
      <div className="space-y-6 lg:space-y-8 animate-fadeIn pb-12">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text">
            {t('dashboard.title')}
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            {language === 'ar' ? (companyNameAr || companyName || '') : (companyName || '')} · {t('dashboard.subtitle')}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-3">
          {canImportPunches && (
            <Button
              id="dashboard-import-punches-btn"
              data-testid="dashboard-import-punches-btn"
              variant="outline"
              size="sm"
              icon={<Upload className="w-3.5 h-3.5" />}
              onClick={() => setActiveDrawer('import')}
            >
              {t('dashboard.actions.importPunches', 'Import Punches')}
            </Button>
          )}
          {seesSalary && (
            <Button
              variant="primary"
              size="sm"
              icon={<Play className="w-3.5 h-3.5" />}
              onClick={() => router.push('/payroll')}
            >
              {t('dashboard.actions.calculatePayroll', 'Calculate Payroll')}
            </Button>
          )}
        </div>
      </div>

      {/* Onboarding Checklist for Company Admin when initializing company */}
      {user?.roles?.includes('COMPANY_ADMIN') && headcountData.total === 0 && (
        <div className="mb-6">
          <CompanyOnboardingChecklistTile
            status={overviewData?.onboarding || {
              hasProfile: Boolean(companyName),
              hasVisas: Boolean(selectedVisa),
              hasBranches: false,
              hasDepartments: false,
              hasRules: false,
              hasUsers: false,
            }}
          />
        </div>
      )}

      {/* 12-Column Explicit Bento Grid Layout */}
      <BentoGrid id="hr-dashboard-bento-grid" className={!seesSalary ? 'bento-no-salary' : ''}>
        {/* Row 1 & 2: live (6x2) if salary role, head (3x1), appr (3x1), wps (3x1), docs (3x1) */}
        {seesSalary && (
          <LivePayrollHeroTile
            data={livePayrollData}
            onClick={canNavPayroll ? () => router.push('/payroll') : undefined}
            onOpenValidation={canNavPayroll ? () => router.push('/payroll') : undefined}
            onRefresh={() => Promise.all([loadOverview(), loadSalary()])}
          />
        )}

        <HeadcountTile
          data={headcountData}
          onClick={canNavEmployees ? () => router.push('/employees') : undefined}
        />

        <PendingApprovalsTile
          data={pendingApprovalsData}
          onClick={canNavApprovals ? () => router.push('/approvals') : (canNavLeave ? () => router.push('/leave') : undefined)}
          onApproveItem={canNavApprovals ? () => router.push('/approvals') : (canNavLeave ? () => router.push('/leave') : undefined)}
          onOpenItem={canNavApprovals ? () => router.push('/approvals') : (canNavLeave ? () => router.push('/leave') : undefined)}
        />

        <WpsReadinessTile
          data={wpsData}
          onClick={canNavCompliance ? () => router.push('/compliance') : undefined}
          onFilterMissing={canNavCompliance ? () => router.push('/compliance') : undefined}
        />

        <DocumentsExpiryTile
          data={expiringDocsData}
          onClick={canNavEmployees ? () => router.push('/employees') : undefined}
        />

        {/* Row 3: exc (4x1), att (4x1), ot (4x1) */}
        <ExceptionsTile
          data={exceptionsData}
          onSelectException={canNavAttendance ? () => router.push('/attendance') : undefined}
          onClick={canNavAttendance ? () => router.push('/attendance') : undefined}
        />

        <AttendanceSegmentTile
          data={attendanceData}
          onClick={canNavAttendance ? () => router.push('/attendance') : undefined}
        />

        <OvertimeTile
          data={overtimeData}
          onClick={canNavAttendance ? () => router.push('/attendance') : undefined}
        />

        {/* Row 4: trend (6x1), dept (3x1), liab (3x1) for salary roles; dept (6x1) for non-salary */}
        {seesSalary ? (
          <>
            <PayrollTrendTile
              data={salaryData?.payrollTrend || defaultPayrollTrend}
              onClick={canNavPayroll ? () => router.push('/payroll') : undefined}
            />

            <DepartmentChartTile
              data={
                Array.isArray(overviewData?.departmentHeadcount)
                  ? overviewData.departmentHeadcount
                  : (Array.isArray(salaryData?.departmentHeadcount)
                      ? salaryData.departmentHeadcount
                      : defaultDepartmentHeadcount)
              }
              onClick={canNavEmployees ? () => router.push('/employees') : undefined}
            />

            <FinanceLiabilitiesTile
              data={salaryData?.financeLiabilities || defaultFinanceLiabilities}
              onClick={canNavPayroll ? () => router.push('/payroll') : undefined}
            />
          </>
        ) : (
          <DepartmentChartTile
            data={
              Array.isArray(overviewData?.departmentHeadcount)
                ? overviewData.departmentHeadcount
                : defaultDepartmentHeadcount
            }
            onClick={canNavEmployees ? () => router.push('/employees') : undefined}
          />
        )}

        {/* Row 5: week (8x1), quick (4x1) */}
        <WeekAheadTile
          data={weekAheadData}
          onClick={canNavLeave ? () => router.push('/leave') : undefined}
        />

        <QuickActionsTile
          data={visibleQuickActions}
          onAction={handleQuickAction}
        />

        {/* Row 6: audit (8x1), var (4x1 if seesSalary) */}
        <RecentActivityTile
          data={recentActivityData}
          onClick={canNavAudit ? () => router.push('/audit') : undefined}
        />

        {seesSalary && (
          <VarianceTile
            data={salaryData?.variance || defaultVariance}
            onClick={() => setIsPayrollModalOpen(true)}
          />
        )}
      </BentoGrid>

      {/* Pay Run Overview Modal */}
      {seesSalary && (
        <Modal
          isOpen={isPayrollModalOpen}
          onClose={() => setIsPayrollModalOpen(false)}
          title={`${livePayrollData.monthYear} Pay Run Overview`}
          subtitle={`${selectedVisa ? `${selectedVisa.name} · ${selectedVisa.mol_establishment_id || ''}` : 'All Company Visas'} · ${companyName || 'Company'}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-primary-wash/50 border border-primary/20">
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className="text-primary font-bold">{language === 'ar' ? 'مرحلة مسير الرواتب' : 'Pay Run Stage'}</span>
                <span className="px-2 py-0.5 rounded-full bg-primary text-[var(--on-primary)] text-[10px] font-bold">
                  {livePayrollData.currentStep?.toUpperCase() || 'CALCULATED'}
                </span>
              </div>
              <p className="text-xs text-text-muted">
                {language === 'ar' ? `تم التحقق من الحساب المباشر لعدد ${livePayrollData.employeesIncluded} عقداً.` : `Live calculation verified with ${livePayrollData.employeesIncluded} contracts.`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border">
                <span className="text-text-muted">{language === 'ar' ? 'إجمالي الراتب' : 'Total Gross Salary'}</span>
                <p className="text-base font-bold text-text tabular-nums mt-0.5">
                  <bdi>{formatCurrency(livePayrollData.figures.gross, 'AED', language)}</bdi>
                </p>
              </div>
              <div className="p-3 rounded-xl bg-secondary-wash border border-secondary/20">
                <span className="text-secondary-text font-semibold">{language === 'ar' ? 'صافي حماية الأجور (SIF)' : 'Net to WPS SIF'}</span>
                <p className="text-base font-bold text-secondary-text tabular-nums mt-0.5">
                  <bdi>{formatCurrency(livePayrollData.figures.netToWps, 'AED', language)}</bdi>
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/40">
              <Button variant="outline" size="sm" onClick={() => setIsPayrollModalOpen(false)}>
                {language === 'ar' ? 'إغلاق' : 'Close'}
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
                {language === 'ar' ? 'عرض مسير الرواتب' : 'Open Full Run'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Punches Import Drawer */}
      <Drawer
        id="dashboard-biometric-import-drawer"
        isOpen={canImportPunches && activeDrawer === 'import'}
        onClose={() => setActiveDrawer(null)}
        title={language === 'ar' ? 'استيراد بصمات الحضور البيومترية' : 'Biometric Punches Import'}
        subtitle={language === 'ar' ? 'تحميل سجلات الحضور (ملف CSV/Excel)' : 'Upload attendance records (CSV/Excel format)'}
      >
        <BiometricImportFeature />
      </Drawer>
    </div>
  </RouteGuard>
);
}
