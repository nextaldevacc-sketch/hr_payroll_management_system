'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  X
} from 'lucide-react';
import { IconWell } from '../primitives/IconWell';
import { useLanguage } from '../../context/LanguageContext';

export function GlassSidebar({ isMobileOpen = false, onCloseMobile }) {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    { href: '/', icon: LayoutDashboard, label: t('menu.dashboard'), exact: true },
    { href: '/employees', icon: Users, label: t('menu.employees') },
    { href: '/attendance', icon: Clock, label: t('menu.attendance') },
    { href: '/leave', icon: CalendarDays, label: t('menu.leaveHolidays') },
    { href: '/payroll', icon: Banknote, label: t('menu.payroll') },
    { href: '/offboarding', icon: UserMinus, label: t('menu.offboarding') },
    { href: '/compliance', icon: ShieldCheck, label: t('menu.compliance') },
    { href: '/reports', icon: BarChart3, label: t('menu.reports') },
    { href: '/settings', icon: Settings, label: t('menu.settings') },
    { href: '/audit', icon: History, label: t('menu.audit') },
  ];

  const isDev = process.env.NODE_ENV !== 'production';

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between">
      {/* Brand Header */}
      <div>
        <div className="flex items-center justify-between px-5 py-6 border-b border-border/50">
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
        <nav className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-220px)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={clsx(
                  'flex items-center gap-3.5 px-3 py-2.5 rounded-control transition-all duration-200 group relative select-none',
                  isActive
                    ? 'bg-primary-wash text-primary font-bold shadow-sm'
                    : 'text-text/80 hover:bg-black/5 dark:hover:bg-white/5 hover:text-text font-medium'
                )}
              >
                {/* Active indicator bar on inline-start edge */}
                {isActive && (
                  <span className="absolute start-0 top-2 bottom-2 w-1 rounded-full bg-primary" />
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
          })}
        </nav>
      </div>

      {/* Footer / System Status & Dev Styleguide */}
      <div className="p-4 border-t border-border/50 dark:border-border hidden xl:block space-y-2">
        <div className="flex items-center gap-3 px-3 py-2 rounded-control bg-black/[0.02] dark:bg-inset">
          <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-text">UAE Labour Law Compliant</span>
            <span className="text-[10px] text-text-muted">Federal Decree-Law 33/2021</span>
          </div>
        </div>

        {isDev && (
          <Link
            href="/styleguide"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] text-text-muted/70 hover:text-text hover:bg-black/5 dark:hover:bg-inset-hover transition-colors"
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Style Guide (Dev)</span>
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop/Tablet Sidebar: Logical properties mirror automatically in RTL */}
      <aside
        className={clsx(
          'glass-panel fixed top-0 bottom-0 z-30 transition-all duration-300 hidden md:block',
          'start-0 border-e border-border w-20 xl:w-64'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer: Logical properties mirror automatically in RTL */}
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
