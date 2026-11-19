'use client';

import React from 'react';
import { SkeletonPage } from '@/components/ui/skeleton';

export default function MeDocumentsLoading() {
  return (
    <SkeletonPage
      hasHeader={true}
      statsCount={2}
      hasTable={true}
      tableRows={5}
      tableCols={5}
    />
  );
}
