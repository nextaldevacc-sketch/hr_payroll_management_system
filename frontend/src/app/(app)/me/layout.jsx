'use client';

import React from 'react';
import { RouteGuard } from '@/components/common/RouteGuard';

export default function MeLayout({ children }) {
  return <RouteGuard area="me">{children}</RouteGuard>;
}

