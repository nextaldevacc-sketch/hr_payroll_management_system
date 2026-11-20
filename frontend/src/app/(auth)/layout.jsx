'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AuthShell } from '../../components/auth/AuthShell';

export default function AuthLayout({ children }) {
  const pathname = usePathname();
  // Display dynamic video on login route; display static high-res showcase visual on secondary auth pages
  const isLoginPage = pathname === '/login' || pathname === '/(auth)/login';

  return (
    <AuthShell showVideo={isLoginPage}>
      {children}
    </AuthShell>
  );
}
