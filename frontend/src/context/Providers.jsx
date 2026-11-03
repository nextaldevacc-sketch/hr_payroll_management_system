'use client';

import React, { useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from './LanguageContext';
import { AuthProvider } from './AuthContext';
import { VisaProvider } from './VisaContext';

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
              {children}
            </VisaProvider>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
