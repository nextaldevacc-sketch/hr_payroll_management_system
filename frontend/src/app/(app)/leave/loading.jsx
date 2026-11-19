'use client';

import React from 'react';
import { SkeletonPage } from '@/components/ui/skeleton';

export default function LeaveLoading() {
  return (
    <SkeletonPage
      hasHeader={true}
      statsCount={4}
      hasTable={true}
      tableRows={6}
      tableCols={6}
    />
  );
}
