'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  Wallet,
  Clock,
  FileText,
  Send,
  User,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CalendarCheck,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { IconWell } from '@/components/primitives/IconWell';
import { Button } from '@/components/primitives/form/Button';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { getMyHome } from '@/services/meApi';
import { formatCurrency } from '@nextal/shared';

const AR_MONTHS = {
  January: 'يناير', February: 'فبراير', March: 'مارس', April: 'أبريل',
  May: 'مايو', June: 'يونيو', July: 'يوليو', August: 'أغسطس',
  September: 'سبتمبر', October: 'أكتوبر', November: 'نوفمبر', December: 'ديسمبر',
};

function formatMonthYear(str, lang) {
  if (!str || lang !== 'ar') return str;
  let res = str;
  for (const [en, ar] of Object.entries(AR_MONTHS)) {
    res = res.replace(en, ar);
  }
  return res;
}

export default function MyHomePage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await getMyHome();
        if (res) setData(res);
      } catch (err) {
        console.warn('Failed to load My Home data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const displayName = language === 'ar'
    ? (user?.arabic_name || user?.employee?.arabic_name || user?.name || user?.employee?.name || 'الموظف')
    : (user?.name || user?.employee?.name || 'Employee');

  const leave = {
    annualRemaining: data?.leaveBalance?.annualRemaining ?? 0,
    annualAllocated: data?.leaveBalance?.annualAllocated ?? 0,
    annualTaken: data?.leaveBalance?.annualTaken ?? 0,
  };
  const payday = data?.payday || { lastNetPay: null, lastPayMonth: null, nextPayday: null };
  const attendance = data?.attendanceSummary || { presentDays: 0, lateDays: 0, absentDays: 0, totalHoursWorked: 0 };

  return (
    <div id="my-home-container" className="space-y-6 animate-fadeIn pb-12 max-w-full overflow-x-hidden">
      {/* Welcome Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-primary-wash via-white/40 to-secondary-wash dark:from-primary/10 dark:via-transparent dark:to-secondary/5 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-bold text-primary block">
            {language === 'ar' ? 'بوابة الخدمة الذاتية للموظف' : 'Employee Self-Service Portal'}
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-text mt-1">
            {language === 'ar' ? `مرحباً، ${displayName}` : `Welcome back, ${displayName}`}
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            {language === 'ar'
              ? 'نظرة عامة سريعة على رصيد إجازاتك، حضورك، قسائم رواتبك ووثائقك'
              : 'Quick overview of your leave balance, attendance summary, payslips, and documents'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            icon={<Send className="w-3.5 h-3.5" />}
            onClick={() => router.push('/me/requests')}
          >
            {language === 'ar' ? 'تقديم طلب' : 'New Request'}
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon={<Wallet className="w-3.5 h-3.5" />}
            onClick={() => router.push('/me/payslips')}
          >
            {language === 'ar' ? 'عرض الرواتب' : 'My Payslips'}
          </Button>
        </div>
      </div>

      {/* Bento Grid Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Tile 1: Leave Balance */}
        <div className="glass-panel p-5 rounded-2xl border border-border flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-text-muted uppercase">
                {language === 'ar' ? 'رصيد الإجازة السنوية' : 'Annual Leave Balance'}
              </span>
              <IconWell size="sm" shape="square" color="primary">
                <CalendarDays className="w-4 h-4" />
              </IconWell>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-text tabular-nums">{leave.annualRemaining}</span>
              <span className="text-xs text-text-muted font-semibold">
                {language === 'ar' ? `من أصل ${leave.annualAllocated} يوماً` : `of ${leave.annualAllocated} days`}
              </span>
            </div>
            <div className="w-full bg-border/40 h-2 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${leave.annualAllocated > 0 ? Math.min(100, Math.round((leave.annualRemaining / leave.annualAllocated) * 100)) : 0}%` }}
              />
            </div>
            <p className="text-[11px] text-text-muted mt-2">
              {language === 'ar' ? `المستهلك هذا العام: ${leave.annualTaken} أيام` : `Utilized this year: ${leave.annualTaken} days`}
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-border/40 flex justify-between items-center">
            <Link href="/me/leave" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              <span>{language === 'ar' ? 'تفاصيل الرصيد والتقديم' : 'Apply & View Accruals'}</span>
              <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </Link>
          </div>
        </div>

        {/* Tile 2: Next Payday / Last Net Pay */}
        <div className="glass-panel p-5 rounded-2xl border border-border flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-text-muted uppercase">
                {language === 'ar' ? 'آخر راتب مستلم / القادم' : 'Last Pay / Next Payday'}
              </span>
              <IconWell size="sm" shape="square" color="success">
                <Wallet className="w-4 h-4 text-emerald-500" />
              </IconWell>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-text tabular-nums">
                {payday.lastNetPay ? formatCurrency(String(payday.lastNetPay).replace(/,/g, ''), 'AED', language) : '—'}
              </span>
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-1">
              {payday.lastPayMonth ? `${language === 'ar' ? 'مسير شهر' : 'Released for'} ${formatMonthYear(payday.lastPayMonth, language)}` : 'No paid runs yet'}
            </span>
            <div className="mt-3 p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border/50 text-xs flex justify-between items-center">
              <span className="text-text-muted">{language === 'ar' ? 'يوم الصرف القادم:' : 'Next Expected Payday:'}</span>
              <span className="font-bold text-text">{payday.nextPayday}</span>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-border/40 flex justify-between items-center">
            <Link href="/me/payslips" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              <span>{language === 'ar' ? 'سجل قسائم الرواتب' : 'View All Payslips'}</span>
              <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </Link>
          </div>
        </div>

        {/* Tile 3: Attendance Summary This Month */}
        <div className="glass-panel p-5 rounded-2xl border border-border flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-text-muted uppercase">
                {language === 'ar' ? 'حضور الشهر الحالي' : "This Month's Attendance"}
              </span>
              <IconWell size="sm" shape="square" color="primary">
                <Clock className="w-4 h-4" />
              </IconWell>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 block tabular-nums">
                  {attendance.presentDays}
                </span>
                <span className="text-[10px] text-text-muted block mt-0.5">
                  {language === 'ar' ? 'حاضر' : 'Present'}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-xl font-bold text-amber-600 dark:text-amber-400 block tabular-nums">
                  {attendance.lateDays}
                </span>
                <span className="text-[10px] text-text-muted block mt-0.5">
                  {language === 'ar' ? 'تأخير' : 'Late'}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <span className="text-xl font-bold text-rose-600 dark:text-rose-400 block tabular-nums">
                  {attendance.absentDays}
                </span>
                <span className="text-[10px] text-text-muted block mt-0.5">
                  {language === 'ar' ? 'غياب' : 'Absent'}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-text-muted mt-3 text-center">
              {language === 'ar'
                ? `إجمالي ساعات العمل المسجلة: ${attendance.totalHoursWorked} ساعة`
                : `Total recorded work: ${attendance.totalHoursWorked} hours`}
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-border/40 flex justify-between items-center">
            <Link href="/me/attendance" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              <span>{language === 'ar' ? 'التقويم وطلب بصمة مفقودة' : 'Calendar & Missing Punch'}</span>
              <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </Link>
          </div>
        </div>

        {/* Tile 4: Pending Requests */}
        <div className="glass-panel p-5 rounded-2xl border border-border flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-text-muted uppercase">
                {language === 'ar' ? 'طلباتي المعلقة' : 'Pending Requests'}
              </span>
              <IconWell size="sm" shape="square" color="primary">
                <Send className="w-4 h-4" />
              </IconWell>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-text tabular-nums">
                {data?.pendingRequestsCount || 0}
              </span>
              <span className="text-xs text-text-muted font-semibold">
                {language === 'ar' ? 'طلب قيد المراجعة' : 'requests under review'}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-2">
              {language === 'ar'
                ? 'تشمل طلبات الإجازات والعمل الإضافي وتعديل البصمة'
                : 'Includes leave, overtime and missing punch requests waiting for approval'}
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-border/40 flex justify-between items-center">
            <Link href="/me/requests" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              <span>{language === 'ar' ? 'متابعة وإلغاء الطلبات' : 'Track & Cancel Requests'}</span>
              <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </Link>
          </div>
        </div>

        {/* Tile 5: Documents Expiring */}
        <div className="glass-panel p-5 rounded-2xl border border-border flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-text-muted uppercase">
                {language === 'ar' ? 'صلاحية الوثائق' : 'Document Expiries'}
              </span>
              <IconWell size="sm" shape="square" color="warning">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </IconWell>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-text tabular-nums">
                {data?.expiringDocumentsCount || 0}
              </span>
              <span className="text-xs text-text-muted font-semibold">
                {language === 'ar' ? 'وثيقة قريبة الانتهاء' : 'expiring within 90 days'}
              </span>
            </div>
            {data?.expiringDocuments?.length > 0 ? (
              <div className="mt-2 space-y-1">
                {data.expiringDocuments.slice(0, 2).map((d) => (
                  <div key={d.id} className="text-xs flex justify-between items-center text-text-muted">
                    <span>{d.docType}</span>
                    <span className="font-semibold text-danger">{language === 'ar' ? `متبقي ${d.daysLeft} يوم` : `${d.daysLeft}d left`}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {language === 'ar' ? 'كافة وثائقك سارية المفعول' : 'All official documents are valid'}
              </p>
            )}
          </div>
          <div className="pt-4 mt-4 border-t border-border/40 flex justify-between items-center">
            <Link href="/me/documents" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              <span>{language === 'ar' ? 'رفع وثيقة مجددة' : 'Upload Renewed Document'}</span>
              <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </Link>
          </div>
        </div>

        {/* Tile 6: My Profile Overview */}
        <div className="glass-panel p-5 rounded-2xl border border-border flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-text-muted uppercase">
                {language === 'ar' ? 'بياناتي الرسمية' : 'Official Profile'}
              </span>
              <IconWell size="sm" shape="square" color="primary">
                <User className="w-4 h-4" />
              </IconWell>
            </div>
            <p className="text-sm font-bold text-text truncate">{displayName}</p>
            <p className="text-xs text-text-muted mt-0.5">{user?.email}</p>
            <p className="text-[11px] text-text-muted mt-2">
              {language === 'ar'
                ? 'عرض تفاصيل العقد، الحساب المصرفي، والبيانات الرسمية المحمية'
                : 'View verified contract, bank IBAN, and masked identity credentials'}
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-border/40 flex justify-between items-center">
            <Link href="/me/profile" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              <span>{language === 'ar' ? 'عرض الملف الشخصي' : 'View Full Profile'}</span>
              <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

