'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Settings,
  Shield,
  Users,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { SettingsOverviewBento } from '../../components/settings/SettingsOverviewBento';
import { CompanyProfileDrawer } from '../../components/settings/drawers/CompanyProfileDrawer';
import { BranchesDrawer } from '../../components/settings/drawers/BranchesDrawer';
import { DepartmentsJobsDrawer } from '../../components/settings/drawers/DepartmentsJobsDrawer';
import { ShiftsPoliciesDrawer } from '../../components/settings/drawers/ShiftsPoliciesDrawer';
import { LeaveAccrualDrawer } from '../../components/settings/drawers/LeaveAccrualDrawer';
import { PublicHolidaysDrawer } from '../../components/settings/drawers/PublicHolidaysDrawer';
import { SalaryRulesDrawer } from '../../components/settings/drawers/SalaryRulesDrawer';
import { ApprovalSettingsDrawer } from '../../components/settings/drawers/ApprovalSettingsDrawer';
import { PayrollAlertsDrawer } from '../../components/settings/drawers/PayrollAlertsDrawer';
import { VersionHistoryModal } from '../../components/settings/modals/VersionHistoryModal';
import { ResetDefaultsModal } from '../../components/settings/modals/ResetDefaultsModal';
import { DeleteInUseModal } from '../../components/settings/modals/DeleteInUseModal';

import {
  INITIAL_COMPANY_PROFILE,
  INITIAL_BRANCHES,
  INITIAL_DEPARTMENTS,
  INITIAL_JOBS,
  INITIAL_SHIFTS,
  INITIAL_ATTENDANCE_POLICY,
  INITIAL_LEAVE_TYPES,
  INITIAL_HOLIDAYS_2026,
  INITIAL_SALARY_RULES,
  INITIAL_APPROVAL_FLOWS,
  INITIAL_PAYROLL_ALERTS,
} from '../../components/settings/settingsData';

export default function SettingsPage() {
  const { user } = useAuth();
  const { isRTL, language } = useLanguage();

  const currentRole = user?.role || 'COMPANY_ADMIN';
  const isHrOrAdmin = currentRole === 'HR_MANAGER' || currentRole === 'COMPANY_ADMIN';
  const isPayrollOfficer = currentRole === 'PAYROLL_OFFICER';
  const isFinance = currentRole === 'FINANCE';

  // Active Data State
  const [companyProfile, setCompanyProfile] = useState(INITIAL_COMPANY_PROFILE);
  const [branches, setBranches] = useState(INITIAL_BRANCHES);
  const [departments, setDepartments] = useState(INITIAL_DEPARTMENTS);
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [shifts, setShifts] = useState(INITIAL_SHIFTS);
  const [attendancePolicy, setAttendancePolicy] = useState(INITIAL_ATTENDANCE_POLICY);
  const [leaveTypes, setLeaveTypes] = useState(INITIAL_LEAVE_TYPES);
  const [holidays, setHolidays] = useState(INITIAL_HOLIDAYS_2026);
  const [salaryRules, setSalaryRules] = useState(INITIAL_SALARY_RULES);
  const [approvalFlows, setApprovalFlows] = useState(INITIAL_APPROVAL_FLOWS);
  const [payrollAlerts, setPayrollAlerts] = useState(INITIAL_PAYROLL_ALERTS);

  // Active Open Drawer (null | 'profile' | 'branches' | 'departments_jobs' | 'shifts_policies' | 'leave_accruals' | 'holidays' | 'salary_rules' | 'approvals' | 'payroll_alerts')
  const [activeDrawer, setActiveDrawer] = useState(null);

  // Modals state
  const [versionModalState, setVersionModalState] = useState({ isOpen: false, entity: '', versions: [] });
  const [resetModalState, setResetModalState] = useState({ isOpen: false, sectionKey: '', title: '', diffs: [] });
  const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, item: null, reason: '' });

  // Toast / Audit Notification
  const [notification, setNotification] = useState(null);

  const showNotification = (msgEn, msgAr) => {
    setNotification(language === 'ar' ? msgAr : msgEn);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleOpenDrawer = (drawerId) => {
    setActiveDrawer(drawerId);
  };

  // Version History Trigger
  const handleOpenVersionHistory = (entityType, entityName) => {
    const mockVersions = [
      {
        id: 'v1',
        version: 2,
        effective_from: '2026-11-01',
        changed_by: user?.name || 'Maryam Al-Nuaimi',
        summary: language === 'ar' ? 'تعديل المعاملات والقواعد' : 'Updated rates & statutory rules',
        created_at: new Date().toISOString(),
      },
      {
        id: 'v0',
        version: 1,
        effective_from: '2026-01-01',
        changed_by: 'System Seed (Cabinet Resolution No. 1/2022)',
        summary: language === 'ar' ? 'الإصدار المبدئي المعتمد' : 'Initial statutory UAE baseline',
        created_at: '2026-01-01T00:00:00Z',
      },
    ];
    setVersionModalState({
      isOpen: true,
      entity: entityName || entityType,
      versions: mockVersions,
    });
  };

  // Reset to UAE Defaults Trigger
  const handleOpenResetDefaults = (sectionKey) => {
    let title = 'UAE Statutory Baseline';
    let diffs = [];

    if (sectionKey === 'holidays') {
      title = language === 'ar' ? 'العطلات الرسمية 2026' : 'Public Holidays 2026';
      diffs = [
        { label: 'Total Holidays in 2026', current: `${holidays.length} configured`, defaultVal: '8 Statutory Holidays' },
        { label: 'Scope', current: 'Custom Branch Overrides', defaultVal: 'Company-Wide (All UAE Branches)' },
      ];
    } else if (sectionKey === 'salary_rules') {
      title = language === 'ar' ? 'قواعد وهياكل الرواتب' : 'Salary Rules & Divisors';
      diffs = [
        { label: 'Absence Divisor', current: payrollAlerts.absence_divisor, defaultVal: 'DAYS_30 (÷30 Standard Month)' },
        { label: 'Normal OT Multiplier', current: '1.25x', defaultVal: '1.25x (Statutory Article 19)' },
        { label: 'Night OT Multiplier', current: '1.50x', defaultVal: '1.50x (22:00 - 04:00 Window)' },
        { label: 'GPSSA EE Rate', current: '5.0%', defaultVal: '5.0% (UAE Nationals)' },
      ];
    }

    setResetModalState({
      isOpen: true,
      sectionKey,
      title,
      diffs,
    });
  };

  const handleConfirmReset = () => {
    if (resetModalState.sectionKey === 'holidays') {
      setHolidays(INITIAL_HOLIDAYS_2026);
      showNotification('Restored official UAE 2026 holidays baseline.', 'تم استعادة عطلات 2026 الرسمية بنجاح.');
    } else if (resetModalState.sectionKey === 'salary_rules') {
      setSalaryRules(INITIAL_SALARY_RULES);
      setPayrollAlerts({ ...payrollAlerts, absence_divisor: 'DAYS_30' });
      showNotification('Restored Section 8.1 statutory salary rules.', 'تمت استعادة قواعد الرواتب القانونية وفق المادة 8.1.');
    }
    setResetModalState({ isOpen: false, sectionKey: '', title: '', diffs: [] });
  };

  // Delete In Use Trigger (Rule E)
  const handleDeleteBlocked = (item, reason) => {
    setDeleteModalState({
      isOpen: true,
      item,
      reason,
    });
  };

  const handleDeactivate = () => {
    if (deleteModalState.item) {
      showNotification(
        `Item '${deleteModalState.item.name}' deactivated successfully. Historical records preserved.`,
        `تم إلغاء تفعيل '${deleteModalState.item.name}' بنجاح مع الحفاظ على السجلات التاريخية.`
      );
    }
    setDeleteModalState({ isOpen: false, item: null, reason: '' });
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className="fixed top-5 end-5 z-50 p-4 rounded-2xl border shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4"
          style={{ background: 'var(--surface)', borderColor: 'var(--primary)', color: 'var(--text)' }}
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{notification}</span>
        </div>
      )}

      {/* Header & Persona Role Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-text dark:gold-heading tracking-tight">
              {language === 'ar' ? 'إعدادات المنشأة والنظام (المرحلة 3)' : 'Company Settings & Configuration'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/20 text-primary border border-primary/30">
              PHASE 3 COMPLETE
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            {language === 'ar'
              ? 'المعايير المحددة (Section 9): ملف الشركة، التأشيرات (WPS)، الفروع، الأقسام، الورديات، الإجازات، قواعد الرواتب، مسارات الاعتماد، وفحوصات المسير.'
              : 'Section 9 Architecture: Company-scoped, effective-dated, audit-logged settings with locked pay run immutability.'}
          </p>
        </div>

        {/* Current Role Banner */}
        <div className="flex items-center gap-2 p-2 rounded-xl border border-border/70 bg-surface/60 text-xs shrink-0">
          <Shield className="w-4 h-4 text-primary" />
          <div>
            <span className="text-text-muted block text-[10px]">{language === 'ar' ? 'صلاحيات الجلسة الحالية:' : 'Active Role Authority:'}</span>
            <span className="font-bold text-text">
              {user?.roleNameEn || currentRole}
            </span>
          </div>
        </div>
      </div>

      {/* Bento Grid Overview of 10 Settings Sections */}
      <SettingsOverviewBento
        stats={{
          visasCount: companyProfile.visas?.length || 2,
          branchesCount: branches.length,
        }}
        userRole={currentRole}
        onOpenDrawer={handleOpenDrawer}
      />

      {/* =========================================================================
          Detail Drawers
         ========================================================================= */}
      {/* 1. Company Profile & Visas Drawer */}
      <CompanyProfileDrawer
        isOpen={activeDrawer === 'profile'}
        onClose={() => setActiveDrawer(null)}
        company={companyProfile}
        canEdit={isHrOrAdmin}
        onSave={(data) => {
          setCompanyProfile(data);
          showNotification('Company profile and company visas updated.', 'تم تحديث ملف الشركة وتأشيرات الكيان بنجاح.');
        }}
      />

      {/* 2. Branches Drawer */}
      <BranchesDrawer
        isOpen={activeDrawer === 'branches'}
        onClose={() => setActiveDrawer(null)}
        branches={branches}
        visas={companyProfile.visas}
        canEdit={isHrOrAdmin}
        onSave={(updated) => {
          setBranches(updated);
          showNotification('Branches configuration updated.', 'تم تحديث فروع الشركة بنجاح.');
        }}
        onDeleteBranch={handleDeleteBlocked}
      />

      {/* 3. Departments & Jobs Drawer */}
      <DepartmentsJobsDrawer
        isOpen={activeDrawer === 'departments_jobs'}
        onClose={() => setActiveDrawer(null)}
        departments={departments}
        jobs={jobs}
        canEdit={isHrOrAdmin}
        onSave={({ departments: d, jobs: j }) => {
          setDepartments(d);
          setJobs(j);
          showNotification('Department hierarchy and job positions saved.', 'تم حفظ الهيكل التنظيمي للأقسام والوظائف.');
        }}
      />

      {/* 4. Shifts & Attendance Policies Drawer */}
      <ShiftsPoliciesDrawer
        isOpen={activeDrawer === 'shifts_policies'}
        onClose={() => setActiveDrawer(null)}
        shifts={shifts}
        policy={attendancePolicy}
        canEdit={isHrOrAdmin}
        onSave={({ shifts: s, policy: p, effective_from: eff }) => {
          setShifts(s);
          setAttendancePolicy(p);
          showNotification(`Shifts and policies saved. Effective from ${eff}.`, `تم حفظ جداول الورديات والسياسات. تسري من ${eff}.`);
        }}
        onViewHistory={handleOpenVersionHistory}
        onDeleteShift={handleDeleteBlocked}
      />

      {/* 5. Leave Types & Accruals Drawer */}
      <LeaveAccrualDrawer
        isOpen={activeDrawer === 'leave_accruals'}
        onClose={() => setActiveDrawer(null)}
        leaveTypes={leaveTypes}
        canEdit={isHrOrAdmin}
        onSave={(updated) => {
          setLeaveTypes(updated);
          showNotification('Leave pay bands and accrual rules updated.', 'تم تحديث شرائح دفع الإجازات وقواعد التراكم.');
        }}
      />

      {/* 6. Public Holidays Drawer */}
      <PublicHolidaysDrawer
        isOpen={activeDrawer === 'holidays'}
        onClose={() => setActiveDrawer(null)}
        holidays={holidays}
        branches={branches}
        canEdit={isHrOrAdmin}
        onSave={(updated) => {
          setHolidays(updated);
          showNotification('2026 public holidays calendar updated.', 'تم تحديث جدول العطلات الرسمية لسنة 2026.');
        }}
        onResetDefaults={() => handleOpenResetDefaults('holidays')}
      />

      {/* 7. Salary Rules & Simulator Drawer (Rule A, B, C, D) */}
      <SalaryRulesDrawer
        isOpen={activeDrawer === 'salary_rules'}
        onClose={() => setActiveDrawer(null)}
        rules={salaryRules}
        companySettings={payrollAlerts}
        userRole={currentRole}
        canEdit={isHrOrAdmin || isPayrollOfficer || isFinance}
        onSave={({ rules: r, absence_divisor: ad, effective_from: eff }) => {
          setSalaryRules(r);
          setPayrollAlerts({ ...payrollAlerts, absence_divisor: ad });
          showNotification(`Salary rules & divisor updated. Effective from ${eff}.`, `تم تحديث قواعد الرواتب ومقسوم الغياب. يسري من ${eff}.`);
        }}
        onViewHistory={handleOpenVersionHistory}
        onResetDefaults={() => handleOpenResetDefaults('salary_rules')}
      />

      {/* 8. Approval Settings Drawer */}
      <ApprovalSettingsDrawer
        isOpen={activeDrawer === 'approvals'}
        onClose={() => setActiveDrawer(null)}
        approvalFlows={approvalFlows}
        canEdit={isHrOrAdmin}
        onSave={(updated) => {
          setApprovalFlows(updated);
          showNotification('Approval workflows and conditional stages saved.', 'تم حفظ مسارات الموافقة والخطوات المشروطة.');
        }}
      />

      {/* 9. Payroll Checks & Document Alerts Drawer */}
      <PayrollAlertsDrawer
        isOpen={activeDrawer === 'payroll_alerts'}
        onClose={() => setActiveDrawer(null)}
        settings={payrollAlerts}
        canEdit={isHrOrAdmin}
        onSave={(updated) => {
          setPayrollAlerts({ ...payrollAlerts, ...updated });
          showNotification('Payroll cut-off and document alert milestones saved.', 'تم حفظ إعدادات قطع المسير وتنبيهات الوثائق.');
        }}
      />

      {/* =========================================================================
          Universal Settings Modals
         ========================================================================= */}
      {/* Version History Modal (Rule C) */}
      <VersionHistoryModal
        isOpen={versionModalState.isOpen}
        onClose={() => setVersionModalState({ ...versionModalState, isOpen: false })}
        entityName={versionModalState.entity}
        versions={versionModalState.versions}
      />

      {/* Reset Defaults Confirmation & Diff Preview Modal (Rule G) */}
      <ResetDefaultsModal
        isOpen={resetModalState.isOpen}
        onClose={() => setResetModalState({ ...resetModalState, isOpen: false })}
        sectionTitle={resetModalState.title}
        sectionKey={resetModalState.sectionKey}
        diffItems={resetModalState.diffs}
        onConfirm={handleConfirmReset}
      />

      {/* Delete in Use Blocked Modal (Rule E) */}
      <DeleteInUseModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ ...deleteModalState, isOpen: false })}
        itemName={deleteModalState.item?.name || 'Item'}
        reason={deleteModalState.reason}
        onDeactivate={handleDeactivate}
      />
    </div>
  );
}
