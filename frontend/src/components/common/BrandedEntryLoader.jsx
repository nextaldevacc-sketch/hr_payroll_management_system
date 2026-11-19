'use client';

import React, { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';

/**
 * Branded Full-Screen Rotating Entry Loader.
 * Displayed exclusively on:
 * 1. Initial application launch / session truth check right after login.
 * 2. Cross-module top-level route transitions that exceed 300ms.
 * Never displays for intra-page tabs, search filters, pagination, or modals.
 */
export function BrandedEntryLoader() {
  const pathname = usePathname();
  const { user, status } = useAuth();
  let langContext = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    langContext = useLanguage();
  } catch {
    // Fallback if rendered outside LanguageProvider
  }
  const isAr = langContext?.language === 'ar';

  const [visible, setVisible] = useState(false);
  const prevTopLevelRef = useRef(null);
  const delayTimerRef = useRef(null);
  const isInitialMountRef = useRef(true);

  // Extract top-level segment (e.g., '/employees', '/payroll', '/settings')
  const currentTopLevel = pathname ? '/' + (pathname.split('/')[1] || '') : '/';

  // 1. Initial session/login check: display while auth status is 'loading'
  const isAuthLoading = status === 'loading';

  useEffect(() => {
    // On first mount or when authenticating, show loader if checking session
    if (isAuthLoading) {
      setVisible(true);
      return;
    }

    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevTopLevelRef.current = currentTopLevel;
      setVisible(false);
      return;
    }

    // Top-level route change check:
    // If top-level module has changed, arm a 300ms timer
    if (prevTopLevelRef.current !== currentTopLevel) {
      prevTopLevelRef.current = currentTopLevel;

      // Start 300ms countdown — if page finishes loading before 300ms, it NEVER flashes
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
      delayTimerRef.current = setTimeout(() => {
        setVisible(true);
      }, 300);

      // Once the component completes render, clear the timer
      const dismissTimer = setTimeout(() => {
        if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
        setVisible(false);
      }, 350);

      return () => {
        if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
        clearTimeout(dismissTimer);
      };
    } else {
      // Intra-page navigation or tab switch: ensure loader is OFF
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
      setVisible(false);
    }
  }, [currentTopLevel, isAuthLoading]);

  // If auth has loaded and no transition delay exceeded, hide completely
  if (!isAuthLoading && !visible) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-white/95 dark:bg-[#07090D]/95 backdrop-blur-md transition-opacity duration-200"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="relative flex flex-col items-center gap-6 p-8">
        {/* Animated Brand Emblem & Spinner Halo */}
        <div className="relative flex items-center justify-center w-20 h-20">
          {/* Outer Rotating Halo Ring */}
          <div
            className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin motion-reduce:animate-none"
            style={{ animationDuration: '1.2s' }}
          />

          {/* Secondary Counter-rotating Glow */}
          <div
            className="absolute -inset-1 rounded-full border border-amber-500/10 border-b-amber-500/40 animate-spin motion-reduce:hidden"
            style={{ animationDuration: '2.4s', animationDirection: 'reverse' }}
          />

          {/* Central Branded Icon Well */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-primary/10 border border-amber-500/30 dark:border-primary/40 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <Sparkles className="w-7 h-7 text-primary stroke-[2.2] animate-pulse motion-reduce:animate-none" />
          </div>
        </div>

        {/* Brand Wordmark & Caption */}
        <div className="text-center space-y-1.5">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-amber-400">
            NEXTAL
          </h1>
          <p className="text-[11px] font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-400">
            {isAr ? 'الموارد البشرية والرواتب — الإمارات' : 'HR & PAYROLL UAE'}
          </p>
        </div>

        {/* Status Text Indicator */}
        <div className="flex items-center gap-2 pt-2 text-xs font-medium text-slate-600 dark:text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping motion-reduce:hidden" />
          <span>
            {isAr ? 'جارٍ تحضير مساحة العمل...' : 'Preparing your workspace...'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default BrandedEntryLoader;
