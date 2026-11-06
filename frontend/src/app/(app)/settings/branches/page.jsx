'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, ArrowLeft, ArrowRight, Building, Users, AlertCircle, RotateCcw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/context/LanguageContext';
import { RouteGuard } from '@/components/common/RouteGuard';
import { fetchBranches } from '@/services/settingsApi';

export default function SettingsBranchesPage() {
  const { t, isRTL, language } = useLanguage();
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const { data: branches = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['settings', 'branches'],
    queryFn: fetchBranches,
  });

  const VISA_NAME_AR = {
    'Visa 01 (MOHRE Dubai)': 'تأشيرة 01 (وزارة الموارد البشرية دبي)',
    'Visa 02 (DIFC Freezone)': 'تأشيرة 02 (منطقة مركز دبي المالي العالمي)',
  };

  const branchesByVisa = React.useMemo(() => {
    const groups = new Map();
    for (const b of (Array.isArray(branches) ? branches : [])) {
      const rawVisaName = b.company_visa_name || b.company_visa?.name || 'Company Visa';
      const visaName = language === 'ar'
        ? (b.company_visa_name_ar || b.company_visa?.name_ar || VISA_NAME_AR[rawVisaName] || rawVisaName)
        : rawVisaName;
      const estId = b.mol_establishment_id || b.company_visa?.mol_establishment_id;
      const key = b.company_visa_id || b.company_visa?.id || rawVisaName;
      const heading = estId ? `${visaName} — ${estId}` : visaName;
      if (!groups.has(key)) {
        groups.set(key, { key, heading, list: [] });
      }
      groups.get(key).list.push(b);
    }
    return Array.from(groups.values());
  }, [branches, language]);

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
                <MapPin className="w-6 h-6 text-indigo-500" />
                {t('settings.branches.title')}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t('settings.branches.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/50 space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {language === 'ar' ? 'تعذر تحميل بيانات الفروع' : 'Failed to load branches'}
            </p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : branchesByVisa.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            {language === 'ar' ? 'لا توجد فروع مسجلة' : 'No branches configured.'}
          </div>
        ) : (
          <div className="space-y-8">
            {branchesByVisa.map((group) => (
              <div key={group.key} className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <Building className="w-4 h-4 text-indigo-500" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300" data-i18n-skip>
                    {group.heading}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.list.map((b) => {
                    const displayName = language === 'ar' && b.name_ar ? b.name_ar : b.name;
                    const displayEmirate = language === 'ar'
                      ? t(`settings.branches.emirates.${b.emirate}`, b.emirate)
                      : b.emirate;
                    const empCount = b.active_employee_count ?? b.employee_count ?? 0;

                    return (
                      <div
                        key={b.id || b.name}
                        className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                              <Building className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900 dark:text-white" data-i18n-skip={language !== 'ar' || !b.name_ar}>
                                {displayName}
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {displayEmirate}
                              </p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            {t('settings.branches.active')}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">
                              {t('settings.branches.emirate')}
                            </span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {displayEmirate}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">
                              {t('settings.branches.employeeCount')}
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
              </div>
            ))}
          </div>
        )}
      </div>
    </RouteGuard>
  );
}

