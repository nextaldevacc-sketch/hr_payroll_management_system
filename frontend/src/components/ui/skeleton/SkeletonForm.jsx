'use client';

import React from 'react';
import { Skeleton } from './Skeleton';

/**
 * Form skeleton placeholder with labels, input fields, and action buttons.
 */
export function SkeletonForm({
  fields = 4,
  cols = 2,
  hasButtons = true,
  className = '',
}) {
  const colClass = cols === 1 ? 'grid-cols-1' : cols === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2';

  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6 ${className}`}
      aria-hidden="true"
    >
      <div className={`grid ${colClass} gap-5`}>
        {[...Array(fields)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>

      {hasButtons && (
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      )}
    </div>
  );
}

export default SkeletonForm;
