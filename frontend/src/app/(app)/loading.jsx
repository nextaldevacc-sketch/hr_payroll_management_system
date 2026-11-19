'use client';

import React from 'react';
import { Skeleton, SkeletonStatCard, SkeletonChart } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200" aria-busy="true">
      {/* Top Banner / Hero Skeleton */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-6 w-36 rounded-full" />
            </div>
            <Skeleton className="h-8 w-72 rounded-lg" />
            <Skeleton className="h-4 w-96 rounded" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-32 rounded-xl" />
            <Skeleton className="h-11 w-36 rounded-xl" />
          </div>
        </div>
      </div>

      {/* KPI Stats Grid (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Analytics Charts & Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SkeletonChart type="bar" height={320} />
        </div>
        <div>
          <SkeletonChart type="donut" height={320} />
        </div>
      </div>
    </div>
  );
}
