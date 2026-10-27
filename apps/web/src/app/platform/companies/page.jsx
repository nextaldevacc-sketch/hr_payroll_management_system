'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '../../../components/layout/AppShell';
import { useAuth, DEMO_USERS } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import {
  Building2,
  Plus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Key,
  Users,
  Search,
  ExternalLink,
  ChevronRight,
  Eye,
  EyeOff,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function PlatformCompaniesPage() {
  const { user, switchDemoUser } = useAuth();
  const { locale, isRTL } = useLanguage();

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  // Create form state
  const [newCompany, setNewCompany] = useState({
    name: 'Al-Bahar Trading Group LLC',
    name_ar: 'مجموعة البحر التجارية ذ.م.م',
    trade_license_no: 'TL-DXB-55419',
    emirate: 'Dubai',
    mol_establishment_id: 'MOHRE-784-9011',
    bank_routing_code: 'FAB001',
    admin_email: 'admin@albahar.ae',
    admin_name: 'Khalid Al-Bahar',
  });

  // Support grant state
  const [supportGrantReason, setSupportGrantReason] = useState('Customer reported biometric import discrepancy');
  const [supportHours, setSupportHours] = useState(2);
  const [hasActiveSupportGrant, setHasActiveSupportGrant] = useState(false);
  const [grantDetails, setGrantDetails] = useState(null);

  // Status message
  const [alertMessage, setAlertMessage] = useState(null);

  // Mock initial companies for instant preview, matching backend
  useEffect(() => {
    const defaultCompanies = [
      {
        id: 'c1111111-1111-1111-1111-111111111111',
        name: 'Gulf Tech Logistics LLC',
        name_ar: 'شركة الخليج للتقنية اللوجستية ذ.م.م',
        trade_license_no: 'TL-DXB-98421',
        status: 'Active',
        emirate: 'Dubai',
        default_cutoff_day: 25,
        employee_count: 42,
        user_count: 12,
        pay_run_count: 1,
        admin_email: 'admin@gulftech.ae',
        created_at: '2026-10-01T08:00:00Z',
      },
      {
        id: 'c2222222-2222-2222-2222-222222222222',
        name: 'Emirates Horizon Trading LLC',
        name_ar: 'شركة هورايزون الإمارات للتجارة ذ.م.م',
        trade_license_no: 'TL-AUH-33821',
        status: 'Active',
        emirate: 'Abu Dhabi',
        default_cutoff_day: 28,
        employee_count: 10,
        user_count: 3,
        pay_run_count: 0,
        admin_email: 'admin@horizon.ae',
        created_at: '2026-10-15T10:30:00Z',
      },
    ];

    setCompanies(defaultCompanies);
    setSelectedCompany(defaultCompanies[0]);
  }, []);

  const handleToggleStatus = (companyId) => {
    setCompanies((prev) =>
      prev.map((c) => {
        if (c.id === companyId) {
          const nextStatus = c.status === 'Active' ? 'Suspended' : 'Active';
          setAlertMessage({
            type: nextStatus === 'Suspended' ? 'warning' : 'success',
            text:
              locale === 'ar'
                ? `تم تغيير حالة الشركة إلى "${nextStatus}". ${nextStatus === 'Suspended' ? 'لن يتمكن مستخدمو الشركة من تسجيل الدخول (FR-PL2)' : 'تمت إعادة التفعيل'}`
                : `Company status changed to "${nextStatus}". ${nextStatus === 'Suspended' ? 'Users of this company can no longer log in (FR-PL2).' : 'Access restored.'}`,
          });
          return { ...c, status: nextStatus };
        }
        return c;
      })
    );
  };

  const handleCreateCompany = (e) => {
    e.preventDefault();
    const created = {
      id: `c-new-${Date.now()}`,
      name: newCompany.name,
      name_ar: newCompany.name_ar,
      trade_license_no: newCompany.trade_license_no,
      status: 'Active',
      emirate: newCompany.emirate,
      default_cutoff_day: 25,
      employee_count: 0,
      user_count: 1,
      pay_run_count: 0,
      admin_email: newCompany.admin_email,
      created_at: new Date().toISOString(),
    };

    setCompanies([created, ...companies]);
    setSelectedCompany(created);
    setIsCreateModalOpen(false);
    setAlertMessage({
      type: 'success',
      text:
        locale === 'ar'
          ? `تم إنشاء الشركة "${created.name}" وتطبيق إعدادات الإمارات الافتراضية ودعوة المدير "${newCompany.admin_email}" بنجاح (FR-PL1)`
          : `Company "${created.name}" created with UAE defaults and admin "${newCompany.admin_email}" invited (FR-PL1).`,
    });
  };

  const handleGrantSupport = (e) => {
    e.preventDefault();
    setHasActiveSupportGrant(true);
    setGrantDetails({
      reason: supportGrantReason,
      hours: supportHours,
      expiresAt: new Date(Date.now() + supportHours * 3600000).toLocaleTimeString(),
    });
    setIsSupportModalOpen(false);
    setAlertMessage({
      type: 'success',
      text:
        locale === 'ar'
          ? `تم منح وصول الدعم الفني المؤقت لمدة ${supportHours} ساعة. تم رفع الحظر ويمكن الاطلاع على بيانات الموظفين والرواتب (FR-PL3)`
          : `Temporary support access granted for ${supportHours} hours. Tenant isolation lifted for authorized debugging (FR-PL3).`,
    });
  };

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.trade_license_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.admin_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppShell>
      <div className="p-4 md:p-8 space-y-6">
        {/* Banner Alert if any */}
        {alertMessage && (
          <div
            className={`p-4 rounded-xl flex items-start justify-between gap-3 text-xs font-medium border animate-in fade-in`}
            style={{
              background:
                alertMessage.type === 'warning'
                  ? 'rgba(239, 68, 68, 0.1)'
                  : 'rgba(16, 185, 129, 0.1)',
              borderColor:
                alertMessage.type === 'warning'
                  ? 'rgba(239, 68, 68, 0.3)'
                  : 'rgba(16, 185, 129, 0.3)',
              color: alertMessage.type === 'warning' ? '#ef4444' : '#10b981',
            }}
          >
            <div className="flex items-center gap-2">
              {alertMessage.type === 'warning' ? (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{alertMessage.text}</span>
            </div>
            <button onClick={() => setAlertMessage(null)} className="hover:opacity-75">
              ✕
            </button>
          </div>
        )}

        {/* Header Section */}
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
                Nextal Platform Admin · FR-PL1–3
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight gold-heading">
              {locale === 'ar' ? 'إدارة الشركات المستضافة والوصول' : 'Companies & Platform Tenancy'}
            </h1>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              {locale === 'ar'
                ? 'إنشاء الشركات الجديدة بالإعدادات الإماراتية، تعليق وإلغاء تعليق الوصول، وإدارة تصاريح الدعم الفني المقيدة زمنياً'
                : 'Create client companies with UAE defaults, manage active/suspended states, and request time-limited support access grants'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick switcher to Platform Admin if not already */}
            {!user?.is_platform_admin && (
              <button
                onClick={() => switchDemoUser('PLATFORM_ADMIN')}
                className="px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all hover:scale-95"
                style={{
                  background: 'var(--bg-surface)',
                  borderColor: 'var(--primary)',
                  color: 'var(--primary-strong)',
                }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{locale === 'ar' ? 'التبديل إلى مدير المنصة' : 'Switch to Platform Admin'}</span>
              </button>
            )}

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95"
              style={{
                background: 'var(--primary)',
                color: 'var(--on-primary)',
              }}
            >
              <Plus className="w-4 h-4" />
              <span>{locale === 'ar' ? 'إنشاء شركة جديدة (FR-PL1)' : 'Create Company (FR-PL1)'}</span>
            </button>
          </div>
        </div>

        {/* Support Access Isolation Bar (FR-PL3) */}
        <div
          className="p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4"
          style={{
            background: hasActiveSupportGrant
              ? 'rgba(16, 185, 129, 0.08)'
              : 'rgba(234, 179, 8, 0.08)',
            borderColor: hasActiveSupportGrant ? 'rgba(16, 185, 129, 0.3)' : 'rgba(234, 179, 8, 0.3)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: hasActiveSupportGrant ? '#10b981' : '#eab308',
                color: '#000',
              }}
            >
              {hasActiveSupportGrant ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs">
                  {hasActiveSupportGrant
                    ? locale === 'ar'
                      ? 'تصريح الدعم الفني نشط (FR-PL3 مُفعل)'
                      : 'Active Support Access Grant (FR-PL3)'
                    : locale === 'ar'
                    ? 'عزل بيانات الشركات مفروض صارماً (FR-PL3)'
                    : 'Tenant Data Isolation Enforced (FR-PL3)'}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    hasActiveSupportGrant ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}
                >
                  {hasActiveSupportGrant ? 'UNLOCKED (TEMPORARY)' : 'EMPLOYEE & SALARY HIDDEN'}
                </span>
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {hasActiveSupportGrant
                  ? `Grant reason: "${grantDetails?.reason}". Expires at ${grantDetails?.expiresAt}. Full audit logged.`
                  : locale === 'ar'
                  ? 'لا يمكن لمدير المنصة الاطلاع على سجلات الموظفين أو رواتب الشركات إلا بتصريح دعم فني مؤقت ومحدد بوقت'
                  : 'Platform admins can see NO employee or salary figures without a time-limited customer support grant.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveSupportGrant ? (
              <button
                onClick={() => {
                  setHasActiveSupportGrant(false);
                  setGrantDetails(null);
                  setAlertMessage({
                    type: 'success',
                    text: locale === 'ar' ? 'تم إنهاء تصريح الدعم وإعادة فرض الحظر' : 'Support grant revoked. Data isolation restored.',
                  });
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:bg-neutral-800"
                style={{
                  background: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                {locale === 'ar' ? 'إلغاء التصريح الآن' : 'Revoke Grant'}
              </button>
            ) : (
              <button
                onClick={() => setIsSupportModalOpen(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:bg-amber-500/10"
                style={{
                  background: 'var(--bg-surface)',
                  borderColor: 'var(--primary)',
                  color: 'var(--primary-strong)',
                }}
              >
                <Key className="w-3.5 h-3.5 inline mr-1" />
                <span>{locale === 'ar' ? 'طلب تصريح دعم فني (2 ساعة)' : 'Request Support Grant (2h)'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Layout: Companies Grid + Selected Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Companies List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search filter */}
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
                    ? 'بحث بالاسم، الرخصة التجارية أو البريد...'
                    : 'Search company by name, trade license or admin email...'
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

            {/* Table */}
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
                      <th className="py-3 px-4 text-start">{locale === 'ar' ? 'الشركة' : 'Company'}</th>
                      <th className="py-3 px-4 text-start">{locale === 'ar' ? 'الرخصة' : 'Trade License'}</th>
                      <th className="py-3 px-4 text-start">{locale === 'ar' ? 'الإمارة' : 'Emirate'}</th>
                      <th className="py-3 px-4 text-center">{locale === 'ar' ? 'الموظفون' : 'Headcount'}</th>
                      <th className="py-3 px-4 text-center">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                      <th className="py-3 px-4 text-end">{locale === 'ar' ? 'الإجراءات (FR-PL2)' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {filteredCompanies.map((comp) => {
                      const isSelected = selectedCompany?.id === comp.id;
                      const isSuspended = comp.status === 'Suspended';

                      return (
                        <tr
                          key={comp.id}
                          onClick={() => setSelectedCompany(comp)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-amber-500/5' : 'hover:bg-neutral-800/40'
                          }`}
                        >
                          <td className="py-3.5 px-4 font-semibold">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
                                style={{
                                  background: 'var(--bg-well)',
                                  border: '1px solid var(--border-subtle)',
                                  color: 'var(--primary)',
                                }}
                              >
                                {comp.name.charAt(0)}
                              </div>
                              <div>
                                <span className="block">{comp.name}</span>
                                <span className="text-[10px] block" style={{ color: 'var(--text-tertiary)' }}>
                                  {comp.name_ar}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                            {comp.trade_license_no}
                          </td>

                          <td className="py-3.5 px-4" style={{ color: 'var(--text-secondary)' }}>
                            {comp.emirate}
                          </td>

                          <td className="py-3.5 px-4 text-center font-semibold">{comp.employee_count}</td>

                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isSuspended
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              }`}
                            >
                              {comp.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-end">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleStatus(comp.id);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                                isSuspended
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                              }`}
                            >
                              {isSuspended ? (
                                <>
                                  <Unlock className="w-3 h-3 inline mr-1" />
                                  <span>{locale === 'ar' ? 'إعادة التفعيل' : 'Reactivate'}</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3 h-3 inline mr-1" />
                                  <span>{locale === 'ar' ? 'تعليق الشركة' : 'Suspend'}</span>
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

          {/* Company Details Panel */}
          {selectedCompany && (
            <div
              className="rounded-2xl border p-5 space-y-5"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--glass-border)',
              }}
            >
              <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                <div>
                  <h3 className="font-bold text-sm">{selectedCompany.name}</h3>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                    {selectedCompany.trade_license_no}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedCompany.status === 'Active'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {selectedCompany.status}
                </span>
              </div>

              {/* Company Admin Info */}
              <div
                className="p-3.5 rounded-xl border text-xs space-y-1.5"
                style={{
                  background: 'var(--bg-well)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <span className="font-bold block" style={{ color: 'var(--primary)' }}>
                  {locale === 'ar' ? 'مسؤول النظام للشركة (Company Admin)' : 'Company Administrator'}
                </span>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--text-tertiary)' }}>Email:</span>
                  <span className="font-mono">{selectedCompany.admin_email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--text-tertiary)' }}>Cutoff Day:</span>
                  <span>{selectedCompany.default_cutoff_day}th of month</span>
                </div>
              </div>

              {/* Employee & Salary Data (FR-PL3 Demo View) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{locale === 'ar' ? 'سجلات الموظفين والرواتب' : 'Tenant Payroll Data'}</span>
                  {hasActiveSupportGrant ? (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                      <Eye className="w-3 h-3" />
                      <span>Support Grant Active</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-500 flex items-center gap-1 font-semibold">
                      <EyeOff className="w-3 h-3" />
                      <span>Access Restricted</span>
                    </span>
                  )}
                </div>

                {hasActiveSupportGrant ? (
                  <div
                    className="p-3 rounded-xl border space-y-2 text-xs"
                    style={{
                      background: 'rgba(16, 185, 129, 0.05)',
                      borderColor: 'rgba(16, 185, 129, 0.2)',
                    }}
                  >
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Total Employees:</span>
                      <span className="font-bold">{selectedCompany.employee_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>October Net Payroll:</span>
                      <span className="font-bold font-mono text-emerald-400">335,490.50 AED</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>WPS Routing:</span>
                      <span className="font-mono">ENBD001 (MOHRE)</span>
                    </div>
                  </div>
                ) : (
                  <div
                    className="p-4 rounded-xl border text-center space-y-2"
                    style={{
                      background: 'var(--bg-well)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <Lock className="w-6 h-6 mx-auto text-amber-500 opacity-80" />
                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                      {locale === 'ar'
                        ? 'ممنوع الوصول: يمنع معيار FR-PL3 مدير المنصة من رؤية أرقام الرواتب أو بيانات الموظفين بدون تفويض رسمي من العميل.'
                        : 'Access Blocked: Spec FR-PL3 forbids platform admins from reading employee or salary records without an active support grant.'}
                    </p>
                    <button
                      onClick={() => setIsSupportModalOpen(true)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-400 hover:underline"
                    >
                      {locale === 'ar' ? 'طلب تفويض دعم فني' : 'Request Support Grant'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Create Company Modal (FR-PL1) */}
        {isCreateModalOpen && (
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
                  {locale === 'ar' ? 'إنشاء شركة جديدة مع الإعدادات الإماراتية' : 'Create Company with UAE Defaults (FR-PL1)'}
                </h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="hover:opacity-75">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateCompany} className="space-y-3.5 text-xs">
                <div>
                  <label className="block mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Company Name (English)
                  </label>
                  <input
                    type="text"
                    required
                    value={newCompany.name}
                    onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                    className="w-full rounded-xl py-2 px-3 border outline-none font-medium"
                    style={{ background: 'var(--bg-well)', borderColor: 'var(--border-subtle)' }}
                  />
                </div>

                <div>
                  <label className="block mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Company Name (Arabic)
                  </label>
                  <input
                    type="text"
                    required
                    value={newCompany.name_ar}
                    onChange={(e) => setNewCompany({ ...newCompany, name_ar: e.target.value })}
                    className="w-full rounded-xl py-2 px-3 border outline-none font-medium"
                    style={{ background: 'var(--bg-well)', borderColor: 'var(--border-subtle)' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Trade License No
                    </label>
                    <input
                      type="text"
                      required
                      value={newCompany.trade_license_no}
                      onChange={(e) => setNewCompany({ ...newCompany, trade_license_no: e.target.value })}
                      className="w-full rounded-xl py-2 px-3 border outline-none font-mono"
                      style={{ background: 'var(--bg-well)', borderColor: 'var(--border-subtle)' }}
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Emirate
                    </label>
                    <select
                      value={newCompany.emirate}
                      onChange={(e) => setNewCompany({ ...newCompany, emirate: e.target.value })}
                      className="w-full rounded-xl py-2 px-3 border outline-none"
                      style={{ background: 'var(--bg-well)', borderColor: 'var(--border-subtle)' }}
                    >
                      <option value="Dubai">Dubai</option>
                      <option value="Abu Dhabi">Abu Dhabi</option>
                      <option value="Sharjah">Sharjah</option>
                      <option value="Ajman">Ajman</option>
                      <option value="Ras Al Khaimah">Ras Al Khaimah</option>
                      <option value="Fujairah">Fujairah</option>
                      <option value="Umm Al Quwain">Umm Al Quwain</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
                      MOHRE Est. ID
                    </label>
                    <input
                      type="text"
                      required
                      value={newCompany.mol_establishment_id}
                      onChange={(e) => setNewCompany({ ...newCompany, mol_establishment_id: e.target.value })}
                      className="w-full rounded-xl py-2 px-3 border outline-none font-mono"
                      style={{ background: 'var(--bg-well)', borderColor: 'var(--border-subtle)' }}
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Bank Routing Code
                    </label>
                    <input
                      type="text"
                      required
                      value={newCompany.bank_routing_code}
                      onChange={(e) => setNewCompany({ ...newCompany, bank_routing_code: e.target.value })}
                      className="w-full rounded-xl py-2 px-3 border outline-none font-mono"
                      style={{ background: 'var(--bg-well)', borderColor: 'var(--border-subtle)' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Initial Company Admin Work Email
                  </label>
                  <input
                    type="email"
                    required
                    value={newCompany.admin_email}
                    onChange={(e) => setNewCompany({ ...newCompany, admin_email: e.target.value })}
                    className="w-full rounded-xl py-2 px-3 border outline-none font-mono"
                    style={{ background: 'var(--bg-well)', borderColor: 'var(--border-subtle)' }}
                  />
                </div>

                <div
                  className="p-2.5 rounded-xl border text-[11px]"
                  style={{
                    background: 'var(--bg-well)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  ✓ Automatically seeds: 17 Section 8.1 salary rules, UAE statutory leave rules, standard 8-5 shift, and primary MOHRE establishment visa.
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
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
                    Create Company & Send Invite
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Request Support Access Grant Modal (FR-PL3) */}
        {isSupportModalOpen && (
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
                  {locale === 'ar' ? 'طلب تصريح دعم فني مؤقت (FR-PL3)' : 'Request Support Grant (FR-PL3)'}
                </h3>
                <button onClick={() => setIsSupportModalOpen(false)} className="hover:opacity-75">
                  ✕
                </button>
              </div>

              <form onSubmit={handleGrantSupport} className="space-y-3.5 text-xs">
                <div>
                  <label className="block mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Target Company
                  </label>
                  <input
                    type="text"
                    disabled
                    value={selectedCompany?.name}
                    className="w-full rounded-xl py-2 px-3 border opacity-75 font-semibold"
                    style={{ background: 'var(--bg-well)', borderColor: 'var(--border-subtle)' }}
                  />
                </div>

                <div>
                  <label className="block mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Reason for Tenant Data Access
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={supportGrantReason}
                    onChange={(e) => setSupportGrantReason(e.target.value)}
                    className="w-full rounded-xl py-2 px-3 border outline-none"
                    style={{ background: 'var(--bg-well)', borderColor: 'var(--border-subtle)' }}
                  />
                </div>

                <div>
                  <label className="block mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Access Duration (Hours)
                  </label>
                  <select
                    value={supportHours}
                    onChange={(e) => setSupportHours(Number(e.target.value))}
                    className="w-full rounded-xl py-2 px-3 border outline-none"
                    style={{ background: 'var(--bg-well)', borderColor: 'var(--border-subtle)' }}
                  >
                    <option value={1}>1 hour</option>
                    <option value={2}>2 hours (Standard)</option>
                    <option value={4}>4 hours</option>
                    <option value={8}>8 hours (Max for single shift)</option>
                  </select>
                </div>

                <div
                  className="p-2.5 rounded-xl border text-[10px]"
                  style={{
                    background: 'var(--bg-well)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  Notice: Every query and action performed under this grant is immutably logged into the audit history ledger.
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSupportModalOpen(false)}
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
                    Activate Grant
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
