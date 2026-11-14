'use client';

import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { GlassSidebar } from './GlassSidebar';
import { GlassTopBar } from './GlassTopBar';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, LogOut, RefreshCw } from 'lucide-react';

export function AppShell({ children }) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { isRTL, language } = useLanguage();
  const { user, logout, refreshUser } = useAuth();
  const isAr = language === 'ar';

  const hasNoRoles = Boolean(user && (!user.roles || user.roles.length === 0) && !user.is_platform_admin);

  useEffect(() => {
    if (hasNoRoles && user) {
      console.warn(`[AUTH] User without role attempted app access: ${user.email} (userId: ${user.id})`);
    }
  }, [hasNoRoles, user]);

  if (hasNoRoles) {
    return (
      <div className="min-h-screen relative bg-bg text-text flex items-center justify-center p-4 selection:bg-primary/20">
        <div className="app-bg-wash" />
        <div
          data-testid="no-role-page"
          className="max-w-md w-full p-6 md:p-8 rounded-3xl bg-surface/90 border border-border shadow-2xl backdrop-blur-xl relative z-10 text-center space-y-6"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-lg md:text-xl font-bold text-text mb-2">
              {isAr ? 'لم يتم تعيين أي دور لحسابك' : 'No Role Assigned'}
            </h1>
            <p className="text-xs text-text-muted leading-relaxed">
              {isAr
                ? 'تم تسجيل دخولك بنجاح، ولكن لم يتم تعيين أي دور أو صلاحيات لحسابك بعد. يرجى مراجعة مسؤول الشركة.'
                : 'No role assigned - contact your Company Admin. Your account is active, but no operational roles or employee permissions have been assigned yet.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-raised border border-border text-start space-y-2 text-xs">
            <div className="flex justify-between items-center text-text-muted">
              <span>{isAr ? 'البريد الإلكتروني:' : 'Account Email:'}</span>
              <span className="font-mono text-text font-semibold">{user.email}</span>
            </div>
            <div className="flex justify-between items-center text-text-muted">
              <span>{isAr ? 'المنشأة:' : 'Organization:'}</span>
              <span className="text-text font-semibold">{user.company_name || 'Nextal Platform'}</span>
            </div>
            <div className="flex justify-between items-center text-text-muted">
              <span>{isAr ? 'حالة الدور:' : 'Role Status:'}</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-500">
                {isAr ? 'بانتظار التعيين' : 'Awaiting Assignment'}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => refreshUser()}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-surface border border-border hover:bg-surface-hover text-text flex items-center justify-center gap-2 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{isAr ? 'إعادة الفحص' : 'Check Status'}</span>
            </button>
            <button
              type="button"
              id="btn-no-role-logout"
              onClick={() => logout()}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20"
            >
              <LogOut className="w-4 h-4" />
              <span>{isAr ? 'تسجيل الخروج' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-bg text-text selection:bg-primary/20">
      {/* Radial soft background washes for glass backdrop filter */}
      <div className="app-bg-wash" />

      {/* Glass Sidebar */}
      <GlassSidebar
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <div
        className={clsx(
          'min-h-screen flex flex-col transition-all duration-300 relative z-10',
          'md:ms-20 xl:ms-64'
        )}
      >
        {/* Glass Top Bar */}
        <GlassTopBar onToggleMobileNav={() => setIsMobileNavOpen(!isMobileNavOpen)} />

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
