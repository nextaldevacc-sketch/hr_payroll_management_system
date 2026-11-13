import React from 'react';
import { cookies } from 'next/headers';
import localFont from 'next/font/local';
import '../styles/globals.css';
import { Providers } from '../context/Providers';

const manrope = localFont({
  src: [
    {
      path: '../fonts/manrope-latin-400.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/manrope-latin-500.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../fonts/manrope-latin-700.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-manrope',
  display: 'swap',
});

const ibmPlexArabic = localFont({
  src: [
    {
      path: '../fonts/ibm-plex-sans-arabic-400.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/ibm-plex-sans-arabic-500.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../fonts/ibm-plex-sans-arabic-700.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
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
          {children}
        </Providers>
      </body>
    </html>
  );
}
