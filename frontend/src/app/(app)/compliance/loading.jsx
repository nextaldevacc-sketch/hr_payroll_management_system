'use client';

import React from 'react';
import { SkeletonPage, SkeletonChart } from '@/components/ui/skeleton';

export default function ComplianceLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200" aria-busy="true">
      <SkeletonPage hasHeader={true} statsCount={4} hasTable={false} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonChart type="bar" height={280} />
        <SkeletonChart type="donut" height={280} />
      </div>
    </div>
  );
}
