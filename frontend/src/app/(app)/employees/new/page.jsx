'use client';

import React from 'react';
import { EmployeeWizardFeature } from '@/components/features/employees/EmployeeWizardFeature';
import { RouteGuard } from '@/components/common/RouteGuard';

export default function NewEmployeePage() {
  return (
    <RouteGuard area="employees" action="create">
      <EmployeeWizardFeature />
    </RouteGuard>
  );
}
