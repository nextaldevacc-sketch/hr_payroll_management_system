'use client';

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { AccessDenied403 } from './AccessDenied403';

export function RouteGuard({ area, action = 'view', children }) {
  const { canAccess, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!canAccess(area, action)) {
    return <AccessDenied403 requiredArea={area} />;
  }

  return children;
}

export default RouteGuard;

