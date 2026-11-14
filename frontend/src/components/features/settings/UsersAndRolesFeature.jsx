'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { getEnumLabel } from '../../../i18n/enums';
import { request } from '../../../services/apiClient';
import { Select } from '../../primitives/form/Select';
import {
  Users,
  UserPlus,
  Shield,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Building,
  Briefcase,
  Search,
  Filter,
  Check,
  ChevronRight,
  Sparkles,
  Copy,
  Layers,
} from 'lucide-react';

const COMPANY_ROLES = [
  { code: 'COMPANY_ADMIN', nameEn: 'Company Administrator', nameAr: 'مسؤول النظام للشركة', seesSalary: true },
  { code: 'HR_MANAGER', nameEn: 'HR Manager', nameAr: 'مدير الموارد البشرية', seesSalary: true },
  { code: 'HR_OFFICER', nameEn: 'HR Officer', nameAr: 'مسؤول موارد بشرية', seesSalary: false },
  { code: 'PAYROLL_OFFICER', nameEn: 'Payroll Officer', nameAr: 'مسؤول الرواتب والأجور', seesSalary: true },
  { code: 'DEPT_MANAGER', nameEn: 'Department Manager', nameAr: 'مدير قسم', seesSalary: false },
  { code: 'GM', nameEn: 'General Manager', nameAr: 'المدير العام', seesSalary: true },
  { code: 'FINANCE', nameEn: 'Finance / Accounts', nameAr: 'المالية والحسابات', seesSalary: true },
  { code: 'EMPLOYEE', nameEn: 'Employee', nameAr: 'موظف', seesSalary: false },
];

export function UsersAndRolesFeature() {
  const { user } = useAuth();
  const { locale, language, isRTL } = useLanguage();

  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [createdInviteDetails, setCreatedInviteDetails] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  // Invite Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedRoles, setSelectedRoles] = useState(['EMPLOYEE']);
  const [scopeType, setScopeType] = useState('Company'); // 'Company' | 'CompanyVisa' | 'Branch' | 'Department'
  const [scopeTarget, setScopeTarget] = useState('All');

  const [companyVisas, setCompanyVisas] = useState([]);
  const [companyBranches, setCompanyBranches] = useState([]);
  const [companyDepartments, setCompanyDepartments] = useState([]);

  // Bulk creation summary
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkPreview, setBulkPreview] = useState(null);
  const [loadingBulkPreview, setLoadingBulkPreview] = useState(false);
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  useEffect(() => {
    async function loadScopeEntities() {
      try {
        const [visasRes, branchesRes, deptsRes] = await Promise.allSettled([
          request('/settings/visas'),
          request('/settings/branches'),
          request('/settings/departments'),
        ]);
        if (visasRes.status === 'fulfilled' && Array.isArray(visasRes.value)) {
          setCompanyVisas(visasRes.value);
        }
        if (branchesRes.status === 'fulfilled' && Array.isArray(branchesRes.value)) {
          setCompanyBranches(branchesRes.value);
        }
        if (deptsRes.status === 'fulfilled' && Array.isArray(deptsRes.value)) {
          setCompanyDepartments(deptsRes.value);
        }
      } catch (e) {
        console.warn('Failed to load scope entities', e);
      }
    }
    loadScopeEntities();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsInviteModalOpen(false);
        setIsBulkModalOpen(false);
        setCreatedInviteDetails(null);
        setBulkResult(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const scopeTargetOptions = React.useMemo(() => {
    if (scopeType === 'CompanyVisa') {
      return companyVisas.map((v) => ({
        value: v.id,
        label: locale === 'ar' && v.name_ar ? v.name_ar : `${v.name} (${v.mol_establishment_id || v.emirate})`,
      }));
    }
    if (scopeType === 'Branch') {
      return companyBranches.map((b) => ({
        value: b.id,
        label: locale === 'ar' && b.name_ar ? b.name_ar : `${b.name} (${b.emirate})`,
      }));
    }
    if (scopeType === 'Department') {
      return companyDepartments.map((d) => ({
        value: d.id,
        label: locale === 'ar' && d.name_ar ? d.name_ar : d.name,
      }));
    }
    return [{ value: 'All', label: locale === 'ar' ? 'جميع الكيانات (كامل الشركة)' : 'Company-Wide (All)' }];
  }, [scopeType, companyVisas, companyBranches, companyDepartments, locale]);

  useEffect(() => {
    if (scopeType === 'Company') {
      setScopeTarget('All');
    } else if (scopeTargetOptions.length > 0) {
      setScopeTarget(scopeTargetOptions[0].value);
    } else {
      setScopeTarget('');
    }
  }, [scopeType, scopeTargetOptions]);

  const loadUsers = async () => {
    try {
      const data = await request('/users');
      if (Array.isArray(data)) {
        setUsers(
          data.map((u) => ({
            ...u,
            name: u.employee?.name || u.name || u.email.split('@')[0],
          }))
        );
        return;
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setUsers([]);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleRoleSelection = (roleCode) => {
    if (selectedRoles.includes(roleCode)) {
      if (selectedRoles.length > 1) {
        setSelectedRoles(selectedRoles.filter((r) => r !== roleCode));
      }
    } else {
      setSelectedRoles([...selectedRoles, roleCode]);
    }
  };

  const handleOpenBulkModal = async () => {
    setIsBulkModalOpen(true);
    setLoadingBulkPreview(true);
    try {
      const data = await request('/users/bulk-create-preview');
      setBulkPreview(data);
    } catch (e) {
      console.warn('Failed to load bulk preview', e);
      setBulkPreview(null);
    } finally {
      setLoadingBulkPreview(false);
    }
  };

  const handleOpenInviteModal = async () => {
    setIsInviteModalOpen(true);
    try {
      const emps = await request('/employees');
      const list = Array.isArray(emps) ? emps : Array.isArray(emps?.data) ? emps.data : [];
      setAvailableEmployees(list.filter((e) => e.status === 'Active'));
    } catch (e) {
      console.warn('Failed to load employees for invite modal', e);
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;

    const isOnlyEmployeeRole = selectedRoles.length === 1 && selectedRoles[0] === 'EMPLOYEE';
    if (isOnlyEmployeeRole && !selectedEmployeeId) {
      setAlertMessage({
        type: 'error',
        text:
          locale === 'ar'
            ? 'يتطلب دور الموظف فقط الربط بسجل موظف قائم. يرجى اختيار موظف من القائمة.'
            : 'An Employee role invitation must be linked to an existing employee record. Please select an employee.',
      });
      return;
    }

    try {
      const res = await request('/users/invite', {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail,
          employee_id: selectedEmployeeId || undefined,
          role_assignments: selectedRoles.map((code) => ({
            roleCode: code,
            scopeType: ['Company', 'CompanyVisa', 'Branch', 'Department'].includes(scopeType) ? scopeType : 'Company',
            scopeId: scopeType === 'Company' ? null : scopeTarget,
          })),
        }),
      });

      await loadUsers();
      setIsInviteModalOpen(false);
      setCreatedInviteDetails({
        email: inviteEmail,
        roles: selectedRoles,
        tempPassword: res?.tempPassword || res?.data?.tempPassword || res?.data?.data?.tempPassword,
        inviteUrl: res?.inviteUrl || res?.data?.inviteUrl || res?.data?.data?.inviteUrl,
        emailDeliveryFailed: Boolean(res?.emailDeliveryFailed || res?.data?.emailDeliveryFailed || res?.data?.data?.emailDeliveryFailed),
      });
      setInviteEmail('');
      setSelectedRoles(['EMPLOYEE']);
      setSelectedEmployeeId('');
      setAlertMessage({
        type: 'success',
        text:
          locale === 'ar'
            ? `تم إرسال دعوة الانضمام إلى ${inviteEmail} بنجاح.`
            : `Invitation sent to ${inviteEmail} successfully.`,
      });
    } catch (err) {
      setAlertMessage({
        type: 'error',
        text: err.message || 'Failed to send invite',
      });
    }
  };

  const handleBulkCreateLogins = async () => {
    try {
      const res = await request('/users/bulk-create-employees', {
        method: 'POST',
      });
      await loadUsers();
      const createdUsers = Array.isArray(res?.users) ? res.users : [];
      const createdCount = res?.created_count ?? createdUsers.length;
      const totalEligible = res?.total_eligible ?? createdCount;

      setBulkResult({
        totalEligible,
        createdCount,
        users: createdUsers,
        skipped: res?.skipped || [],
        errors: Array.isArray(res?.errors) ? res.errors : [],
      });
      setAlertMessage({
        type: 'success',
        text:
          locale === 'ar'
            ? `تم إنشاء ${createdCount} حساب دخول جديد للموظفين بنجاح.`
            : `Bulk employee account creation complete: ${createdCount} login(s) generated.`,
      });
      setIsBulkModalOpen(false);
    } catch (err) {
      setAlertMessage({
        type: 'error',
        text: err.message || (locale === 'ar' ? 'فشل إنشاء حسابات الموظفين' : 'Failed to create employee logins'),
      });
    }
  };

  const handleDownloadCredentialsCSV = (usersList) => {
    if (!usersList || usersList.length === 0) return;
    const headers = ['Employee Code', 'Email', 'Temporary Password', 'Invite URL'];
    const rows = usersList.map((u) => [
      `"${u.employeeCode || ''}"`,
      `"${u.email || ''}"`,
      `"${u.tempPassword || ''}"`,
      `"${u.inviteUrl || ''}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `employee_credentials_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyAllCredentials = (usersList) => {
    if (!usersList || usersList.length === 0) return;
    const text = usersList
      .map((u) => `Code: ${u.employeeCode || ''} | Email: ${u.email} | Password: ${u.tempPassword}`)
      .join('\n');
    navigator.clipboard?.writeText(text);
    setCopiedField('all');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleToggleUserStatus = async (userId) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const nextStatus = target.status === 'Active' ? 'Disabled' : 'Active';
    try {
      await request(`/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadUsers();
      setAlertMessage({
        type: 'success',
        text:
          locale === 'ar'
            ? `تم تحديث حالة المستخدم ${target.email} إلى ${nextStatus}.`
            : `Updated status for ${target.email} to ${nextStatus}.`,
      });
    } catch (err) {
      setAlertMessage({
        type: 'error',
        text: err.message || (locale === 'ar' ? 'فشل تحديث حالة المستخدم' : 'Failed to update user status'),
      });
    }
  };

  const handleResetMfa = async (userId) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const confirmed = window.confirm(
      locale === 'ar'
        ? `هل أنت متأكد من رغبتك في إعادة تعيين المصادقة الثنائية (MFA) للمستخدم ${target.email}؟ سيُطلب منه إعدادها مجدداً عند تسجيل الدخول.`
        : `Are you sure you want to reset MFA for ${target.email}? The user will be required to re-enrol upon next login.`
    );
    if (!confirmed) return;
    try {
      await request(`/users/${userId}/reset-mfa`, { method: 'POST' });
      await loadUsers();
      setAlertMessage({
        type: 'success',
        text:
          locale === 'ar'
            ? `تمت إعادة تعيين المصادقة الثنائية للمستخدم ${target.email} بنجاح.`
            : `Successfully reset MFA for ${target.email}. Active sessions have been invalidated.`,
      });
    } catch (err) {
      setAlertMessage({
        type: 'error',
        text: err.message || (locale === 'ar' ? 'فشل إعادة تعيين المصادقة الثنائية' : 'Failed to reset MFA'),
      });
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole =
      roleFilter === 'ALL' || (Array.isArray(u.roles) && u.roles.some((r) => (r.code || r) === roleFilter));

    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-4 md:p-8 space-y-6">
        {/* Banner Alert */}
        {alertMessage && (
          <div
            className="p-4 rounded-xl flex items-start justify-between gap-3 text-xs font-medium border animate-in fade-in"
            style={{
              background: 'rgba(16, 185, 129, 0.1)',
              borderColor: 'rgba(16, 185, 129, 0.3)',
              color: '#10b981',
            }}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{alertMessage.text}</span>
            </div>
            <button onClick={() => setAlertMessage(null)} className="hover:opacity-75">
              ✕
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider"
                style={{
                  background: 'var(--primary-wash)',
                  color: 'var(--primary-strong)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                {locale === 'ar' ? 'إدارة الشركة · المواد 5.1–5.4' : 'Company Administration · Section 5.1–5.4'}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-text">
              {locale === 'ar' ? 'المستخدمون والأدوار ونطاقات الصلاحية' : 'Users, Roles & Scopes'}
            </h1>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              {locale === 'ar'
                ? 'دعوة مستخدمي الشركة وتعيين الأدوار السبعة، تحديد نطاقات الصلاحية حسب الفيزا أو الفرع أو القسم، وإنشاء حسابات الموظفين مجمعة'
                : 'Invite team members, assign one or more of the 7 roles, scope access by visa / branch / department, and bulk-create employee logins'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenBulkModal}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all hover:bg-well"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{locale === 'ar' ? 'إنشاء حسابات مجمعة للموظفين' : 'Bulk-Create Employee Logins'}</span>
            </button>

            <button
              id="btn-invite-user"
              onClick={handleOpenInviteModal}
              className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95"
              style={{
                background: 'var(--primary)',
                color: 'var(--on-primary)',
              }}
            >
              <UserPlus className="w-4 h-4" />
              <span>{locale === 'ar' ? 'دعوة مستخدم جديد' : 'Invite User'}</span>
            </button>
          </div>
        </div>

        {/* Roles Catalog Chips */}
        <div
          className="p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--glass-border)',
          }}
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            <span className="text-xs font-bold">{locale === 'ar' ? 'تصفية حسب الدور الوظيفي:' : 'Filter by Role:'}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setRoleFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                roleFilter === 'ALL'
                  ? 'bg-amber-500/20 text-amber-500 dark:text-amber-400 border-amber-500/40'
                  : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              {locale === 'ar' ? 'الكل' : 'All Roles'}
            </button>
            {COMPANY_ROLES.map((r) => (
              <button
                key={r.code}
                onClick={() => setRoleFilter(r.code)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border flex items-center gap-1 ${
                  roleFilter === r.code
                    ? 'bg-amber-500/20 text-amber-500 dark:text-amber-400 border-amber-500/40'
                    : 'border-transparent text-text-muted hover:text-text'
                }`}
              >
                <span>{locale === 'ar' ? r.nameAr : r.nameEn}</span>
                {r.seesSalary && (
                  <span className="text-[9px] text-amber-500 font-mono">WPS</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Users Table */}
        <div className="space-y-4">
          <div className="relative">
            <Search
              className={`absolute top-3 w-4 h-4 text-text-muted ${isRTL ? 'right-3' : 'left-3'}`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                locale === 'ar'
                  ? 'بحث بالاسم أو البريد الإلكتروني للمستخدم...'
                  : 'Search by user name or work email...'
              }
              className={`w-full rounded-xl py-2 text-xs transition-all outline-none border ${
                isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
              }`}
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div
            className="rounded-2xl border overflow-hidden backdrop-blur-md"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--glass-border)',
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead>
                  <tr
                    className="border-b text-start font-semibold"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    <th className="py-3 px-4 text-start">{locale === 'ar' ? 'المستخدم' : 'User'}</th>
                    <th className="py-3 px-4 text-start">{locale === 'ar' ? 'الأدوار المعينة' : 'Assigned Roles'}</th>
                    <th className="py-3 px-4 text-start">{locale === 'ar' ? 'نطاق الصلاحية' : 'Scope'}</th>
                    <th className="py-3 px-4 text-center">{locale === 'ar' ? 'رؤية الرواتب' : 'Salary Access'}</th>
                    <th className="py-3 px-4 text-center">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="py-3 px-4 text-end">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((u) => {
                    const isDisabled = u.status === 'Disabled';
                    const hasSalaryAccess = u.roles.some((r) => r.sees_salary);

                    return (
                      <tr key={u.id} className="hover:bg-well/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
                              style={{
                                background: 'var(--bg-well)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--primary)',
                              }}
                            >
                              {u.name.charAt(0)}
                            </div>
                            <div>
                              <span className="font-semibold block">{language === 'ar' && u.arabic_name ? u.arabic_name : <span data-i18n-skip>{u.name}</span>}</span>
                              <span className="text-[10px] font-mono block" style={{ color: 'var(--text-tertiary)' }} data-i18n-skip>
                                {u.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map((r, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-full text-[10px] font-medium border"
                                style={{
                                  background: 'var(--primary-wash)',
                                  borderColor: 'var(--glass-border)',
                                  color: 'var(--primary-strong)',
                                }}
                              >
                                {getEnumLabel('role_name', r.name || r.code, language)}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-text-muted">
                          <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                            <Layers className="w-3 h-3 text-text-muted" />
                            <span>
                              {getEnumLabel('scope_type', u.roles[0]?.scope_type || 'Company', language)}
                              {u.roles[0]?.scope_name ? ` (${u.roles[0].scope_name})` : ''}
                            </span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {hasSalaryAccess ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/30">
                              {language === 'ar' ? 'مرئي (حماية الأجور)' : 'Visible (WPS)'}
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-well text-text-muted border border-border/50">
                              {language === 'ar' ? 'محجوب (محمي)' : 'Hidden (Protected)'}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isDisabled
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                : u.status === 'Invited'
                                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {language === 'ar' ? getEnumLabel('user_status', u.status, 'ar') : u.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-end space-x-2 rtl:space-x-reverse">
                          <button
                            type="button"
                            disabled={u.id === user?.id || u.email === user?.email}
                            title={
                              u.id === user?.id || u.email === user?.email
                                ? locale === 'ar'
                                  ? 'لا يمكن إعادة تعيين المصادقة الثنائية لحسابك الخاص بدون رمز'
                                  : 'Cannot reset MFA for your own account'
                                : locale === 'ar'
                                ? 'إعادة تعيين المصادقة الثنائية للمستخدم'
                                : 'Reset user MFA'
                            }
                            onClick={() => handleResetMfa(u.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                              u.id === user?.id || u.email === user?.email
                                ? 'opacity-40 cursor-not-allowed border-border text-text-muted'
                                : 'bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500/20'
                            }`}
                          >
                            <span>{locale === 'ar' ? 'إعادة ضبط MFA' : 'Reset MFA'}</span>
                          </button>
                          <button
                            type="button"
                            disabled={u.id === user?.id || u.email === user?.email}
                            title={u.id === user?.id || u.email === user?.email ? (locale === 'ar' ? 'لا يمكن تعطيل حسابك الخاص' : 'Cannot disable your own account') : ''}
                            onClick={() => handleToggleUserStatus(u.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                              u.id === user?.id || u.email === user?.email
                                ? 'opacity-40 cursor-not-allowed border-border text-text-muted'
                                : isDisabled
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                            }`}
                          >
                            {isDisabled ? (
                              <>
                                <Unlock className="w-3 h-3 inline mr-1" />
                                <span>{locale === 'ar' ? 'تفعيل' : 'Activate'}</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3 inline mr-1" />
                                <span>{locale === 'ar' ? 'تعطيل' : 'Disable'}</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Invite User Modal */}
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl p-6 border border-border bg-surface-raised dark:bg-surface shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="font-bold text-base text-text">
                  {locale === 'ar' ? 'دعوة مستخدم وتعيين الأدوار ونطاق الصلاحية' : 'Invite User & Assign Roles / Scope'}
                </h3>
                <button onClick={() => setIsInviteModalOpen(false)} className="hover:opacity-75">
                  ✕
                </button>
              </div>

              <form onSubmit={handleInviteUser} className="space-y-4 text-xs">
                {selectedRoles.length === 1 && selectedRoles[0] === 'EMPLOYEE' && (
                  <div className="p-3 rounded-xl bg-well border border-border space-y-2">
                    <label className="block font-semibold text-text">
                      {locale === 'ar' ? 'ربط بسجل الموظف (إلزامي لدور الموظف):' : 'Link to Employee Record (Required):'}
                    </label>
                    <select
                      id="invite-employee-select"
                      value={selectedEmployeeId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedEmployeeId(id);
                        const emp = availableEmployees.find((item) => item.id === id);
                        if (emp?.work_email) {
                          setInviteEmail(emp.work_email);
                        }
                      }}
                      className="w-full rounded-xl py-2 px-3 border outline-none bg-surface text-text border-border"
                    >
                      <option value="">{locale === 'ar' ? '-- اختر موظفاً من القائمة --' : '-- Select an employee --'}</option>
                      {availableEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.employee_code || emp.employeeCode}) {emp.work_email ? `— ${emp.work_email}` : ''}
                        </option>
                      ))}
                    </select>
                    {!selectedEmployeeId && (
                      <p className="text-[11px] text-amber-800 dark:text-amber-400 font-medium">
                        {locale === 'ar'
                          ? 'تنبيه: يتطلب دور الموظف فقط الربط بسجل موظف قائم. يمكنك أيضاً استخدام ميزة "إنشاء حسابات مجمعة للموظفين".'
                          : 'Note: An Employee-only account must be linked to an existing employee record. You can also generate logins via Bulk-Create.'}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block mb-1 font-medium text-text">
                    {locale === 'ar' ? 'عنوان البريد الإلكتروني للعمل' : 'Work Email Address'}
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.ae"
                    className="w-full rounded-xl py-2 px-3 border outline-none font-mono bg-well text-text border-border"
                  />
                </div>

                <div>
                  <label className="block mb-2 font-medium text-text">
                    {locale === 'ar' ? 'تعيين الأدوار (دور واحد أو أكثر):' : 'Assign Roles (One or More):'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {COMPANY_ROLES.map((r) => {
                      const isChecked = selectedRoles.includes(r.code);
                      return (
                        <div
                          key={r.code}
                          onClick={() => handleToggleRoleSelection(r.code)}
                          className={`p-2.5 rounded-xl border cursor-pointer select-none transition-all flex items-start gap-2 ${
                            isChecked
                              ? 'bg-primary/10 border-primary/50 text-text ring-1 ring-primary/20'
                              : 'bg-well border-border hover:border-border/80 text-text'
                          }`}
                        >
                          <input
                            type="checkbox"
                            id={`role-checkbox-${r.code}`}
                            value={r.code}
                            checked={isChecked}
                            onChange={() => handleToggleRoleSelection(r.code)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-0.5 rounded text-amber-500 focus:ring-amber-500"
                          />
                          <label htmlFor={`role-checkbox-${r.code}`} className="cursor-pointer block">
                            <span className="font-semibold block text-text">{r.nameEn}</span>
                            <span className="text-[10px] block text-text-muted">
                              {r.nameAr}
                            </span>
                            {r.seesSalary && (
                              <span className="text-[8px] text-amber-800 dark:text-amber-400 font-mono font-medium">✓ Sees Salary Figures</span>
                            )}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Select
                      label="Scope Restriction"
                      value={scopeType}
                      onChange={(e) => setScopeType(e.target.value)}
                      options={[
                        { value: 'Company', label: 'Company-Wide (All)' },
                        { value: 'CompanyVisa', label: 'Company Visa Only' },
                        { value: 'Branch', label: 'Branch Only' },
                        { value: 'Department', label: 'Department Only' },
                      ]}
                    />
                  </div>

                  <div>
                    <Select
                      label="Scope Target"
                      value={scopeTarget}
                      onChange={(e) => setScopeTarget(e.target.value)}
                      disabled={scopeType === 'Company'}
                      options={scopeTargetOptions}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-2 rounded-xl border"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl font-bold shadow-md"
                    style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
                  >
                    Send Invitation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Credentials / One-Time Password Modal */}
        {createdInviteDetails && (
          <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl p-6 border border-border bg-surface-raised dark:bg-surface shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="font-bold text-base text-text flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>{locale === 'ar' ? 'تم إنشاء دعوة المستخدم بنجاح' : 'User Account & Invitation Created'}</span>
                </h3>
                <button
                  data-testid="close-invite-credentials-modal"
                  onClick={() => setCreatedInviteDetails(null)}
                  className="hover:opacity-75"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {createdInviteDetails?.emailDeliveryFailed && (
                  <div className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      {locale === 'ar'
                        ? 'تعذر تسليم البريد الإلكتروني تلقائياً. يرجى نسخ ومشاركة رابط التفعيل أو كلمة المرور مع المستخدم مباشرة:'
                        : 'Automated email delivery failed or was simulated. Please copy and share the one-time activation link or temporary password directly with the user:'}
                    </span>
                  </div>
                )}

                <p className="text-text-muted">
                  {locale === 'ar'
                    ? `تم تجهيز بيانات الدخول للمستخدم ${createdInviteDetails.email}. شارك كلمة المرور المؤقتة أو رابط الدعوة مع المستخدم:`
                    : `Credentials provisioned for ${createdInviteDetails.email}. Share the temporary password or invite link below:`}
                </p>

                {createdInviteDetails.tempPassword && (
                  <div className="p-3 rounded-xl border border-border/60 bg-well space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-text-muted">{locale === 'ar' ? 'كلمة المرور المؤقتة:' : 'One-Time Temporary Password:'}</span>
                      <button
                        type="button"
                        data-testid="copy-temp-password"
                        onClick={() => {
                          navigator.clipboard?.writeText(createdInviteDetails.tempPassword);
                          setCopiedField('password');
                          setTimeout(() => setCopiedField(null), 2000);
                        }}
                        className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedField === 'password' ? (locale === 'ar' ? 'تم النسخ!' : 'Copied!') : (locale === 'ar' ? 'نسخ' : 'Copy')}</span>
                      </button>
                    </div>
                    <div
                      data-testid="display-temp-password"
                      className="font-mono text-sm tracking-wide p-2 rounded-lg bg-surface border border-border font-bold text-emerald-400 select-all"
                    >
                      {createdInviteDetails.tempPassword}
                    </div>
                  </div>
                )}

                {createdInviteDetails.inviteUrl && (
                  <div className="p-3 rounded-xl border border-border/60 bg-well space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-text-muted">{locale === 'ar' ? 'رابط تفعيل الحساب:' : 'One-Time Invite URL:'}</span>
                      <button
                        type="button"
                        data-testid="copy-invite-link"
                        onClick={() => {
                          const fullUrl = (typeof window !== 'undefined' ? window.location.origin : '') + createdInviteDetails.inviteUrl;
                          navigator.clipboard?.writeText(fullUrl);
                          setCopiedField('link');
                          setTimeout(() => setCopiedField(null), 2000);
                        }}
                        className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedField === 'link' ? (locale === 'ar' ? 'تم النسخ!' : 'Copied!') : (locale === 'ar' ? 'نسخ' : 'Copy')}</span>
                      </button>
                    </div>
                    <div className="font-mono text-[11px] p-2 rounded-lg bg-surface border border-border text-text break-all select-all">
                      {createdInviteDetails.inviteUrl}
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px]">
                  {locale === 'ar'
                    ? 'ملاحظة أمنية: سيُطلب من المستخدم تغيير كلمة المرور المؤقتة فور تسجيل الدخول الأول.'
                    : 'Security notice: The user will be required to set a permanent password upon first login (must_change_password).'}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  data-testid="done-invite-credentials-btn"
                  aria-label="Close credentials modal"
                  onClick={() => setCreatedInviteDetails(null)}
                  className="px-4 py-2 rounded-xl font-bold shadow-md"
                  style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
                >
                  {locale === 'ar' ? 'تم' : 'Done'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Create Logins Modal */}
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl p-6 border border-border bg-surface-raised dark:bg-surface shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="font-bold text-base text-text">
                  {locale === 'ar' ? 'إنشاء حسابات دخول الموظفين مجمعة' : 'Bulk-Create Employee Logins'}
                </h3>
                <button onClick={() => setIsBulkModalOpen(false)} className="hover:opacity-75">
                  ✕
                </button>
              </div>

              {loadingBulkPreview ? (
                <div className="py-8 text-center text-text-muted space-y-2">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs">{locale === 'ar' ? 'جارٍ فحص الموظفين المؤهلين...' : 'Scanning employee directory...'}</p>
                </div>
              ) : bulkPreview && bulkPreview.eligibleCount === 0 ? (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl bg-well border border-border text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                      <Users className="w-5 h-5" />
                    </div>
                    <p className="font-bold text-text text-sm">
                      {locale === 'ar' ? 'لا يوجد موظفون مؤهلون لإنشاء حسابات دخول' : 'No eligible employees found without a login account'}
                    </p>
                    <p className="text-text-muted">
                      {locale === 'ar'
                        ? 'جميع الموظفين النشطين لديهم حسابات دخول بالفعل أو لم يتم إدخال بريد إلكتروني للعمل.'
                        : 'All active employees already have active logins or lack a work email address.'}
                    </p>
                  </div>

                  {bulkPreview.skipped && bulkPreview.skipped.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-text-muted font-semibold">
                        <span>{locale === 'ar' ? 'الموظفون المستبعدون وأسباب الاستبعاد:' : 'Skipped Employees & Reasons:'}</span>
                        <span className="font-mono text-[11px]">({bulkPreview.skipped.length})</span>
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1 p-2 rounded-xl bg-well border border-border">
                        {bulkPreview.skipped.map((s) => (
                          <div key={s.id} className="flex items-center justify-between py-1 px-1.5 border-b border-border/40 last:border-none">
                            <span className="font-medium text-text">{s.name} <span className="text-text-muted font-mono text-[10px]">({s.employeeCode})</span></span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface border border-border text-text-muted font-medium">
                              {s.reason === 'no email'
                                ? (locale === 'ar' ? 'بدون بريد إلكتروني' : 'No email')
                                : s.reason === 'already has login'
                                ? (locale === 'ar' ? 'لديه حساب' : 'Already has login')
                                : (locale === 'ar' ? 'غير نشط' : 'Inactive')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsBulkModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-border text-text font-medium"
                    >
                      {locale === 'ar' ? 'إغلاق' : 'Close'}
                    </button>
                    <a
                      href="/employees/new"
                      id="btn-add-employee-from-bulk"
                      className="px-4 py-2 rounded-xl font-bold bg-primary text-[var(--on-primary)] flex items-center gap-1.5 shadow-md hover:opacity-90"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{locale === 'ar' ? 'إضافة موظف جديد' : 'Add Employee'}</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <p className="text-text-muted">
                    {locale === 'ar'
                      ? 'يقوم هذا الإجراء بإنشاء حسابات دخول وتعيين دور الموظف الذاتي للموظفين المؤهلين:'
                      : 'This action will generate login accounts and assign the Employee (Self-Service) role:'}
                  </p>

                  {bulkPreview && (
                    <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-medium">
                        ✓ {locale === 'ar'
                          ? `تم العثور على ${bulkPreview.eligibleCount} موظف مؤهل بدون حساب دخول.`
                          : `Found ${bulkPreview.eligibleCount} eligible employee(s) without a login.`}
                      </div>

                      {bulkPreview.eligible && bulkPreview.eligible.length > 0 && (
                        <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded-xl bg-well border border-border">
                          {bulkPreview.eligible.map((emp) => (
                            <div key={emp.id} className="flex items-center justify-between py-1 px-1.5 border-b border-border/40 last:border-none">
                              <div>
                                <span className="font-semibold text-text">{emp.name}</span>
                                <span className="text-text-muted font-mono text-[10px] ml-1.5">({emp.employeeCode})</span>
                              </div>
                              <span className="font-mono text-[11px] text-text-muted">{emp.email}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {bulkPreview.skipped && bulkPreview.skipped.length > 0 && (
                        <div className="text-[11px] text-text-muted pt-1">
                          <span>{locale === 'ar' ? `سيتم استبعاد ${bulkPreview.skipped.length} موظف:` : `Skipping ${bulkPreview.skipped.length} employee(s):`} </span>
                          <span className="italic">
                            {bulkPreview.skipped.filter((s) => s.reason === 'already has login').length} already have logins, {bulkPreview.skipped.filter((s) => s.reason === 'no email').length} have no email
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsBulkModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-border text-text font-medium"
                    >
                      {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkCreateLogins}
                      className="px-4 py-2 rounded-xl font-bold shadow-md bg-primary text-[var(--on-primary)] hover:opacity-90"
                    >
                      {locale === 'ar' ? 'إنشاء الحسابات' : 'Generate Logins'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bulk Create Result / Credentials Modal */}
        {bulkResult && (
          <div
            data-testid="bulk-credentials-modal"
            className="fixed inset-0 z-50 bg-black/50 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="w-full max-w-lg rounded-2xl p-6 border border-border bg-surface-raised dark:bg-surface shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="font-bold text-base text-text flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>{locale === 'ar' ? 'ملخص إنشاء حسابات الموظفين' : 'Bulk Employee Logins Created'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setBulkResult(null)}
                  className="hover:opacity-75"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {bulkResult?.emailDeliveryFailed && (
                  <div className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      {locale === 'ar'
                        ? 'تعذر تسليم البريد الإلكتروني تلقائياً. يرجى نسخ ومشاركة رابط التفعيل أو كلمة المرور مع المستخدم مباشرة:'
                        : 'Automated email delivery failed or was simulated. Please copy and share the one-time activation link or temporary password directly with the user:'}
                    </span>
                  </div>
                )}

                <p className="text-text-muted">
                  {locale === 'ar'
                    ? `تم إنشاء ${bulkResult.createdCount} حساب دخول جديد من أصل ${bulkResult.totalEligible} موظف مؤهل.`
                    : `Generated ${bulkResult.createdCount} login account(s) out of ${bulkResult.totalEligible} eligible employee(s).`}
                </p>

                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-medium">
                  {locale === 'ar'
                    ? 'تنبيه أمني: لن تظهر كلمات المرور المؤقتة مرة أخرى بعد إغلاق هذه النافذة. يرجى نسخها أو تحميل ملف CSV الآن.'
                    : 'Security notice: These one-time credentials will not be shown again once you close this window. Please copy or download the CSV now.'}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    data-testid="copy-all-bulk-btn"
                    onClick={() => handleCopyAllCredentials(bulkResult.users)}
                    className="px-3 py-1.5 rounded-lg border border-border bg-well text-text font-semibold flex items-center gap-1.5 hover:bg-surface-raised transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-primary" />
                    <span>{copiedField === 'all' ? (locale === 'ar' ? 'تم النسخ!' : 'Copied!') : (locale === 'ar' ? 'نسخ الكل' : 'Copy All')}</span>
                  </button>
                  <button
                    type="button"
                    data-testid="download-bulk-csv-btn"
                    onClick={() => handleDownloadCredentialsCSV(bulkResult.users)}
                    className="px-3 py-1.5 rounded-lg border border-primary/40 bg-primary/10 text-primary font-bold flex items-center gap-1.5 hover:bg-primary/20 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{locale === 'ar' ? 'تحميل ملف CSV' : 'Download CSV'}</span>
                  </button>
                </div>

                {Array.isArray(bulkResult.users) && bulkResult.users.length > 0 && (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {bulkResult.users.map((cu) => (
                      <div
                        key={cu.userId}
                        data-testid="bulk-created-user-row"
                        data-email={cu.email}
                        className="p-3 rounded-xl border border-border/60 bg-well flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-semibold text-text">{cu.email}</div>
                          <div className="text-[11px] font-mono text-text-muted">{cu.employeeCode}</div>
                        </div>
                        <div className="text-end">
                          <span
                            data-testid="bulk-temp-password"
                            data-email={cu.email}
                            className="font-mono font-bold text-emerald-400 select-all"
                          >
                            {cu.tempPassword}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    data-testid="done-bulk-credentials-btn"
                    onClick={() => setBulkResult(null)}
                    className="px-4 py-2 rounded-xl font-bold shadow-md bg-primary text-[var(--on-primary)] hover:opacity-90"
                  >
                    {locale === 'ar' ? 'تم' : 'Done'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}

export default UsersAndRolesFeature;
