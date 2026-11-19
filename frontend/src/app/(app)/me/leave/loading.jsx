'use client';

import React from 'react';
import { SkeletonPage } from '@/components/ui/skeleton';

export default function MeLeaveLoading() {
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
