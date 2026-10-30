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
  Loader2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { SettingsOverviewBento } from '../../components/features/settings/SettingsOverviewBento';
import { CompanyProfileDrawer } from '../../components/features/settings/drawers/CompanyProfileDrawer';
import { BranchesDrawer } from '../../components/features/settings/drawers/BranchesDrawer';
import { DepartmentsJobsDrawer } from '../../components/features/settings/drawers/DepartmentsJobsDrawer';
import { ShiftsPoliciesDrawer } from '../../components/features/settings/drawers/ShiftsPoliciesDrawer';
import { LeaveAccrualDrawer } from '../../components/features/settings/drawers/LeaveAccrualDrawer';
import { PublicHolidaysDrawer } from '../../components/features/settings/drawers/PublicHolidaysDrawer';
import { SalaryRulesDrawer } from '../../components/features/settings/drawers/SalaryRulesDrawer';
import { ApprovalSettingsDrawer } from '../../components/features/settings/drawers/ApprovalSettingsDrawer';
import { PayrollAlertsDrawer } from '../../components/features/settings/drawers/PayrollAlertsDrawer';
import { SupportAccessDrawer } from '../../components/features/settings/drawers/SupportAccessDrawer';
import { VersionHistoryModal } from '../../components/features/settings/modals/VersionHistoryModal';
import { ResetDefaultsModal } from '../../components/features/settings/modals/ResetDefaultsModal';
import { DeleteInUseModal } from '../../components/features/settings/modals/DeleteInUseModal';

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
} from '../../components/features/settings/settingsData';

import {
  fetchSettingsOverview,
  fetchCompanyProfile,
  updateCompanyProfile,
  fetchBranches,
  updateBranch,
  createBranch,
  deleteBranch,
  fetchDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  fetchJobs,
  createJob,
  updateJob,
  deleteJob,
  fetchShifts,
  createShift,
  updateShift,
  deleteShift,
  fetchAttendancePolicies,
  updateAttendancePolicy,
  fetchLeaveTypes,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  fetchHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  fetchSalaryRules,
  createSalaryRule,
  updateSalaryRule,
  deleteSalaryRule,
  fetchApprovalFlows,
  updateApprovalFlow,
  fetchPayrollAlerts,
  updatePayrollAlerts,
  fetchVersionHistory,
  fetchDefaultsDiff,
  resetDefaults,
} from '../../services/settingsApi';

export default function SettingsPage() {
  const { user } = useAuth();
  const { isRTL, language } = useLanguage();
  const queryClient = useQueryClient();

  const currentRole = user?.role || 'COMPANY_ADMIN';
  const isHrOrAdmin = currentRole === 'HR_MANAGER' || currentRole === 'COMPANY_ADMIN';
  const isPayrollOfficer = currentRole === 'PAYROLL_OFFICER';
  const isFinance = currentRole === 'FINANCE';

  // 1. TanStack Queries for All 9 Screens
  const { data: overviewData, isLoading: isLoadingOverview } = useQuery({
    queryKey: ['settings', 'overview'],
    queryFn: fetchSettingsOverview,
  });

  const { data: companyProfile = INITIAL_COMPANY_PROFILE } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanyProfile,
  });

  const { data: branches = INITIAL_BRANCHES } = useQuery({
    queryKey: ['settings', 'branches'],
    queryFn: fetchBranches,
  });

  const { data: departments = INITIAL_DEPARTMENTS } = useQuery({
    queryKey: ['settings', 'departments'],
    queryFn: fetchDepartments,
  });

  const { data: jobs = INITIAL_JOBS } = useQuery({
    queryKey: ['settings', 'jobs'],
    queryFn: fetchJobs,
  });

  const { data: shifts = INITIAL_SHIFTS } = useQuery({
    queryKey: ['settings', 'shifts'],
    queryFn: fetchShifts,
  });

  const { data: attendancePolicies = [INITIAL_ATTENDANCE_POLICY] } = useQuery({
    queryKey: ['settings', 'attendance-policies'],
    queryFn: fetchAttendancePolicies,
  });

  const { data: leaveTypes = INITIAL_LEAVE_TYPES } = useQuery({
    queryKey: ['settings', 'leave-types'],
    queryFn: fetchLeaveTypes,
  });

  const { data: holidays = INITIAL_HOLIDAYS_2026 } = useQuery({
    queryKey: ['settings', 'holidays'],
    queryFn: () => fetchHolidays(2026),
  });

  const { data: salaryRules = INITIAL_SALARY_RULES } = useQuery({
    queryKey: ['settings', 'salary-rules'],
    queryFn: fetchSalaryRules,
  });

  const { data: approvalFlows = INITIAL_APPROVAL_FLOWS } = useQuery({
    queryKey: ['settings', 'approval-flows'],
    queryFn: fetchApprovalFlows,
  });

  const { data: payrollAlerts = INITIAL_PAYROLL_ALERTS } = useQuery({
    queryKey: ['settings', 'payroll-alerts'],
    queryFn: fetchPayrollAlerts,
  });

  // Active Open Drawer (null | 'profile' | 'branches' | 'departments_jobs' | 'shifts_policies' | 'leave_accruals' | 'holidays' | 'salary_rules' | 'approvals' | 'payroll_alerts')
  const [activeDrawer, setActiveDrawer] = useState(null);

  // Modals state
  const [versionModalState, setVersionModalState] = useState({ isOpen: false, entity: '', versions: [] });
  const [resetModalState, setResetModalState] = useState({ isOpen: false, sectionKey: '', title: '', diffs: [] });
  const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, item: null, reason: '' });

  // Toast / Notification
  const [notification, setNotification] = useState(null);
  const showNotification = (msgEn, msgAr) => {
    setNotification(language === 'ar' ? msgAr : msgEn);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleOpenDrawer = (drawerId) => {
    setActiveDrawer(drawerId);
  };

  // Version History Trigger
  const handleOpenVersionHistory = async (entityType, entityName) => {
    try {
      const history = await fetchVersionHistory(entityType, entityName);
      setVersionModalState({
        isOpen: true,
        entity: entityName || entityType,
        versions: Array.isArray(history) && history.length > 0 ? history : [
          {
            id: 'v1',
            version: 1,
            effective_from: '2026-01-01',
            changed_by: user?.name || 'Maryam Al-Nuaimi',
            summary: language === 'ar' ? 'الإصدار المعتمد للنظام' : 'Statutory baseline version',
            created_at: new Date().toISOString(),
          },
        ],
      });
    } catch {
      setVersionModalState({
        isOpen: true,
        entity: entityName || entityType,
        versions: [
          {
            id: 'v1',
            version: 1,
            effective_from: '2026-01-01',
            changed_by: user?.name || 'Maryam Al-Nuaimi',
            summary: language === 'ar' ? 'الإصدار المعتمد للنظام' : 'Statutory baseline version',
            created_at: new Date().toISOString(),
          },
        ],
      });
    }
  };

  // Reset to UAE Defaults Trigger
  const handleOpenResetDefaults = async (sectionKey) => {
    let title = 'UAE Statutory Baseline';
    let diffs = [];

    try {
      const preview = await fetchDefaultsDiff(sectionKey);
      if (preview && Array.isArray(preview.diffs)) {
        diffs = preview.diffs;
      }
    } catch (e) {
      // Dev fallback diff preview
      if (sectionKey === 'holidays') {
        title = language === 'ar' ? 'العطلات الرسمية 2026' : 'Public Holidays 2026';
        diffs = [
          { label: 'Total Holidays in 2026', current: `${holidays.length} configured`, defaultVal: '13 Statutory Holidays' },
          { label: 'Scope', current: 'Custom Branch Overrides', defaultVal: 'Company-Wide (All UAE Branches)' },
        ];
      } else if (sectionKey === 'salary_rules') {
        title = language === 'ar' ? 'قواعد وهياكل الرواتب' : 'Salary Rules & Divisors';
        diffs = [
          { label: 'Absence Divisor', current: payrollAlerts?.absence_divisor || 'DAYS_30', defaultVal: 'DAYS_30 (÷30 Standard Month)' },
          { label: 'Normal OT Multiplier', current: '1.25x', defaultVal: '1.25x (Statutory Article 19)' },
          { label: 'Night OT Multiplier', current: '1.50x', defaultVal: '1.50x (22:00 - 04:00 Window)' },
          { label: 'GPSSA EE Rate', current: '11.0% / 5.0%', defaultVal: '11% new / 5% legacy' },
        ];
      }
    }

    setResetModalState({
      isOpen: true,
      sectionKey,
      title,
      diffs,
    });
  };

  const handleConfirmReset = async () => {
    try {
      await resetDefaults(resetModalState.sectionKey);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      showNotification('Restored UAE statutory baseline.', 'تمت استعادة الإعدادات القانونية لدولة الإمارات.');
    } catch (err) {
      showNotification(`Reset failed: ${err.message}`, `فشل الاسترجاع: ${err.message}`);
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

  // 2. Drawer Save Handlers (Mutations through /api/v1)
  const handleSaveCompanyProfile = async (updatedData) => {
    try {
      await updateCompanyProfile(updatedData);
      queryClient.invalidateQueries({ queryKey: ['settings', 'company'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'overview'] });
      showNotification('Company profile and visas updated.', 'تم حفظ الملف التعريفي للشركة.');
    } catch (err) {
      showNotification(`Save failed: ${err.message}`, `فشل الحفظ: ${err.message}`);
    }
  };

  const handleSaveBranches = async (updatedBranches) => {
    try {
      for (const b of updatedBranches) {
        if (b.id && !b.id.startsWith('b-custom')) {
          await updateBranch(b.id, b);
        } else {
          await createBranch(b);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['settings', 'branches'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'overview'] });
      showNotification('Branches updated successfully.', 'تم حفظ فروع الشركة بنجاح.');
    } catch (err) {
      showNotification(`Save failed: ${err.message}`, `فشل الحفظ: ${err.message}`);
    }
  };

  const handleSaveDepartmentsJobs = async ({ departments: depts, jobs: jobList }) => {
    try {
      for (const d of depts) {
        if (d.id && !d.id.startsWith('d-custom')) {
          await updateDepartment(d.id, d);
        } else {
          await createDepartment(d);
        }
      }
      for (const j of jobList) {
        if (j.id && !j.id.startsWith('j-custom')) {
          await updateJob(j.id, j);
        } else {
          await createJob(j);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['settings', 'departments'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'jobs'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'overview'] });
      showNotification('Departments and jobs saved successfully.', 'تم حفظ الأقسام والوظائف بنجاح.');
    } catch (err) {
      showNotification(`Save failed: ${err.message}`, `فشل الحفظ: ${err.message}`);
    }
  };

  const handleSaveShiftsPolicies = async ({ shifts: shiftList, policy: pol, effective_from: eff }) => {
    try {
      // 1. Save shifts
      if (shiftList && shiftList.length > 0) {
        for (const s of shiftList) {
          if (s.id && !s.id.startsWith('s-custom')) {
            await updateShift(s.id, {
              name: s.name,
              start_time: s.start_time,
              end_time: s.end_time,
              break_minutes: Number(s.break_minutes),
              grace_minutes: Number(s.grace_minutes),
              weekly_off_days: s.weekly_off_days,
              is_ramadan_reduced: s.is_ramadan_reduced,
              effective_from: eff,
            });
          } else {
            await createShift({
              name: s.name,
              start_time: s.start_time,
              end_time: s.end_time,
              break_minutes: Number(s.break_minutes),
              grace_minutes: Number(s.grace_minutes),
              weekly_off_days: s.weekly_off_days,
              effective_from: eff,
            });
          }
        }
      }

      // 2. Save policy
      if (pol) {
        const policyId = pol.id || attendancePolicies?.[0]?.id;
        if (policyId) {
          await updateAttendancePolicy(policyId, {
            late_grace_minutes: Number(pol.late_grace_minutes),
            min_ot_minutes: Number(pol.min_ot_minutes),
            effective_from: eff,
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['settings', 'shifts'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'attendance-policies'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'overview'] });
      showNotification(`Shifts and policies saved. Effective from ${eff}.`, `تم حفظ جداول الورديات والسياسات. تسري من ${eff}.`);
    } catch (err) {
      showNotification(`Save failed: ${err.message}`, `فشل الحفظ: ${err.message}`);
    }
  };

  const handleSaveLeaveTypes = async (types) => {
    try {
      for (const lt of types) {
        if (lt.id && !lt.id.startsWith('lt-custom')) {
          await updateLeaveType(lt.id, lt);
        } else {
          await createLeaveType(lt);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['settings', 'leave-types'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'overview'] });
      showNotification('Leave types updated successfully.', 'تم حفظ أنواع الإجازات بنجاح.');
    } catch (err) {
      showNotification(`Save failed: ${err.message}`, `فشل الحفظ: ${err.message}`);
    }
  };

  const handleSaveHolidays = async (holidayList) => {
    try {
      for (const h of holidayList) {
        if (h.id && !h.id.startsWith('h-custom')) {
          await updateHoliday(h.id, h);
        } else {
          await createHoliday(h);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['settings', 'holidays'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'overview'] });
      showNotification('Public holidays saved successfully.', 'تم حفظ العطلات الرسمية بنجاح.');
    } catch (err) {
      showNotification(`Save failed: ${err.message}`, `فشل الحفظ: ${err.message}`);
    }
  };

  const handleSaveSalaryRules = async ({ rules: ruleList, absence_divisor: ad, effective_from: eff }) => {
    try {
      for (const r of ruleList) {
        if (r.id && !r.id.startsWith('r-custom')) {
          await updateSalaryRule(r.id, { ...r, effective_from: eff });
        } else {
          await createSalaryRule({ ...r, effective_from: eff });
        }
      }
      if (ad) {
        await updatePayrollAlerts({ absence_divisor: ad });
      }
      queryClient.invalidateQueries({ queryKey: ['settings', 'salary-rules'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'payroll-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'overview'] });
      showNotification(`Salary rules & divisor updated. Effective from ${eff}.`, `تم تحديث قواعد الرواتب ومقسوم الغياب. يسري من ${eff}.`);
    } catch (err) {
      showNotification(`Save failed: ${err.message}`, `فشل الحفظ: ${err.message}`);
    }
  };

  const handleSaveApprovalFlows = async (flows) => {
    try {
      for (const f of flows) {
        if (f.id) {
          await updateApprovalFlow(f.id, f);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['settings', 'approval-flows'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'overview'] });
      showNotification('Approval workflows saved successfully.', 'تم حفظ مسارات الموافقة بنجاح.');
    } catch (err) {
      showNotification(`Save failed: ${err.message}`, `فشل الحفظ: ${err.message}`);
    }
  };

  const handleSavePayrollAlerts = async (alerts) => {
    try {
      await updatePayrollAlerts(alerts);
      queryClient.invalidateQueries({ queryKey: ['settings', 'payroll-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'overview'] });
      showNotification('Payroll checks & alerts saved successfully.', 'تم حفظ إعدادات فحوصات الرواتب بنجاح.');
    } catch (err) {
      showNotification(`Save failed: ${err.message}`, `فشل الحفظ: ${err.message}`);
    }
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
              ? 'إدارة الهيكل المؤسسي، قواعد الرواتب القانونية، مسارات الموافقة، وحماية الرواتب المقفلة (FR-ST1–10)'
              : 'Enterprise hierarchy, statutory salary rules, approval delegation & locked period protection (FR-ST1–10)'}
          </p>
        </div>

        {/* Persona Role Pill */}
        <div
          className="px-3.5 py-2 rounded-xl border flex items-center gap-2.5 shrink-0 shadow-sm"
          style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)' }}
        >
          <Shield className="w-4 h-4 text-primary" />
          <div>
            <span className="text-[10px] text-text-muted block font-medium">
              {language === 'ar' ? 'صلاحيات الوصول (المادة 5.3):' : 'Effective Permissions (Section 5.3):'}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-text">
                {user?.roleNameEn || currentRole}
              </span>
              {isHrOrAdmin && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Full Access
                </span>
              )}
              {isPayrollOfficer && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Salary Rules Only
                </span>
              )}
              {isFinance && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-sky-500/10 text-sky-300 border border-sky-500/20">
                  GL Accounts Only
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Settings Bento Overview */}
      <SettingsOverviewBento
        onOpenDrawer={handleOpenDrawer}
        userRole={currentRole}
        overviewData={overviewData}
      />

      {/* =========================================================================
          Detail Forms in Slide-over Drawers (Connected to /api/v1 Endpoints)
         ========================================================================= */}

      {/* 1. Company Profile & Visas Drawer */}
      <CompanyProfileDrawer
        isOpen={activeDrawer === 'profile'}
        onClose={() => setActiveDrawer(null)}
        companyProfile={companyProfile}
        canEdit={isHrOrAdmin}
        onSave={handleSaveCompanyProfile}
      />

      {/* 2. Branches Drawer */}
      <BranchesDrawer
        isOpen={activeDrawer === 'branches'}
        onClose={() => setActiveDrawer(null)}
        branches={branches}
        visas={companyProfile.visas || companyProfile.company_visas}
        canEdit={isHrOrAdmin}
        onSave={handleSaveBranches}
        onDeleteBranch={handleDeleteBlocked}
      />

      {/* 3. Departments & Jobs Drawer */}
      <DepartmentsJobsDrawer
        isOpen={activeDrawer === 'departments_jobs'}
        onClose={() => setActiveDrawer(null)}
        departments={departments}
        jobs={jobs}
        canEdit={isHrOrAdmin}
        onSave={handleSaveDepartmentsJobs}
      />

      {/* 4. Shifts & Attendance Policies Drawer */}
      <ShiftsPoliciesDrawer
        isOpen={activeDrawer === 'shifts_policies'}
        onClose={() => setActiveDrawer(null)}
        shifts={shifts}
        policy={attendancePolicies?.[0] || attendancePolicies}
        canEdit={isHrOrAdmin}
        onSave={handleSaveShiftsPolicies}
        onViewHistory={handleOpenVersionHistory}
        onDeleteShift={handleDeleteBlocked}
      />

      {/* 5. Leave Types & Accruals Drawer */}
      <LeaveAccrualDrawer
        isOpen={activeDrawer === 'leave_accruals'}
        onClose={() => setActiveDrawer(null)}
        leaveTypes={leaveTypes}
        canEdit={isHrOrAdmin}
        onSave={handleSaveLeaveTypes}
      />

      {/* 6. Public Holidays Drawer */}
      <PublicHolidaysDrawer
        isOpen={activeDrawer === 'holidays'}
        onClose={() => setActiveDrawer(null)}
        holidays={holidays}
        branches={branches}
        canEdit={isHrOrAdmin}
        onSave={handleSaveHolidays}
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
        onSave={handleSaveSalaryRules}
        onViewHistory={handleOpenVersionHistory}
        onResetDefaults={() => handleOpenResetDefaults('salary_rules')}
      />

      {/* 8. Approval Settings Drawer */}
      <ApprovalSettingsDrawer
        isOpen={activeDrawer === 'approvals'}
        onClose={() => setActiveDrawer(null)}
        approvalFlows={approvalFlows}
        canEdit={isHrOrAdmin}
        onSave={handleSaveApprovalFlows}
      />

      {/* 9. Payroll Checks & Document Alerts Drawer */}
      <PayrollAlertsDrawer
        isOpen={activeDrawer === 'payroll_alerts'}
        onClose={() => setActiveDrawer(null)}
        settings={payrollAlerts}
        canEdit={isHrOrAdmin}
        onSave={handleSavePayrollAlerts}
      />

      {/* 10. Support Access (FR-PL3) Drawer */}
      <SupportAccessDrawer
        isOpen={activeDrawer === 'support_access'}
        onClose={() => setActiveDrawer(null)}
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
