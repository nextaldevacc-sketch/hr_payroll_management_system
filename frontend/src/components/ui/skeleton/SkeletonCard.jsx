'use client';

import React from 'react';
import { Skeleton } from './Skeleton';
import { SkeletonText } from './SkeletonText';

/**
 * General surface card skeleton with header and body placeholder.
 */
export function SkeletonCard({
  hasHeader = true,
  lines = 4,
  children,
  className = '',
  ...props
}) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm ${className}`}
      aria-hidden="true"
      {...props}
    >
      {hasHeader && (
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800/60">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-40 rounded" />
            <Skeleton className="h-3.5 w-60 rounded" />
          </div>
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      )}
      {children || <SkeletonText lines={lines} gap="space-y-3" />}
    </div>
  );
}

export default SkeletonCard;
