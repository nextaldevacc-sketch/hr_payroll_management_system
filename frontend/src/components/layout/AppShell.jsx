'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import { GlassSidebar } from './GlassSidebar';
import { GlassTopBar } from './GlassTopBar';
import { useLanguage } from '../../context/LanguageContext';

export function AppShell({ children }) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { isRTL } = useLanguage();

  return (
    <div className="min-h-screen relative bg-bg text-text selection:bg-primary/20">
      {/* Radial soft background washes for glass backdrop filter */}
      <div className="app-bg-wash" />

      {/* Glass Sidebar */}
      <GlassSidebar
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <div
        className={clsx(
          'min-h-screen flex flex-col transition-all duration-300 relative z-10',
          'md:ms-20 xl:ms-64'
        )}
      >
        {/* Glass Top Bar */}
        <GlassTopBar onToggleMobileNav={() => setIsMobileNavOpen(!isMobileNavOpen)} />

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
