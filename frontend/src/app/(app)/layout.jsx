'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { AppShell } from '../../components/layout/AppShell';

export default function AppLayout({ children }) {
  const { user, status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'unauthenticated') {
      const nextParam = pathname && pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${nextParam}`);
    }
  }, [status, pathname, router]);

  // While checking server truth session on initial load, show a full-page skeleton
  if (status === 'loading' || !user) {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex">
        {/* Sidebar Skeleton */}
        <div className="w-64 border-e border-slate-200 dark:border-slate-800 p-4 hidden md:flex flex-col gap-4 animate-pulse">
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-3/4 mb-4" />
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-full" />
            ))}
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="flex-1 p-6 space-y-6 animate-pulse">
          <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
            ))}
          </div>
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        </div>
      </div>
    );
  }

  // Once authenticated by server truth, render application shell
  return <AppShell>{children}</AppShell>;
}

