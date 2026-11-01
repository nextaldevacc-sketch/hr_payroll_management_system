'use client';

import React from 'react';
import { RouteGuard } from '@/components/common/RouteGuard';
import { PlatformCompaniesFeature } from '@/components/features/platform/PlatformCompaniesFeature';

export default function CompaniesPage() {
  return (
    <RouteGuard area="platform">
      <PlatformCompaniesFeature />
    </RouteGuard>
  );
}
