'use client';

import React from 'react';
import { RouteGuard } from '@/components/common/RouteGuard';

export default function PlatformDashboardPage() {
  return (
    <RouteGuard area="platform">
      <div className="p-6">
        <h1 className="text-xl font-bold">Platform Administration</h1>
      </div>
    </RouteGuard>
  );
}

