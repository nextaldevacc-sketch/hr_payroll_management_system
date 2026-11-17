'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ShieldAlert, ArrowRight, ArrowLeft, LogOut, Home } from 'lucide-react';

export function AccessDenied403({ requiredArea = '' }) {
  const { user, logout } = useAuth();
  const { locale, isRTL } = useLanguage();
  const isAr = locale === 'ar';

  const isEmployeeOnly = user?.roles?.length === 1 && user.roles[0] === 'EMPLOYEE';
  const homeHref = isEmployeeOnly ? '/me' : '/';

  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-2xl text-center space-y-5">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-500 shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            HTTP 403 Forbidden · Section 5.3
          </span>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {isAr ? 'ليس لديك صلاحية للوصول إلى هذه الصفحة' : "You don't have access to this page"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            {isAr
              ? `دورك المؤسسي الحالي (${user?.roles?.join(', ') || 'موظف'}) لا يملك صلاحية عرض هذا القسم وفقاً لجدول الصلاحيات المؤسسية.`
              : `Your current role (${user?.roles?.join(', ') || 'User'}) does not permit accessing this area under UAE enterprise security controls.`}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
          <Link
            href={homeHref}
            className="min-h-[44px] py-2.5 px-4 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
          >
            <Home className="w-3.5 h-3.5" />
            <span>{isAr ? 'العودة إلى الرئيسية' : 'Back to your home'}</span>
          </Link>

          <button
            type="button"
            onClick={logout}
            className="min-h-[44px] py-2.5 px-4 rounded-xl font-semibold text-xs border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isAr ? 'تسجيل الخروج' : 'Sign out'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

