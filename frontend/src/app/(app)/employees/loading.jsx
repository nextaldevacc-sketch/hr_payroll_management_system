'use client';

import React from 'react';
import { SkeletonPage, SkeletonTable } from '@/components/ui/skeleton';

export default function EmployeesLoading() {
  return (
    <SkeletonPage
      hasHeader={true}
      statsCount={4}
      hasTable={true}
      tableRows={8}
      tableCols={6}
    />
  );
}
