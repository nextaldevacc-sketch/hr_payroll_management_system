'use client';

import React from 'react';
import { notFound } from 'next/navigation';
import { PlatformCompaniesFeature } from '@/components/features/platform/PlatformCompaniesFeature';

export default function CompaniesPage() {
  if (process.env.NEXT_PUBLIC_FEATURE_PLATFORM_ADMIN !== 'true') {
    notFound();
  }
  return <PlatformCompaniesFeature />;
}
