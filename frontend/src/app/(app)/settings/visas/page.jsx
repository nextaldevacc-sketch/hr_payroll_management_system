'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, ArrowRight, Building2, Users, AlertCircle, RotateCcw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/context/LanguageContext';
import { RouteGuard } from '@/components/common/RouteGuard';
import { fetchCompanyProfile } from '@/services/settingsApi';

export default function SettingsVisasPage() {
  const { t, isRTL, language } = useLanguage();
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const { data: companyProfile = null, isLoading, isError, refetch } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanyProfile,
  });

  const visas = companyProfile?.visas || companyProfile?.company_visas || [];

  return (
    <RouteGuard area="settings">
      <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label={t('common.actions')}
            >
              <BackIcon className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-6 h-6 text-emerald-500" />
                {t('settings.visas.title')}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t('settings.visas.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/50 space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {language === 'ar' ? 'تعذر تحميل بيانات التأشيرات' : 'Failed to load company visas'}
            </p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : visas.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            {language === 'ar' ? 'لا توجد تأشيرات كيان مسجلة' : 'No company visas registered.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visas.map((v) => {
              const VISA_NAME_AR = {
                'Visa 01 (MOHRE Dubai)': 'تأشيرة 01 (وزارة الموارد البشرية دبي)',
                'Visa 02 (DIFC Freezone)': 'تأشيرة 02 (منطقة مركز دبي المالي العالمي)',
              };
              const displayName = language === 'ar' ? (v.name_ar || VISA_NAME_AR[v.name] || v.name) : v.name;
              const estId = v.mohre_employer_id || v.mol_establishment_id || '—';
              const routing = v.bank_routing_code || '—';
              const empCount = v.employee_count ?? v._count?.employees ?? 0;

              return (
                <div
                  key={v.id || v.name}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white" data-i18n-skip={language !== 'ar' || !v.name_ar}>
                          {displayName}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400" data-i18n-skip="true">
                          {estId}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {t('settings.visas.active')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">
                        {t('settings.visas.mohreEmployerId')}
                      </span>
                      <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold" data-i18n-skip="true">
                        {estId}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">
                        {t('settings.visas.bankRoutingCode')}
                      </span>
                      <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold" data-i18n-skip="true">
                        {routing}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">
                        {t('settings.visas.pensionFund')}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200" data-i18n-skip="true">
                        {v.pension_fund || (v.emirate === 'Abu Dhabi' ? 'ADPF' : 'GPSSA')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">
                        {t('settings.visas.employeeCount')}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1" data-i18n-skip="true">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {empCount}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </RouteGuard>
  );
}

