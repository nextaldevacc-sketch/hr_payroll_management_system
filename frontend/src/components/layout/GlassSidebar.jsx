'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  Banknote,
  UserMinus,
  ShieldCheck,
  BarChart3,
  Settings,
  History,
  Palette,
  Sparkles,
  User,
  Wallet,
  CalendarCheck,
  Send,
  FileText,
  X,
  LogOut,
  Building2,
  ChevronUp,
  Shield,
} from 'lucide-react';
import { IconWell } from '../primitives/IconWell';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

export function GlassSidebar({ isMobileOpen = false, onCloseMobile }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale } = useLanguage();
  const { user, seesSalary, logout } = useAuth();

  // Section 5.3 Permissions Matrix Filter for Sidebar Navigation
  const isEmployeeOnly = user?.roles?.includes('EMPLOYEE') && user.roles.length === 1;
  const isEmployee = Boolean(user?.employee_id) || user?.roles?.includes('EMPLOYEE');
  const isPlatformAdmin = Boolean(user?.is_platform_admin);
  const isAr = locale === 'ar';

  // Base navigation items
  const allNavItems = [
    { href: '/', icon: LayoutDashboard, label: t('menu.dashboard'), exact: true, area: 'dashboard' },
    { href: '/employees', icon: Users, label: t('menu.employees'), area: 'employees' },
    { href: '/attendance', icon: Clock, label: t('menu.attendance'), area: 'attendance' },
    { href: '/leave', icon: CalendarDays, label: t('menu.leaveHolidays'), area: 'leave' },
    { href: '/payroll', icon: Banknote, label: t('menu.payroll'), area: 'payroll' },
    { href: '/offboarding', icon: UserMinus, label: t('menu.offboarding'), area: 'offboarding' },
    { href: '/compliance', icon: ShieldCheck, label: t('menu.compliance'), area: 'compliance' },
    { href: '/reports', icon: BarChart3, label: t('menu.reports'), area: 'reports' },
    { href: '/settings', icon: Settings, label: t('menu.settings'), area: 'settings' },
    { href: '/audit', icon: History, label: t('menu.audit'), area: 'audit' },
  ];

  // Filter items according to user roles & Section 5.3
  const navItems = allNavItems.filter((item) => {
    // Platform admin has dedicated platform navigation
    if (isPlatformAdmin) return false;

    // Pure employee role only sees Self-Service
    if (isEmployeeOnly) return false;

    // Dashboard: all enterprise roles in Section 5.3
    if (item.area === 'dashboard') return true;

    // Employees: Finance has '—' in Section 5.3
    if (item.area === 'employees') {
      return user?.roles?.some((r) =>
        ['COMPANY_ADMIN', 'HR_MANAGER', 'HR_OFFICER', 'PAYROLL_OFFICER', 'GM', 'DEPT_MANAGER'].includes(r)
      );
    }

    // Attendance: Finance has '—' in Section 5.3
    if (item.area === 'attendance') {
      return user?.roles?.some((r) =>
        ['COMPANY_ADMIN', 'HR_MANAGER', 'HR_OFFICER', 'PAYROLL_OFFICER', 'GM', 'DEPT_MANAGER'].includes(r)
      );
    }

    // Leave & holidays: Finance has '—' in Section 5.3
    if (item.area === 'leave') {
      return user?.roles?.some((r) =>
        ['COMPANY_ADMIN', 'HR_MANAGER', 'HR_OFFICER', 'PAYROLL_OFFICER', 'GM', 'DEPT_MANAGER'].includes(r)
      );
    }

    // Payroll: strictly salary roles (HR Manager, Payroll Officer, GM, Finance) per Section 5.3
    if (item.area === 'payroll') {
      return Boolean(seesSalary);
    }

    // Offboarding: Company Admin has no offboarding rights in Section 5.3
    if (item.area === 'offboarding') {
      return user?.roles?.some((r) =>
        ['HR_MANAGER', 'HR_OFFICER', 'PAYROLL_OFFICER', 'GM', 'FINANCE', 'DEPT_MANAGER'].includes(r)
      );
    }

    // Compliance: Only Company Admin, HR Manager, HR Officer, GM in Section 5.3
    if (item.area === 'compliance') {
      return user?.roles?.some((r) =>
        ['COMPANY_ADMIN', 'HR_MANAGER', 'HR_OFFICER', 'GM'].includes(r)
      );
    }

    // Reports: Section 5.3 reports roles (Company Admin, HR Manager, Payroll Officer, GM, Finance)
    if (item.area === 'reports') {
      return user?.roles?.some((r) =>
        ['COMPANY_ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER', 'GM', 'FINANCE'].includes(r)
      );
    }

    // Settings: Company Admin, HR Manager, Payroll Officer, Finance in Section 5.3
    if (item.area === 'settings') {
      return user?.roles?.some((r) =>
        ['COMPANY_ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER', 'FINANCE'].includes(r)
      );
    }

    // Audit: Company Admin, HR Manager, GM in Section 5.3
    if (item.area === 'audit') {
      return user?.roles?.some((r) =>
        ['COMPANY_ADMIN', 'HR_MANAGER', 'GM'].includes(r)
      );
    }

    return true;
  });

  const selfServiceItems = [
    { href: '/me', icon: LayoutDashboard, label: t('menu.myHome') || 'My Home', exact: true },
    { href: '/me/profile', icon: User, label: t('menu.myProfile') },
    { href: '/me/payslips', icon: Wallet, label: t('menu.myPayslips') },
    { href: '/me/attendance', icon: CalendarCheck, label: t('menu.myAttendance') },
    { href: '/me/leave', icon: CalendarDays, label: t('menu.myLeave') },
    { href: '/me/requests', icon: Send, label: t('menu.myRequests') },
    { href: '/me/documents', icon: FileText, label: t('menu.myDocuments') },
  ];

  const isDev = process.env.NODE_ENV !== 'production';

  const isItemActive = (href, exact = false) => {
    if (exact || href === '/') {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  const renderNavLink = (item) => {
    const Icon = item.icon;
    const isActive = isItemActive(item.href, item.exact);

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onCloseMobile}
        className={clsx(
          'flex items-center gap-3.5 px-3 py-2 rounded-control transition-all duration-200 group relative select-none',
          isActive
            ? 'bg-primary-wash text-primary font-bold shadow-sm'
            : 'text-text/80 hover:bg-black/5 dark:hover:bg-white/5 hover:text-text font-medium'
        )}
      >
        {isActive && (
          <span className="absolute start-0 top-1.5 bottom-1.5 w-1 rounded-full bg-primary" />
        )}

        <IconWell
          size="sm"
          shape="square"
          active={isActive}
          color={isActive ? 'primary' : 'default'}
          className="transition-transform group-hover:scale-105"
        >
          <Icon className="w-4 h-4 stroke-[1.8]" />
        </IconWell>

        <span className="text-sm tracking-tight hidden xl:inline-block flex-1 truncate">
          {item.label}
        </span>
      </Link>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between">
      {/* Brand Header */}
      <div>
        <div className="flex items-center justify-between px-5 py-5 border-b border-border/50">
          <Link href="/" className="flex items-center gap-3 group">
            <IconWell
              size="md"
              shape="square"
              color="primary"
              className="group-hover:scale-105"
            >
              <Sparkles className="w-5 h-5 text-primary stroke-[2.2]" />
            </IconWell>
            <div className="hidden xl:block">
              <span className="text-base font-extrabold tracking-tight text-text dark:gold-heading block">
                NEXTAL
              </span>
              <span className="text-[10px] uppercase tracking-widest text-text-muted font-medium block">
                HR & Payroll UAE
              </span>
            </div>
          </Link>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="xl:hidden p-1.5 rounded-lg text-text-muted hover:text-text"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-230px)]">
          {/* Platform Admin Special Menu */}
          {isPlatformAdmin && (
            <div className="space-y-1 mb-3">
              <div className="px-3 pb-1 hidden xl:block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                  Platform Admin
                </span>
              </div>
              <Link
                href="/platform/companies"
                onClick={onCloseMobile}
                className={clsx(
                  'flex items-center gap-3.5 px-3 py-2 rounded-control transition-all duration-200 group relative',
                  isItemActive('/platform/companies')
                    ? 'bg-primary-wash text-primary font-bold shadow-sm'
                    : 'text-text/80 hover:bg-black/5 dark:hover:bg-white/5 font-medium'
                )}
              >
                <IconWell size="sm" shape="square" color="primary">
                  <Building2 className="w-4 h-4 stroke-[1.8]" />
                </IconWell>
                <span className="text-sm tracking-tight hidden xl:inline-block flex-1 truncate">
                  {isAr ? 'الشركات والكيانات' : 'Companies'}
                </span>
              </Link>
            </div>
          )}

          {/* Company-wide navigation if not pure employee */}
          {navItems.length > 0 && (
            <div className="space-y-1">
              {navItems.map(renderNavLink)}
            </div>
          )}

          {/* Company Admin Users & Roles shortcut */}
          {user?.roles?.includes('COMPANY_ADMIN') && (
            <div className="pt-2">
              <Link
                href="/settings/users"
                onClick={onCloseMobile}
                className={clsx(
                  'flex items-center gap-3.5 px-3 py-2 rounded-control transition-all duration-200 group relative',
                  isItemActive('/settings/users')
                    ? 'bg-primary-wash text-primary font-bold shadow-sm'
                    : 'text-text/80 hover:bg-black/5 dark:hover:bg-white/5 font-medium'
                )}
              >
                <IconWell size="sm" shape="square" color="default">
                  <Shield className="w-4 h-4 stroke-[1.8]" />
                </IconWell>
                <span className="text-sm tracking-tight hidden xl:inline-block flex-1 truncate">
                  {isAr ? 'المستخدمون والأدوار' : 'Users & Roles'}
                </span>
              </Link>
            </div>
          )}

          {/* Self-Service Section (Only for users with an employee record or employee role) */}
          {isEmployee && !isPlatformAdmin && (
            <div className="pt-3 mt-3 border-t border-border/50">
              <div className="px-3 pb-1 hidden xl:block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted/70">
                  {t('menu.selfService')}
                </span>
              </div>
              <div className="space-y-1">
                {selfServiceItems.map(renderNavLink)}
              </div>
            </div>
          )}
        </nav>
      </div>

      {/* User Session Profile in Footer */}
      <div className="p-2 xl:p-3 border-t border-border/50 dark:border-border space-y-2">
        <div className="p-2 xl:p-2.5 rounded-xl border flex items-center justify-between text-start"
          style={{
            background: 'var(--bg-well)',
            borderColor: 'var(--glass-border)',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
              style={{
                background: 'var(--primary)',
                color: 'var(--on-primary)',
              }}
            >
              {user?.name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="truncate hidden xl:block">
              <span className="text-xs font-bold block truncate leading-tight text-text">
                {user?.name || user?.email}
              </span>
              <span className="text-[10px] block truncate font-medium text-amber-500">
                {user?.roles?.[0] || 'USER'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            title={isAr ? 'تسجيل الخروج' : 'Sign out'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Legal notice */}
        <div className="hidden xl:flex items-center gap-2 px-2 py-1 text-[10px] text-text-muted">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>{isAr ? 'متوافق مع مرسوم بقانون رقم 33 لسنة 2021' : 'UAE Decree 33/2021 Compliant'}</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={clsx(
          'glass-panel fixed top-0 bottom-0 z-30 transition-all duration-300 hidden md:block',
          'start-0 border-e border-border w-20 xl:w-64'
        )}
      >
        {sidebarContent}
      </aside>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <aside
            className={clsx(
              'glass-panel fixed top-0 bottom-0 z-10 w-72 transition-transform duration-300 shadow-2xl',
              'start-0 border-e border-border'
            )}
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
