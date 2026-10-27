'use client';

import React from 'react';
import { ThemeProvider } from 'next-themes';
import { LanguageProvider } from './LanguageContext';

export function Providers({ children, initialLocale = 'en' }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange={false}
    >
      <LanguageProvider initialLocale={initialLocale}>
        {children}
      </LanguageProvider>
    </ThemeProvider>
  );
}
