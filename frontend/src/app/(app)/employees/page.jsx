'use client';

import React from 'react';
import { EmployeeListFeature } from '@/components/features/employees/EmployeeListFeature';
import { RouteGuard } from '@/components/common/RouteGuard';

export default function EmployeesPage() {
  return (
    <RouteGuard area="employees">
      <EmployeeListFeature />
    </RouteGuard>
  );
}
