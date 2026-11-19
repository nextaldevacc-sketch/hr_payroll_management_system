'use client';

import React from 'react';
import { SkeletonPage } from '@/components/ui/skeleton';

export default function MePayslipsLoading() {
  return (
    <SkeletonPage
      hasHeader={true}
      statsCount={3}
      hasTable={true}
      tableRows={6}
      tableCols={5}
    />
  );
}
