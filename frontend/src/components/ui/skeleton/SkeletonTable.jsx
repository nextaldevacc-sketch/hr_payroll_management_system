'use client';

import React from 'react';
import { Skeleton } from './Skeleton';

/**
 * Data table skeleton placeholder with header, striped rows, and pagination bar.
 */
export function SkeletonTable({
  rows = 5,
  cols = 6,
  hasHeader = true,
  hasPagination = true,
  className = '',
}) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm ${className}`}
      aria-hidden="true"
    >
      {/* Table Header Controls */}
      <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>
      </div>

      {/* Table Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          {hasHeader && (
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                {[...Array(cols)].map((_, c) => (
                  <th key={c} className="p-4">
                    <Skeleton className={`h-4 ${c === 0 ? 'w-28' : c === cols - 1 ? 'w-16' : 'w-20'} rounded`} />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {[...Array(rows)].map((_, r) => (
              <tr key={r} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20">
                {[...Array(cols)].map((_, c) => (
                  <td key={c} className="p-4">
                    {c === 0 ? (
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-32 rounded" />
                          <Skeleton className="h-3 w-20 rounded" />
                        </div>
                      </div>
                    ) : c === cols - 1 ? (
                      <div className="flex justify-end">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                      </div>
                    ) : c === 1 ? (
                      <Skeleton className="h-6 w-20 rounded-full" />
                    ) : (
                      <Skeleton className="h-4 w-24 rounded" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {hasPagination && (
        <div className="p-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-950/20">
          <Skeleton className="h-4 w-36 rounded" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}

export default SkeletonTable;
