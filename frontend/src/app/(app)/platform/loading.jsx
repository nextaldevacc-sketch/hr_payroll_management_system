'use client';

import React from 'react';
import { SkeletonPage } from '@/components/ui/skeleton';

export default function PlatformLoading() {
  return (
    <SkeletonPage
      hasHeader={true}
      statsCount={3}
      hasTable={true}
      tableRows={5}
      tableCols={5}
    />
  );
}
