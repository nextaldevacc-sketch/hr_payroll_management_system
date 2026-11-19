'use client';

import React from 'react';
import { Skeleton, SkeletonAvatar, SkeletonStatCard, SkeletonCard } from '@/components/ui/skeleton';

export default function MeLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200" aria-busy="true">
      {/* Welcome Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <SkeletonAvatar size={56} className="rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-44 rounded-lg" />
              <Skeleton className="h-4 w-64 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Quick Actions & Recent Payslips */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SkeletonCard lines={5} />
        </div>
        <div>
          <SkeletonCard lines={4} />
        </div>
      </div>
    </div>
  );
}
