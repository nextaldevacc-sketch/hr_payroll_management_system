'use client';

import React from 'react';
import { Skeleton, SkeletonAvatar, SkeletonCard, SkeletonForm } from '@/components/ui/skeleton';

export default function EmployeeDetailLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200" aria-busy="true">
      {/* Employee Header Profile Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <SkeletonAvatar size={64} className="rounded-2xl" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-48 rounded" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>
      </div>

      {/* 7 Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        {['Profile', 'Contract', 'Bank', 'Documents', 'Leave', 'Attendance', 'Audit'].map((tab) => (
          <Skeleton key={tab} className="h-9 w-24 rounded-lg flex-shrink-0" />
        ))}
      </div>

      {/* Main Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SkeletonForm fields={6} cols={2} />
        </div>
        <div className="space-y-6">
          <SkeletonCard lines={5} />
        </div>
      </div>
    </div>
  );
}
