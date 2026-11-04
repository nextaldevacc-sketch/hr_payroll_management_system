'use client';

import React from 'react';
import { ApprovalsInboxFeature } from '../../../components/features/approvals/ApprovalsInboxFeature';
import { RouteGuard } from '../../../components/common/RouteGuard';

export default function ApprovalsPage() {
  return (
    <RouteGuard permission={['approvals:view', 'approvals:approve', 'employees:verify', 'employees:edit']}>
      <ApprovalsInboxFeature />
    </RouteGuard>
  );
}

