'use client';

import React from 'react';
import { Skeleton, SkeletonForm, SkeletonCard } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200" aria-busy="true">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-60 rounded-lg" />
        <Skeleton className="h-4 w-96 rounded" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        {['General', 'Policies', 'Shifts', 'Roles', 'Security'].map((tab) => (
          <Skeleton key={tab} className="h-9 w-24 rounded-lg flex-shrink-0" />
        ))}
      </div>

      {/* Body: Form Card */}
      <SkeletonForm fields={6} cols={2} />
      <SkeletonCard lines={3} />
    </div>
  );
}
