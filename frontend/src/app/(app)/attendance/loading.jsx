'use client';

import React from 'react';
import { SkeletonPage } from '@/components/ui/skeleton';

export default function AttendanceLoading() {
  return (
    <SkeletonPage
      hasHeader={true}
      statsCount={4}
      hasTable={true}
      tableRows={7}
      tableCols={6}
    />
  );
}
