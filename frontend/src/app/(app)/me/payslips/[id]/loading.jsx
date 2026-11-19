'use client';

import React from 'react';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';

export default function MePayslipDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in-50 duration-200" aria-busy="true">
      <div className="flex items-center justify-between pb-2">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-48 rounded" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      <SkeletonCard lines={8} />
    </div>
  );
}
