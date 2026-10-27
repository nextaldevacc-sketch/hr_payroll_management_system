'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '../../../components/layout/AppShell';
import { useAuth, DEMO_USERS } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import {
  Users,
  UserPlus,
  Shield,
  CheckCircle2,
  AlertCircle,
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

export default function UsersAndRolesPage() {
  const { user } = useAuth();
  const { locale, isRTL } = useLanguage();

  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);

  // Invite Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedRoles, setSelectedRoles] = useState(['EMPLOYEE']);
  const [scopeType, setScopeType] = useState('Company'); // 'Company' | 'CompanyVisa' | 'Branch' | 'Department'
  const [scopeTarget, setScopeTarget] = useState('All');

  // Bulk creation summary
  const [bulkResult, setBulkResult] = useState(null);

  // Seeded users representation matching backend seed
  useEffect(() => {
    const initialUsers = [
      {
        id: 'u-admin',
        email: 'admin@gulftech.ae',
        name: 'Tariq Al-Hashemi',
        status: 'Active',
        failed_logins: 0,
        is_locked: false,
        last_login_at: '2026-10-27T10:45:00Z',
        roles: [{ code: 'COMPANY_ADMIN', name: 'Company Administrator', scope_type: 'Company', sees_salary: true }],
      },
      {
        id: 'u-hr-mgr',
        email: 'hr.mgr@gulftech.ae',
        name: 'Maryam Al-Nuaimi',
        status: 'Active',
        failed_logins: 0,
        is_locked: false,
        last_login_at: '2026-10-27T09:12:00Z',
        roles: [{ code: 'HR_MANAGER', name: 'HR Manager', scope_type: 'Company', sees_salary: true }],
      },
      {
        id: 'u-hr-off',
        email: 'hr.officer@gulftech.ae',
        name: 'Saeed Al-Ketbi',
        status: 'Active',
        failed_logins: 0,
        is_locked: false,
        last_login_at: '2026-10-26T14:30:00Z',
        roles: [{ code: 'HR_OFFICER', name: 'HR Officer', scope_type: 'Company', sees_salary: false }],
      },
      {
        id: 'u-payroll',
        email: 'payroll@gulftech.ae',
        name: 'Zaid Al-Marzooqi',
        status: 'Active',
        failed_logins: 0,
        is_locked: false,
        last_login_at: '2026-10-27T11:05:00Z',
        roles: [{ code: 'PAYROLL_OFFICER', name: 'Payroll Officer', scope_type: 'Company', sees_salary: true }],
      },
      {
        id: 'u-dept-mgr',
        email: 'dept.mgr@gulftech.ae',
        name: 'Fatima Al-Zaabi',
        status: 'Active',
        failed_logins: 0,
        is_locked: false,
        last_login_at: '2026-10-25T08:00:00Z',
        roles: [{ code: 'DEPT_MANAGER', name: 'Department Manager', scope_type: 'Department', scope_name: 'Engineering', sees_salary: false }],
      },
      {
        id: 'u-gm',
        email: 'gm@gulftech.ae',
        name: 'Rashid Al-Falasi',
        status: 'Active',
        failed_logins: 0,
        is_locked: false,
        last_login_at: '2026-10-26T16:20:00Z',
        roles: [{ code: 'GM', name: 'General Manager', scope_type: 'Company', sees_salary: true }],
      },
      {
        id: 'u-fin',
        email: 'finance@gulftech.ae',
        name: 'Hassan Al-Balooshi',
        status: 'Active',
        failed_logins: 0,
        is_locked: false,
        last_login_at: '2026-10-27T07:45:00Z',
        roles: [{ code: 'FINANCE', name: 'Finance / Accounts', scope_type: 'Company', sees_salary: true }],
      },
      {
        id: 'u-emp1',
        email: 'employee@gulftech.ae',
        name: 'Ahmed Al-Mansoori',
        status: 'Active',
        failed_logins: 0,
        is_locked: false,
        last_login_at: '2026-10-26T12:00:00Z',
        roles: [{ code: 'EMPLOYEE', name: 'Employee', scope_type: 'Company', sees_salary: false }],
      },
    ];

    setUsers(initialUsers);
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

  const handleInviteUser = (e) => {
    e.preventDefault();
    if (!inviteEmail) return;

    const assignedRoleObjs = selectedRoles.map((code) => {
      const match = COMPANY_ROLES.find((r) => r.code === code);
      return {
        code,
        name: match?.nameEn || code,
        scope_type: scopeType,
        scope_name: scopeType !== 'Company' ? scopeTarget : null,
        sees_salary: Boolean(match?.seesSalary),
      };
    });

    const newUser = {
      id: `u-${Date.now()}`,
      email: inviteEmail,
      name: inviteEmail.split('@')[0],
      status: 'Invited',
      failed_logins: 0,
      is_locked: false,
      last_login_at: null,
      roles: assignedRoleObjs,
    };

    setUsers([newUser, ...users]);
    setIsInviteModalOpen(false);
    setInviteEmail('');
    setSelectedRoles(['EMPLOYEE']);
    setAlertMessage({
      type: 'success',
      text:
        locale === 'ar'
          ? `تم إرسال دعوة الانضمام إلى ${inviteEmail} مع الأدوار المحددة ونطاق الصلاحية (${scopeType}).`
          : `Invitation sent to ${inviteEmail} with assigned roles and scope (${scopeType}).`,
    });
  };

  const handleBulkCreateLogins = () => {
    const unlinkedCount = 35; // Remaining employees from the 42
    setBulkResult({
      totalEligible: unlinkedCount,
      createdCount: unlinkedCount,
      defaultRole: 'EMPLOYEE',
      sampleEmail: 'emp_12@gulftech.ae',
    });
    setAlertMessage({
      type: 'success',
      text:
        locale === 'ar'
          ? `تم إنشاء ${unlinkedCount} حساب دخول جديد للموظفين غير المسجلين بنجاح.`
          : `Bulk employee account creation complete: ${unlinkedCount} logins generated.`,
    });
    setIsBulkModalOpen(false);
  };

  const handleToggleUserStatus = (userId) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const nextStatus = u.status === 'Active' ? 'Disabled' : 'Active';
          return {
            ...u,
            status: nextStatus,
            is_locked: false,
            failed_logins: nextStatus === 'Active' ? 0 : u.failed_logins,
          };
        }
        return u;
      })
    );
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole =
      roleFilter === 'ALL' || u.roles.some((r) => r.code === roleFilter);

    return matchesSearch && matchesRole;
  });

  return (
    <AppShell>
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
                Company Administration · Section 5.1–5.4
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight gold-heading">
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
              onClick={() => setIsBulkModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all hover:bg-neutral-800"
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
              onClick={() => setIsInviteModalOpen(true)}
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
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
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
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
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
              className={`absolute top-3 w-4 h-4 text-neutral-400 ${isRTL ? 'right-3' : 'left-3'}`}
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
                    <th className="py-3 px-4 text-start">{locale === 'ar' ? 'الأدوار المعينة (Section 5.2)' : 'Assigned Roles'}</th>
                    <th className="py-3 px-4 text-start">{locale === 'ar' ? 'نطاق الصلاحية (Scope)' : 'Scope'}</th>
                    <th className="py-3 px-4 text-center">{locale === 'ar' ? 'رؤية الرواتب' : 'Salary Access'}</th>
                    <th className="py-3 px-4 text-center">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="py-3 px-4 text-end">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {filteredUsers.map((u) => {
                    const isDisabled = u.status === 'Disabled';
                    const hasSalaryAccess = u.roles.some((r) => r.sees_salary);

                    return (
                      <tr key={u.id} className="hover:bg-neutral-800/40 transition-colors">
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
                              <span className="font-semibold block">{u.name}</span>
                              <span className="text-[10px] font-mono block" style={{ color: 'var(--text-tertiary)' }}>
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
                                {r.name || r.code}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-3.5 px-4" style={{ color: 'var(--text-secondary)' }}>
                          <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                            <Layers className="w-3 h-3 text-neutral-400" />
                            <span>
                              {u.roles[0]?.scope_type || 'Company'}
                              {u.roles[0]?.scope_name ? ` (${u.roles[0].scope_name})` : ''}
                            </span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {hasSalaryAccess ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              Visible (WPS)
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-800 text-neutral-400">
                              Hidden (Protected)
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
                            {u.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-end">
                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(u.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                              isDisabled
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
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div
              className="w-full max-w-lg rounded-2xl p-6 border shadow-2xl space-y-4"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--glass-border)',
              }}
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <h3 className="font-bold text-base gold-heading">
                  {locale === 'ar' ? 'دعوة مستخدم وتعيين الأدوار ونطاق الصلاحية' : 'Invite User & Assign Roles / Scope'}
                </h3>
                <button onClick={() => setIsInviteModalOpen(false)} className="hover:opacity-75">
                  ✕
                </button>
              </div>

              <form onSubmit={handleInviteUser} className="space-y-4 text-xs">
                <div>
                  <label className="block mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Work Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@gulftech.ae"
                    className="w-full rounded-xl py-2 px-3 border outline-none font-mono"
                    style={{ background: 'var(--bg-well)', borderColor: 'var(--border-subtle)' }}
                  />
                </div>

                <div>
                  <label className="block mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Assign Roles (One or More):
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {COMPANY_ROLES.map((r) => {
                      const isChecked = selectedRoles.includes(r.code);
                      return (
                        <div
                          key={r.code}
                          onClick={() => handleToggleRoleSelection(r.code)}
                          className={`p-2.5 rounded-xl border cursor-pointer select-none transition-all flex items-start gap-2 ${
                            isChecked ? 'bg-amber-500/10 border-amber-500/50' : 'bg-neutral-900 border-neutral-800'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="mt-0.5 rounded text-amber-500 focus:ring-amber-500"
                          />
                          <div>
                            <span className="font-semibold block">{r.nameEn}</span>
                            <span className="text-[10px] block" style={{ color: 'var(--text-tertiary)' }}>
                              {r.nameAr}
                            </span>
                            {r.seesSalary && (
                              <span className="text-[8px] text-amber-400 font-mono">✓ Sees Salary Figures</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Scope Restriction
                    </label>
                    <select
                      value={scopeType}
                      onChange={(e) => setScopeType(e.target.value)}
                      className="w-full rounded-xl py-2 px-3 border outline-none"
                      style={{ background: 'var(--bg-well)', borderColor: 'var(--border-subtle)' }}
                    >
                      <option value="Company">Company-Wide (All)</option>
                      <option value="CompanyVisa">Company Visa Only</option>
                      <option value="Branch">Branch Only</option>
                      <option value="Department">Department Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Scope Target
                    </label>
                    <select
                      value={scopeTarget}
                      onChange={(e) => setScopeTarget(e.target.value)}
                      className="w-full rounded-xl py-2 px-3 border outline-none"
                      style={{ background: 'var(--bg-well)', borderColor: 'var(--border-subtle)' }}
                    >
                      <option value="All">All Entities</option>
                      <option value="Engineering">Engineering Department</option>
                      <option value="Operations">Operations Department</option>
                      <option value="Logistics">Logistics & Fleet</option>
                      <option value="HR & Admin">HR & Admin</option>
                      <option value="Dubai HQ">Dubai Headquarters Branch</option>
                      <option value="DIFC">DIFC FinTech Hub</option>
                    </select>
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

        {/* Bulk Create Logins Modal */}
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div
              className="w-full max-w-md rounded-2xl p-6 border shadow-2xl space-y-4"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--glass-border)',
              }}
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <h3 className="font-bold text-base gold-heading">
                  {locale === 'ar' ? 'إنشاء حسابات دخول الموظفين مجمعة' : 'Bulk-Create Employee Logins'}
                </h3>
                <button onClick={() => setIsBulkModalOpen(false)} className="hover:opacity-75">
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <p style={{ color: 'var(--text-secondary)' }}>
                  This action searches for all active employees in <strong>Gulf Tech Logistics LLC</strong> who do not have an active login account, generates a secure account, and assigns the <strong>Employee (Self-Service)</strong> role.
                </p>

                <div
                  className="p-3.5 rounded-xl border space-y-1.5"
                  style={{
                    background: 'var(--bg-well)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-tertiary)' }}>Eligible Employees:</span>
                    <span className="font-bold">35 unlinked</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-tertiary)' }}>Assigned Role:</span>
                    <span className="font-semibold text-amber-400">EMPLOYEE (Self-Service)</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-tertiary)' }}>Initial Status:</span>
                    <span className="text-sky-400 font-semibold">Invited</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsBulkModalOpen(false)}
                    className="px-4 py-2 rounded-xl border"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkCreateLogins}
                    className="px-4 py-2 rounded-xl font-bold shadow-md"
                    style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
                  >
                    Generate Logins
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
