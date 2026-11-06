'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Globe,
  Building2,
  ChevronDown,
  Menu,
  Check,
  CheckCheck,
  FileText,
  Clock,
  Banknote,
  AlertTriangle,
  LogOut,
} from 'lucide-react';
import { IconWell } from '../primitives/IconWell';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useVisa } from '../../context/VisaContext';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../services/notificationsApi';

export function GlassTopBar({ onToggleMobileNav }) {
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { language, toggleLanguage, t, isRTL } = useLanguage();
  const { user, logout } = useAuth();
  const isPlatformAdmin = Boolean(user?.is_platform_admin);
  const {
    selectedVisaId,
    selectedVisa,
    visas,
    setSelectedVisaId,
    companyName,
    companyNameAr,
    isSingleVisaScope,
    allowAllVisas,
    isEmployeeOnly,
  } = useVisa();

  const userDisplayName = language === 'ar'
    ? (user?.arabic_name || user?.employee?.arabic_name || user?.name || user?.employee?.name || user?.email?.split('@')[0] || 'User')
    : (user?.name || user?.employee?.name || user?.email?.split('@')[0] || 'User');

  const initials = (() => {
    const rawName = (user?.name || user?.employee?.name || '').trim();
    if (rawName) {
      const parts = rawName.split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return rawName.slice(0, 2).toUpperCase();
    }
    return (user?.email || 'U').slice(0, 2).toUpperCase();
  })();
  const [mounted, setMounted] = useState(false);
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    try {
      const data = await getNotifications();
      if (data) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    setMounted(true);
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (id, link) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      if (link) {
        setIsNotifOpen(false);
        router.push(link);
      }
    } catch (e) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {}
  };

  const companyDisplayName = isRTL && companyNameAr ? companyNameAr : companyName;
  const currentVisaLabel = selectedVisa
    ? `${selectedVisa.name} · ${selectedVisa.mol_establishment_id ? `MOHRE #${selectedVisa.mol_establishment_id}` : selectedVisa.emirate}`
    : (language === 'ar' ? 'جميع تأشيرات الكيان' : 'All Company Visas');

  return (
    <header className="glass-top-bar sticky top-0 z-20 h-16 px-4 lg:px-8 flex items-center justify-between transition-colors">
      {/* Left / Start: Mobile Menu Toggle & Company Visa Selector */}
      <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
        <button
          onClick={onToggleMobileNav}
          className="md:hidden p-2 rounded-control text-text-muted hover:text-text hover:bg-black/5 dark:hover:bg-white/5"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Company Switcher or Platform Admin Badge */}
        {isPlatformAdmin ? (
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-control bg-amber-500/10 border border-amber-500/20 text-amber-500">
            <IconWell size="sm" shape="square" color="primary">
              <Building2 className="w-3.5 h-3.5" />
            </IconWell>
            <div className="hidden sm:block">
              <span className="text-xs font-bold block leading-tight">
                {language === 'ar' ? 'إدارة المنصة الموحدة' : 'Platform Administration'}
              </span>
              <span className="text-[10px] text-text-muted block leading-tight">
                {language === 'ar' ? 'المشغل العام للمنظومة' : 'Multi-Tenant Operator'}
              </span>
            </div>
          </div>
        ) : (isEmployeeOnly || isSingleVisaScope) ? (
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-control text-start">
            <IconWell size="sm" shape="square" color="primary">
              <Building2 className="w-3.5 h-3.5" />
            </IconWell>
            <div className="hidden sm:block">
              <span className="text-xs font-bold text-text dark:gold-heading block leading-tight">
                {companyDisplayName}
              </span>
              <span className="text-[10px] text-text-muted block leading-tight">
                {currentVisaLabel}
              </span>
            </div>
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
              id="btn-company-visa-switcher"
              className="topbar-field flex items-center gap-2.5 px-3 py-1.5 rounded-control hover:bg-black/5 dark:hover:bg-inset-hover transition-colors text-start group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <IconWell size="sm" shape="square" color="primary">
                <Building2 className="w-3.5 h-3.5" />
              </IconWell>
              <div className="hidden sm:block">
                <span className="text-xs font-bold text-text dark:gold-heading block leading-tight">
                  {companyDisplayName}
                </span>
                <span className="text-[10px] text-text-muted block leading-tight">
                  {currentVisaLabel}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-text-muted group-hover:text-text transition-transform duration-200 ms-1" />
            </button>

            {isCompanyDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsCompanyDropdownOpen(false)}
                />
                <div id="company-visa-dropdown-panel" className="glass-panel rounded-control absolute top-full mt-2 start-0 w-80 p-2 z-40 shadow-xl border border-border dark:bg-surface-raised">
                  <span className="text-[10px] uppercase font-bold text-text-muted px-2 py-1 block">
                    {language === 'ar' ? 'تأشيرات الكيان وملفات WPS' : 'Company Visas & WPS Context'}
                  </span>
                  <div className="space-y-1 mt-1">
                    {allowAllVisas && (
                      <button
                        type="button"
                        id="btn-select-visa-all"
                        onClick={() => {
                          setSelectedVisaId('all');
                          setIsCompanyDropdownOpen(false);
                        }}
                        className="w-full text-start px-2.5 py-2 rounded-lg text-xs hover:bg-primary-wash/50 dark:hover:bg-inset-hover transition-colors flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-text">
                            {language === 'ar' ? 'جميع تأشيرات الكيان' : 'All Company Visas'}
                          </p>
                          <p className="text-[10px] text-text-muted">
                            {language === 'ar' ? 'عرض شامل لكافة الفروع والموظفين' : 'Full organization-wide view'}
                          </p>
                        </div>
                        {selectedVisaId === 'all' && (
                          <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        )}
                      </button>
                    )}

                    {visas.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        id={`btn-select-visa-${v.id}`}
                        onClick={() => {
                          setSelectedVisaId(v.id);
                          setIsCompanyDropdownOpen(false);
                        }}
                        className="w-full text-start px-2.5 py-2 rounded-lg text-xs hover:bg-primary-wash/50 dark:hover:bg-inset-hover transition-colors flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-text">{v.name}</p>
                          <p className="text-[10px] text-text-muted font-mono">
                            {v.mol_establishment_id ? `MOHRE #${v.mol_establishment_id} · ` : ''}{v.emirate}
                          </p>
                        </div>
                        {selectedVisaId === v.id && (
                          <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Middle: Global Search */}
      <div className="hidden lg:flex items-center flex-1 max-w-md mx-6 min-w-0">
        <div className="relative w-full min-w-0">
          <Search className="w-4 h-4 text-text-muted absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            placeholder={t('common.searchPlaceholder')}
            className="topbar-field w-full h-9 ps-9 pe-12 text-xs text-text rounded-control focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder:text-text-muted/60 min-w-0"
          />
          <kbd className="hidden sm:inline-block absolute end-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-text-muted bg-black/5 dark:bg-inset px-1.5 py-0.5 rounded border border-border/50">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right / End: Language, Theme, Notifications & Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Language Toggle */}
        <button
          id="btn-language-toggle"
          onClick={toggleLanguage}
          title="Toggle English / Arabic"
          className="topbar-field flex items-center gap-1.5 px-2.5 py-1.5 rounded-control text-xs font-semibold text-text hover:bg-black/5 dark:hover:bg-inset-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Globe className="w-3.5 h-3.5 text-primary" />
          <span>{language === 'en' ? 'عربي' : 'EN'}</span>
        </button>

        {/* Theme Toggle in Neumorphic Well */}
        <IconWell
          id="btn-theme-toggle"
          size="sm"
          shape="circle"
          onClick={() => {
            const current = (mounted ? (resolvedTheme || theme) : 'dark');
            setTheme(current === 'dark' ? 'light' : 'dark');
          }}
          title={mounted && (resolvedTheme || theme) === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          <Sun className="w-4 h-4 text-primary hidden dark:block" />
          <Moon className="w-4 h-4 text-text-muted hover:text-text block dark:hidden" />
        </IconWell>

        {/* Notifications Bell */}
        <div className="relative">
          <IconWell
            id="btn-notifications-bell"
            size="sm"
            shape="circle"
            title="Notifications"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
          >
            <Bell className="w-4 h-4 text-text-muted hover:text-text cursor-pointer" />
          </IconWell>
          {unreadCount > 0 && (
            <span
              id="notifications-badge"
              data-count={unreadCount}
              className="absolute -top-0.5 -end-0.5 min-w-4 h-4 px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center shadow-sm pointer-events-none"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}

          {isNotifOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsNotifOpen(false)}
              />
              <div id="notifications-dropdown-panel" className="glass-panel rounded-xl absolute top-full mt-2 end-0 w-80 sm:w-96 p-3 z-40 shadow-2xl border border-border dark:bg-surface-raised max-h-[420px] flex flex-col">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-text">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="overflow-y-auto flex-1 divide-y divide-border/30 mt-1">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-text-muted">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const isUnread = !n.is_read;
                      return (
                        <div
                          key={n.id}
                          onClick={() => handleMarkRead(n.id, n.link)}
                          className={`p-2.5 rounded-lg text-start transition-colors cursor-pointer flex gap-2.5 items-start ${
                            isUnread
                              ? 'bg-primary-wash/40 hover:bg-primary-wash/70'
                              : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
                          }`}
                        >
                          <div className="mt-0.5 flex-shrink-0">
                            {n.type === 'APPROVAL_WAITING' && (
                              <Clock className="w-4 h-4 text-warning" />
                            )}
                            {n.type === 'REQUEST_STATUS' && (
                              <Check className="w-4 h-4 text-success" />
                            )}
                            {n.type === 'PAYSLIP_RELEASED' && (
                              <Banknote className="w-4 h-4 text-primary" />
                            )}
                            {n.type === 'DOCUMENT_EXPIRING' && (
                              <AlertTriangle className="w-4 h-4 text-danger" />
                            )}
                            {!['APPROVAL_WAITING', 'REQUEST_STATUS', 'PAYSLIP_RELEASED', 'DOCUMENT_EXPIRING'].includes(n.type) && (
                              <Bell className="w-4 h-4 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-text leading-tight truncate">
                              {language === 'ar' && n.title_ar ? n.title_ar : n.title}
                            </p>
                            <p className="text-[11px] text-text-muted line-clamp-2 mt-0.5 leading-snug">
                              {language === 'ar' && n.body_ar ? n.body_ar : n.body}
                            </p>
                            <span className="text-[9px] text-text-muted/60 mt-1 block">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-primary mt-1 flex-shrink-0" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2.5 ps-2 border-s border-border/60 dark:border-border hover:opacity-85 transition-opacity"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-black/10 dark:ring-0 shadow-sm"
              style={{
                background: 'var(--primary)',
                color: 'var(--on-primary)',
              }}
            >
              {initials}
            </div>
            <div className="hidden sm:block text-start">
              <span className="text-xs font-bold text-text block leading-tight" data-i18n-skip="true">
                {userDisplayName}
              </span>
              <span className="text-[10px] text-amber-500 font-semibold block leading-tight">
                {language === 'ar'
                  ? ({ COMPANY_ADMIN: 'مسؤول النظام', HR_MANAGER: 'مدير الموارد البشرية', EMPLOYEE: 'موظف', FINANCE: 'المالية', GM: 'المدير العام' }[user?.roles?.[0]] || user?.roles?.[0] || 'موظف')
                  : (user?.roles?.[0] || 'EMPLOYEE')}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-text-muted hidden sm:block" />
          </button>

          {isUserMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsUserMenuOpen(false)}
              />
              <div className="absolute end-0 mt-2 w-56 p-2 rounded-2xl border shadow-xl z-50 bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 space-y-2">
                <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-text truncate leading-tight" data-i18n-skip>
                    {userDisplayName}
                  </p>
                  <p className="text-[10px] text-text-muted font-mono truncate mt-0.5">
                    {user?.email}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {user?.roles?.map((r) => (
                      <span
                        key={r}
                        className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-start p-2 rounded-xl text-xs font-medium text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'تسجيل الخروج' : 'Sign out'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
