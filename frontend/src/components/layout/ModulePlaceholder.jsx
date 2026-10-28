'use client';

import React from 'react';
import Link from 'next/link';
import { BentoTile } from '../primitives/BentoTile';
import { IconWell } from '../primitives/IconWell';
import { InsetBox } from '../primitives/InsetBox';
import { Button } from '../primitives/form/Button';
import { useLanguage } from '../../context/LanguageContext';
import { ArrowLeft, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export function ModulePlaceholder({
  titleEn,
  titleAr,
  subtitleEn,
  subtitleAr,
  phaseNumber,
  phaseNameEn,
  phaseNameAr,
  specDescriptionEn,
  specDescriptionAr,
  capabilitiesEn = [],
  capabilitiesAr = [],
  icon: Icon = Sparkles,
}) {
  const { language, isRTL } = useLanguage();

  const title = language === 'ar' ? titleAr : titleEn;
  const subtitle = language === 'ar' ? subtitleAr : subtitleEn;
  const phaseName = language === 'ar' ? phaseNameAr : phaseNameEn;
  const description = language === 'ar' ? specDescriptionAr : specDescriptionEn;
  const capabilities = language === 'ar' ? capabilitiesAr : capabilitiesEn;

  return (
    <div className="space-y-6 lg:space-y-8 animate-fadeIn pb-12">
      {/* Page Title & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <span className="text-[11px] uppercase tracking-wider font-bold text-text-muted">
            {language === 'ar' ? 'منصة نكستال لإدارة الموارد البشرية والرواتب' : 'Nextal HR & Payroll Enterprise'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text gold-heading mt-1">
            {title}
          </h1>
          <p className="text-xs text-text-muted mt-1">
            {subtitle}
          </p>
        </div>

        <Link
          href="/"
          className="btn-outline-custom inline-flex items-center justify-center rounded-control transition-all duration-200 select-none cursor-pointer text-xs h-8 px-3 gap-1.5 focus-visible:ring-2 focus-visible:ring-primary"
        >
          {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>{language === 'ar' ? 'العودة إلى لوحة المؤشرات' : 'Back to Dashboard'}</span>
        </Link>
      </div>

      {/* Hero Bento Tile Empty State */}
      <div className="grid grid-cols-1 max-w-4xl">
        <BentoTile
          id="module-placeholder-tile"
          title={title}
          subtitle={language === 'ar' ? 'وحدة نظام متوافقة مع قانون العمل الإماراتي' : 'UAE Labour Law Statutory Module'}
          badge={
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-extrabold bg-primary-wash text-primary border border-primary/20">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              {language === 'ar'
                ? `مخطط للتنفيذ في المرحلة ${phaseNumber}: ${phaseName}`
                : `Planned for Phase ${phaseNumber}: ${phaseName}`}
            </span>
          }
          iconWell={
            <IconWell size="lg" shape="square" color="primary">
              <Icon className="w-6 h-6 text-primary stroke-[2]" />
            </IconWell>
          }
        >
          <div className="space-y-6 py-2">
            {/* Core Capability Summary from Spec Section 6 */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                {language === 'ar' ? 'الوظائف ونطاق العمل المعتمد' : 'Module Scope & Regulatory Mandate'}
              </span>
              <p className="text-sm md:text-base text-text leading-relaxed font-medium">
                {description}
              </p>
            </div>

            {/* Inset Box: Architectural Foundations Ready */}
            <InsetBox className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-secondary-text">
                <CheckCircle2 className="w-4 h-4 text-secondary flex-shrink-0" />
                <span>
                  {language === 'ar'
                    ? 'قاعدة البيانات ونموذج العزل والتدقيق الأمني مكتمل (المرحلة 1)'
                    : 'Phase 1 Foundations Complete (Database Schema, Multi-Tenant Isolation & Audit Log Active)'}
                </span>
              </div>

              {capabilities.length > 0 && (
                <div className="pt-2 border-t border-border/40">
                  <span className="text-[11px] text-text-muted block mb-2 font-semibold">
                    {language === 'ar' ? 'الميزات القادمة في هذه المرحلة:' : 'Upcoming Capabilities in this Phase:'}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {capabilities.map((cap, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-black/5 dark:bg-inset text-text border border-border/50"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </InsetBox>
          </div>
        </BentoTile>
      </div>
    </div>
  );
}
