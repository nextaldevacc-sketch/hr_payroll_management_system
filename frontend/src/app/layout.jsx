import React from 'react';
import { cookies } from 'next/headers';
import { Manrope, IBM_Plex_Sans_Arabic } from 'next/font/google';
import '../styles/globals.css';
import { Providers } from '../context/Providers';
import { AppShell } from '../components/layout/AppShell';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-manrope',
  display: 'swap',
});

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '700'],
  variable: '--font-ibm-plex-arabic',
  display: 'swap',
});

export const metadata = {
  title: 'Nextal HR & Payroll | UAE Enterprise Multi-Company Platform',
  description:
    'Comprehensive UAE HR, Biometric Attendance, Overtime, Leave and WPS SIF Payroll Management in compliance with UAE Federal Decree-Law 33/2021.',
};

export default function RootLayout({ children }) {
  const cookieStore = cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  const direction = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html
      lang={locale}
      dir={direction}
      className={`${manrope.variable} ${ibmPlexArabic.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased min-h-screen">
        <Providers initialLocale={locale}>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
