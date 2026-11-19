'use client';

import React from 'react';
import { Skeleton } from './Skeleton';

/**
 * Metric / KPI stat tile skeleton placeholder matching app Bento and KPI grids.
 */
export function SkeletonStatCard({ className = '' }) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 ${className}`}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="w-9 h-9 rounded-xl" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-36 rounded-lg" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-14 rounded-full" />
          <Skeleton className="h-3 w-24 rounded" />
        </div>
      </div>
    </div>
  );
}

export default SkeletonStatCard;
