'use client';

import React from 'react';
import ComplianceFeature from '@/components/features/compliance/ComplianceFeature';
import { RouteGuard } from '@/components/common/RouteGuard';

export default function CompliancePage() {
  return (
    <RouteGuard area="compliance">
      <ComplianceFeature />
    </RouteGuard>
  );
}

