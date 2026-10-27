'use client';

import React from 'react';
import { ThemeProvider } from 'next-themes';
import { LanguageProvider } from './LanguageContext';
import { AuthProvider } from './AuthContext';

export function Providers({ children, initialLocale = 'en' }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange={false}
    >
      <LanguageProvider initialLocale={initialLocale}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
