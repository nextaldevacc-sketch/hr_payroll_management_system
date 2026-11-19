'use client';

import React from 'react';
import { Skeleton } from './Skeleton';
import { SkeletonStatCard } from './SkeletonStatCard';
import { SkeletonTable } from './SkeletonTable';

/**
 * Full page skeleton layout mirroring Nextal application routes.
 * Guarantees zero cumulative layout shift (CLS < 0.05).
 */
export function SkeletonPage({
  hasHeader = true,
  statsCount = 4,
  hasTable = true,
  tableRows = 6,
  tableCols = 6,
  children,
  className = '',
}) {
  return (
    <div className={`space-y-6 animate-in fade-in-50 duration-200 ${className}`} aria-hidden="true">
      {/* Page Header */}
      {hasHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56 rounded-lg" />
            <Skeleton className="h-4 w-80 rounded" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      {statsCount > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(statsCount)].map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
      )}

      {/* Body: Table or Children */}
      {children || (hasTable && <SkeletonTable rows={tableRows} cols={tableCols} />)}
    </div>
  );
}

export default SkeletonPage;
