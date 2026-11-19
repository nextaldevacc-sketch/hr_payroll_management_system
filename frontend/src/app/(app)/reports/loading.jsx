'use client';

import React from 'react';
import { SkeletonPage, SkeletonCard } from '@/components/ui/skeleton';

export default function ReportsLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200" aria-busy="true">
      <SkeletonPage hasHeader={true} statsCount={3} hasTable={false} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <SkeletonCard key={i} lines={4} />
        ))}
      </div>
    </div>
  );
}
