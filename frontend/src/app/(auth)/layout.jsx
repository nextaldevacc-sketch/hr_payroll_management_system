'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from 'next-themes';
import { Sun, Moon, Globe, ShieldCheck } from 'lucide-react';

export default function AuthLayout({ children }) {
  const { locale, toggleLanguage, isRTL } = useLanguage();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAr = locale === 'ar';

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-slate-100 via-slate-50 to-amber-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 transition-colors"
    >
      {/* Background ambient accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      {/* Centred Glass Container (Mobile responsive down to 390px) */}
      <div className="w-full max-w-[440px] relative rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl shadow-2xl p-6 sm:p-8">
        {/* Card corner controls: Language & Theme Toggles */}
        <div className="flex items-center justify-end gap-2 mb-4">
          <button
            type="button"
            onClick={toggleLanguage}
            title={isAr ? 'Switch to English' : 'التحويل إلى العربية'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isAr ? 'English' : 'العربية'}</span>
          </button>

          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              title={isAr ? 'تبديل المظهر' : 'Toggle theme'}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-slate-600" />
              )}
            </button>
          )}
        </div>

        {/* Nextal Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 mb-3 shadow-inner">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            NEXTAL
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? 'منصة الموارد البشرية وإدارة الرواتب المتوافقة مع قوانين العمل الإماراتية'
              : 'UAE Enterprise HR, Attendance & WPS Payroll Platform'}
          </p>
        </div>

        {/* Page Content */}
        {children}

        {/* Statutory Compliance Badge */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            {isAr
              ? 'متوافق مع المرسوم بقانون اتحادي رقم 33 لسنة 2021 ونظام حماية الأجور (WPS)'
              : 'Compliant with UAE Federal Decree-Law No. 33/2021 & WPS'}
          </p>
        </div>
      </div>
    </div>
  );
}

