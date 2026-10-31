'use client';

import React from 'react';
import AuditFeature from '@/components/features/audit/AuditFeature';
import { RouteGuard } from '@/components/common/RouteGuard';

export default function AuditPage() {
  return (
    <RouteGuard area="audit">
      <AuditFeature />
    </RouteGuard>
  );
}
