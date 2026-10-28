'use client';

import React from 'react';
import Link from 'next/link';
import { BentoTile } from '../components/primitives/BentoTile';
import { IconWell } from '../components/primitives/IconWell';
import { Button } from '../components/primitives/form/Button';
import { useLanguage } from '../context/LanguageContext';
import { Compass, LayoutDashboard, ArrowLeft, ArrowRight } from 'lucide-react';

export default function NotFound() {
  const { language, isRTL } = useLanguage();

  return (
    <div className="flex items-center justify-center min-h-[70vh] p-4 animate-fadeIn">
      <div className="w-full max-w-xl">
        <BentoTile
          id="not-found-tile"
          title={language === 'ar' ? 'خطأ 404 — الصفحة غير موجودة' : '404 — Page Not Found'}
          subtitle={
            language === 'ar'
              ? 'منظومة نكستال للموارد البشرية والرواتب — دولة الإمارات'
              : 'Nextal HR & Payroll Enterprise Platform — UAE'
          }
          iconWell={
            <IconWell size="lg" shape="square" color="primary">
              <Compass className="w-6 h-6 text-primary stroke-[2]" />
            </IconWell>
          }
        >
          <div className="py-6 text-center space-y-5">
            {/* 404 Hero Number with Gold Gradient in Dark Mode */}
            <div className="flex justify-center">
              <span className="text-6xl sm:text-7xl font-extrabold tracking-tight text-text gold-heading select-none">
                404
              </span>
            </div>

            {/* Description */}
            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-lg sm:text-xl font-bold text-text">
                {language === 'ar'
                  ? 'الصفحة المطلوبة غير متوفرة'
                  : 'The page you requested could not be found'}
              </h2>
              <p className="text-sm text-text-muted leading-relaxed">
                {language === 'ar'
                  ? 'ربما تم نقل الصفحة أو تغيير الرابط الخاص بها، أو لم يتم تفعيلها بعد في المنظومة.'
                  : 'The link might be broken, or the page may have been moved to another section of the Nextal portal.'}
              </p>
            </div>

            {/* Action Button Back to Dashboard */}
            <div className="pt-4 flex justify-center">
              <Link
                id="back-to-dashboard-btn"
                href="/"
                className="inline-flex items-center justify-center rounded-control transition-all duration-200 select-none cursor-pointer bg-primary text-[var(--on-primary)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-pressed)] font-bold shadow-sm focus-visible:ring-2 focus-visible:ring-primary text-sm h-10 px-5 gap-2"
              >
                {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                <span>{language === 'ar' ? 'العودة إلى لوحة المؤشرات' : 'Return to Dashboard'}</span>
              </Link>
            </div>
          </div>
        </BentoTile>
      </div>
    </div>
  );
}
