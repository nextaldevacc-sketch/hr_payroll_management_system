'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  CalendarDays,
  Inbox,
  Award,
  Calendar,
  Sparkles,
} from 'lucide-react';
import LeaveRequestsFeature from '@/components/features/leave/LeaveRequestsFeature';
import LeaveBalancesFeature from '@/components/features/leave/LeaveBalancesFeature';
import PublicHolidayCalendarFeature from '@/components/features/holidays/PublicHolidayCalendarFeature';
import { RouteGuard } from '@/components/common/RouteGuard';

export default function LeavePage() {
  const { user, language, canAccess } = useAuth();
  const canViewHolidays = canAccess('settings', 'view') || (user?.roles || []).includes('HR_OFFICER');
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'inbox' | 'balances' | 'holidays'

  return (
    <RouteGuard area="leave">
      <div className="space-y-6 max-w-7xl mx-auto pb-12 w-full max-w-full overflow-x-hidden" data-testid="leave-page">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-text tracking-tight flex items-center gap-2.5">
            <CalendarDays className="w-6 h-6 text-primary" />
            <span>{isAr ? 'إدارة الإجازات والأرصدة والعطلات الرسمية' : 'Leave, Accruals & Public Holidays'}</span>
          </h1>
          <p className="text-xs text-text-muted mt-1">
            {isAr
              ? 'وفق قانون العمل الإماراتي: استبعاد العطلات من الخصم، تدرج الإجازة المرضية (15 كامل / 30 نصف / 45 بدون أجر)، وترحيل الأرصدة'
              : 'UAE Labour Law statutory compliance: weekends/holidays excluded from deduction, 3-band sick leave progression, and multi-tier approval.'}
          </p>
        </div>

        {/* Navigation Tabs */}
        <div role="tablist" className="flex items-center gap-1.5 bg-surface/80 border border-border/80 p-1 rounded-2xl text-xs backdrop-blur-md overflow-x-auto max-w-full">
          <button
            type="button"
            id="tab-leave-requests"
            data-testid="tab-leave-requests"
            role="tab"
            aria-selected={activeTab === 'requests'}
            onClick={() => setActiveTab('requests')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 ${
              activeTab === 'requests'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>{isAr ? 'طلبات الإجازة' : 'Leave Requests'}</span>
          </button>

          <button
            type="button"
            id="tab-approval-inbox"
            data-testid="tab-approval-inbox"
            role="tab"
            aria-selected={activeTab === 'inbox'}
            onClick={() => setActiveTab('inbox')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 ${
              activeTab === 'inbox'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>{isAr ? 'صندوق الاعتماد' : 'Approval Inbox'}</span>
          </button>

          <button
            type="button"
            id="tab-leave-balances"
            data-testid="tab-leave-balances"
            role="tab"
            aria-selected={activeTab === 'balances'}
            onClick={() => setActiveTab('balances')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 ${
              activeTab === 'balances'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>{isAr ? 'الأرصدة والاستحقاقات' : 'Statutory Balances'}</span>
          </button>

          {canViewHolidays && (
          <button
            type="button"
            id="tab-public-holidays"
            data-testid="tab-public-holidays"
            role="tab"
            aria-selected={activeTab === 'holidays'}
            onClick={() => setActiveTab('holidays')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 ${
              activeTab === 'holidays'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{isAr ? 'العطلات الرسمية' : 'Public Holidays'}</span>
          </button>
          )}
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'requests' && <LeaveRequestsFeature activeTab="all" />}
      {activeTab === 'inbox' && <LeaveRequestsFeature activeTab="inbox" />}
      {activeTab === 'balances' && <LeaveBalancesFeature />}
      {activeTab === 'holidays' && canViewHolidays && <PublicHolidayCalendarFeature />}
    </div>
  </RouteGuard>
);
}
