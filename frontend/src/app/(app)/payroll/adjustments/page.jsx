'use client';

import React from 'react';
import { SalaryAdjustmentsFeature } from '@/components/features/payroll/SalaryAdjustmentsFeature';
import { RouteGuard } from '@/components/common/RouteGuard';

export default function SalaryAdjustmentsPage() {
  return (
    <RouteGuard area="payroll">
      <SalaryAdjustmentsFeature />
    </RouteGuard>
  );
}
