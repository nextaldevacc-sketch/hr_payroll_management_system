'use client';

import React from 'react';
import { UsersAndRolesFeature } from '@/components/features/settings/UsersAndRolesFeature';
import { RouteGuard } from '@/components/common/RouteGuard';

export default function UsersSettingsPage() {
  return (
    <RouteGuard area="settings">
      <UsersAndRolesFeature />
    </RouteGuard>
  );
}
