'use client';

import React from 'react';
import { Skeleton, SkeletonStatCard, SkeletonTable } from '@/components/ui/skeleton';

export default function ApprovalsLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200" aria-busy="true">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52 rounded-lg" />
          <Skeleton className="h-4 w-80 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>

      {/* Tabs (Pending Approvals vs Rejection Log) */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <Skeleton className="h-10 w-36 rounded-xl" />
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Table */}
      <SkeletonTable rows={6} cols={5} />
    </div>
  );
}
