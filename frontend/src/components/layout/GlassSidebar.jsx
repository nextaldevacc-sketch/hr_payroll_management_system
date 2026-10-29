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
import { useAuth, DEMO_USERS } from '../../context/AuthContext';

export function GlassSidebar({ isMobileOpen = false, onCloseMobile }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale } = useLanguage();
  const { user, seesSalary, switchDemoUser, logout } = useAuth();
  const [isPersonaDrawerOpen, setIsPersonaDrawerOpen] = useState(false);

  // Section 5.3 Permissions Matrix Filter for Sidebar Navigation
  const isEmployeeOnly = user?.roles?.includes('EMPLOYEE') && user.roles.length === 1;
  const isPlatformAdmin = Boolean(user?.is_platform_admin);

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

    // Payroll visible only to salary roles (Section 5.3)
    if (item.area === 'payroll' && !seesSalary) return false;

    // Employee records: Finance has '—' in Section 5.3
    if (item.area === 'employees' && user?.roles?.includes('FINANCE') && !user?.roles?.includes('COMPANY_ADMIN')) {
      return false;
    }

    // Settings: Dept Manager, HR Officer have '—'
    if (
      item.area === 'settings' &&
      user?.roles?.every((r) => ['EMPLOYEE', 'DEPT_MANAGER', 'HR_OFFICER', 'GM'].includes(r)) &&
      !user?.roles?.includes('COMPANY_ADMIN')
    ) {
      return false;
    }

    // Audit: Visible only to HR Manager, GM, Company Admin (Section 5.3)
    if (
      item.area === 'audit' &&
      !user?.roles?.some((r) => ['COMPANY_ADMIN', 'HR_MANAGER', 'GM'].includes(r))
    ) {
      return false;
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
                  Companies (FR-PL1–3)
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
                  Users & Roles (5.1)
                </span>
              </Link>
            </div>
          )}

          {/* Self-Service Section */}
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
        </nav>
      </div>

      {/* User Session Profile & Demo Switcher in Footer */}
      <div className="p-3 border-t border-border/50 dark:border-border hidden xl:block space-y-2">
        {/* Active User Card with Switcher Toggle */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsPersonaDrawerOpen(!isPersonaDrawerOpen)}
            className="w-full p-2.5 rounded-xl border flex items-center justify-between text-start transition-all hover:bg-neutral-800/40"
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
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="truncate">
                <span className="text-xs font-bold block truncate leading-tight text-text">
                  {user?.name || user?.email}
                </span>
                <span className="text-[10px] block truncate font-medium text-amber-400">
                  {user?.roles?.[0] || 'USER'}
                </span>
              </div>
            </div>
            <ChevronUp className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isPersonaDrawerOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Persona Switcher Popup */}
          {isPersonaDrawerOpen && (
            <div
              className="absolute bottom-full mb-2 start-0 w-64 p-2 rounded-2xl border shadow-2xl z-50 space-y-1 backdrop-blur-xl"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--glass-border)',
              }}
            >
              <div className="px-2 py-1 text-[10px] uppercase font-bold text-text-muted flex justify-between">
                <span>Switch Demo Persona</span>
                <span className="text-amber-500 font-mono">Sec 5.2</span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                {Object.entries(DEMO_USERS).map(([key, demo]) => {
                  const isActive = user?.email === demo.email;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        switchDemoUser(key);
                        setIsPersonaDrawerOpen(false);
                      }}
                      className={`w-full text-start p-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        isActive ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-neutral-800/50 text-neutral-300'
                      }`}
                    >
                      <div className="truncate">
                        <span className="font-semibold block truncate text-[11px]">{demo.roleNameEn}</span>
                        <span className="text-[9px] block text-neutral-400 font-mono truncate">{demo.email}</span>
                      </div>
                      {demo.sees_salary && (
                        <span className="text-[8px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 ml-1">
                          WPS
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-1 border-t border-neutral-800 flex justify-between">
                <Link
                  href="/login"
                  onClick={() => setIsPersonaDrawerOpen(false)}
                  className="text-[10px] text-amber-400 hover:underline px-2 py-1"
                >
                  Go to Login Screen
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setIsPersonaDrawerOpen(false);
                    router.push('/login');
                  }}
                  className="text-[10px] text-rose-400 hover:underline px-2 py-1 flex items-center gap-1"
                >
                  <LogOut className="w-2.5 h-2.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Legal notice */}
        <div className="flex items-center gap-2 px-2 py-1 text-[10px] text-text-muted">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>UAE Decree 33/2021 Compliant</span>
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
