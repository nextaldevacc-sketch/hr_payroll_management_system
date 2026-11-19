'use client';

import React, { useState, Suspense } from 'react';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from './LanguageContext';
import { AuthProvider } from './AuthContext';
import { VisaProvider } from './VisaContext';
import { ToastProvider } from './ToastContext';
import { RouteProgressBar } from '../components/common/RouteProgressBar';
import { BrandedEntryLoader } from '../components/common/BrandedEntryLoader';

export function Providers({ children, initialLocale = 'en' }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange={false}
    >
      <QueryClientProvider client={queryClient}>
        <LanguageProvider initialLocale={initialLocale}>
          <AuthProvider>
            <VisaProvider>
              <ToastProvider>
                <Suspense fallback={null}>
                  <RouteProgressBar />
                </Suspense>
                <BrandedEntryLoader />
                {children}
              </ToastProvider>
            </VisaProvider>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
