'use client';

import React from 'react';
import { Skeleton, SkeletonForm } from '@/components/ui/skeleton';

export default function NewEmployeeLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in-50 duration-200" aria-busy="true">
      {/* Wizard Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="h-4 w-96 rounded" />
      </div>

      {/* Stepper Progress Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex-1 flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            <Skeleton className="h-4 w-24 rounded hidden sm:block" />
          </div>
        ))}
      </div>

      {/* Form Step Body */}
      <SkeletonForm fields={8} cols={2} />
    </div>
  );
}
