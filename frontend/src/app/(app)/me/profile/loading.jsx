'use client';

import React from 'react';
import { Skeleton, SkeletonAvatar, SkeletonForm, SkeletonCard } from '@/components/ui/skeleton';

export default function MeProfileLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200" aria-busy="true">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex items-center gap-4">
        <SkeletonAvatar size={64} className="rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 rounded" />
          <Skeleton className="h-4 w-60 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SkeletonForm fields={6} cols={2} />
        </div>
        <div>
          <SkeletonCard lines={4} />
        </div>
      </div>
    </div>
  );
}
