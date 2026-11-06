'use client';

import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { ShieldAlert, Lock } from 'lucide-react';

export function PlatformCompaniesFeature() {
  const { locale } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="p-8 rounded-2xl border border-border bg-surface text-center max-w-2xl mx-auto my-12 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-text mb-2">
          {locale === 'ar' ? 'إدارة المنصة غير مفعلة في هذا الإصدار' : 'Platform Administration Disabled'}
        </h2>
        <p className="text-sm text-text-muted mb-6">
          {locale === 'ar'
            ? 'إدارة الشركات المتعددة وعمليات المنصة معطلة في هذا الإصدار المستقر. يرجى التواصل مع إدارة النظام لأي تعديلات مؤسسية.'
            : 'Multi-tenant platform administration is disabled in this release. Contact system administration for tenant management and support access.'}
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-raised border border-border text-text-muted">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
          <span>{locale === 'ar' ? 'ميزة مقفلة حالياً' : 'Feature currently disabled'}</span>
        </div>
      </div>
    </div>
  );
}

export default PlatformCompaniesFeature;
