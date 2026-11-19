'use client';

import React from 'react';
import { SkeletonPage } from '@/components/ui/skeleton';

export default function AuditLoading() {
  return (
    <SkeletonPage
      hasHeader={true}
      statsCount={3}
      hasTable={true}
      tableRows={8}
      tableCols={6}
    />
  );
}
