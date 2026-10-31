'use client';

import React from 'react';
import { OffboardingFeature } from '@/components/features/offboarding/OffboardingFeature';
import { RouteGuard } from '@/components/common/RouteGuard';

export default function OffboardingPage() {
  return (
    <RouteGuard area="offboarding">
      <OffboardingFeature />
    </RouteGuard>
  );
}
