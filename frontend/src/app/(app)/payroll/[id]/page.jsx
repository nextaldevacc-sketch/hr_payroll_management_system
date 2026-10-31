'use client';

import React from 'react';
import { PayRunDetailFeature } from '@/components/features/payroll/PayRunDetailFeature';
import { RouteGuard } from '@/components/common/RouteGuard';

export default function PayRunDetailPage() {
  return (
    <RouteGuard area="payroll">
      <PayRunDetailFeature />
    </RouteGuard>
  );
}
