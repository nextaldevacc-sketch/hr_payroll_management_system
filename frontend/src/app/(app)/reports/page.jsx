'use client';

import React from 'react';
import ReportsFeature from '@/components/features/reports/ReportsFeature';
import { RouteGuard } from '@/components/common/RouteGuard';

export default function ReportsPage() {
  return (
    <RouteGuard area="reports">
      <ReportsFeature />
    </RouteGuard>
  );
}
