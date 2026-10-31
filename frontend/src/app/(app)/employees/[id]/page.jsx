'use client';

import React from 'react';
import { EmployeeProfileFeature } from '@/components/features/employees/EmployeeProfileFeature';
import { RouteGuard } from '@/components/common/RouteGuard';

export default function EmployeeDetailPage() {
  return (
    <RouteGuard area="employees">
      <EmployeeProfileFeature />
    </RouteGuard>
  );
}
