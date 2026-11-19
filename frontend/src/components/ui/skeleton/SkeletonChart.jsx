'use client';

import React from 'react';
import { Skeleton } from './Skeleton';

/**
 * Chart / analytics tile skeleton with bars, line wave, or donut placeholder.
 */
export function SkeletonChart({
  type = 'bar',
  height = 260,
  hasHeader = true,
  className = '',
}) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between ${className}`}
      style={{ minHeight: `${height}px` }}
      aria-hidden="true"
    >
      {hasHeader && (
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-36 rounded" />
            <Skeleton className="h-3.5 w-48 rounded" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      )}

      {/* Chart visualization placeholders */}
      {type === 'bar' && (
        <div className="flex items-end justify-between gap-3 h-44 pt-4 px-2">
          {[45, 75, 55, 90, 65, 80, 50, 95, 70, 85].map((pct, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <Skeleton
                className="w-full rounded-t-md"
                style={{ height: `${pct}%` }}
              />
              <Skeleton className="h-3 w-6 rounded" />
            </div>
          ))}
        </div>
      )}

      {type === 'line' && (
        <div className="space-y-4 pt-2">
          <Skeleton className="h-36 w-full rounded-xl" />
          <div className="flex justify-between px-1">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-3 w-10 rounded" />
            ))}
          </div>
        </div>
      )}

      {type === 'donut' && (
        <div className="flex items-center justify-center gap-8 py-4">
          <Skeleton className="w-32 h-32 rounded-full border-8 border-slate-100 dark:border-slate-800" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <Skeleton className="w-3 h-3 rounded-full" />
                <Skeleton className="h-3.5 w-24 rounded" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SkeletonChart;
