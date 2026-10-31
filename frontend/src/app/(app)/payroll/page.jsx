'use client';

import React from 'react';
import { PayRunListFeature } from '@/components/features/payroll/PayRunListFeature';
import { RouteGuard } from '@/components/common/RouteGuard';

export default function PayrollPage() {
  return (
    <RouteGuard area="payroll">
      <PayRunListFeature />
    </RouteGuard>
  );
}
