'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  Check
} from 'lucide-react';
import { IconWell } from '../primitives/IconWell';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

export function GlassTopBar({ onToggleMobileNav }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { language, toggleLanguage, t, isRTL } = useLanguage();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [selectedCompany, setSelectedCompany] = useState({
    name: 'Gulf Tech Logistics LLC',
    visa: 'MOHRE Visa #442901 - Dubai',
  });

  const companies = [
    { name: 'Gulf Tech Logistics LLC', visa: 'MOHRE Visa #442901 - Dubai' },
    { name: 'Nextal Solutions FZ-LLC', visa: 'DIFC License #98210 - Dubai' },
    { name: 'Apex Engineering Abu Dhabi', visa: 'Abu Dhabi Main Branch' },
  ];

  return (
    <header className="glass-top-bar sticky top-0 z-20 h-16 px-4 lg:px-8 flex items-center justify-between transition-colors">
      {/* Left / Start: Mobile Menu Toggle & Company Switcher */}
      <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
        <button
          onClick={onToggleMobileNav}
          className="md:hidden p-2 rounded-control text-text-muted hover:text-text hover:bg-black/5 dark:hover:bg-white/5"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Company Switcher */}
        <div className="relative">
          <button
            onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
            className="topbar-field flex items-center gap-2.5 px-3 py-1.5 rounded-control hover:bg-black/5 dark:hover:bg-inset-hover transition-colors text-start group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <IconWell size="sm" shape="square" color="primary">
              <Building2 className="w-3.5 h-3.5" />
            </IconWell>
            <div className="hidden sm:block">
              <span className="text-xs font-bold text-text dark:gold-heading block leading-tight">
                {selectedCompany.name}
              </span>
              <span className="text-[10px] text-text-muted block leading-tight">
                {selectedCompany.visa}
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
              <div className="glass-panel rounded-control absolute top-full mt-2 start-0 w-72 p-2 z-40 shadow-xl border border-border dark:bg-surface-raised">
                <span className="text-[10px] uppercase font-bold text-text-muted px-2 py-1 block">
                  Select Company Visa / Entity
                </span>
                <div className="space-y-1 mt-1">
                  {companies.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => {
                        setSelectedCompany(c);
                        setIsCompanyDropdownOpen(false);
                      }}
                      className="w-full text-start px-2.5 py-2 rounded-lg text-xs hover:bg-primary-wash/50 dark:hover:bg-inset-hover transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-text">{c.name}</p>
                        <p className="text-[10px] text-text-muted">{c.visa}</p>
                      </div>
                      {selectedCompany.name === c.name && (
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
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
          onClick={toggleLanguage}
          title="Toggle English / Arabic"
          className="topbar-field flex items-center gap-1.5 px-2.5 py-1.5 rounded-control text-xs font-semibold text-text hover:bg-black/5 dark:hover:bg-inset-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Globe className="w-3.5 h-3.5 text-primary" />
          <span>{language === 'en' ? 'عربي' : 'EN'}</span>
        </button>

        {/* Theme Toggle in Neumorphic Well */}
        <IconWell
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
          <IconWell size="sm" shape="circle" title="Notifications">
            <Bell className="w-4 h-4 text-text-muted hover:text-text" />
          </IconWell>
          <span className="absolute -top-0.5 -end-0.5 w-4 h-4 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
            3
          </span>
        </div>

        {/* User Menu */}
        <Link
          href="/login"
          title="Switch User / Sign In"
          className="flex items-center gap-2.5 ps-2 border-s border-border/60 dark:border-border hover:opacity-85 transition-opacity"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-black/10 dark:ring-0 shadow-sm"
            style={{
              background: 'var(--primary)',
              color: 'var(--on-primary)',
            }}
          >
            {user?.name ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2) : 'GT'}
          </div>
          <div className="hidden sm:block text-start">
            <span className="text-xs font-bold text-text block leading-tight">
              {user?.name || user?.email || 'Demo User'}
            </span>
            <span className="text-[10px] text-amber-500 font-semibold block leading-tight">
              {user?.roles?.[0] || 'COMPANY_ADMIN'}
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}
