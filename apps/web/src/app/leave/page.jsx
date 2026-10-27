'use client';

import React from 'react';
import { ModulePlaceholder } from '../../components/layout/ModulePlaceholder';
import { CalendarDays } from 'lucide-react';

export default function LeavePage() {
  return (
    <ModulePlaceholder
      titleEn="Leave & Holidays"
      titleAr="الإجازات والعطلات"
      subtitleEn="UAE statutory leave entitlement, accrual engine, approvals and holiday calendar"
      subtitleAr="استحقاقات الإجازات وفق قانون العمل الإماراتي، محرك التراكم والتقويم الرسمي"
      phaseNumber={5}
      phaseNameEn="Attendance, OT & Leave"
      phaseNameAr="الحضور والعمل الإضافي والإجازات"
      specDescriptionEn="Requests, multi-level and GM approval, balances and accruals, holidays."
      specDescriptionAr="طلبات الإجازة، مسارات الاعتماد متعددة المستويات وموافقة المدير العام، أرصدة واستحقاقات الإجازات، والعطلات الرسمية."
      capabilitiesEn={[
        'Leave Requests & Multi-Step Approval Inbox',
        'Leave Balances & Accruals Engine',
        'UAE Statutory Sick, Maternity & Bereavement Leave',
        'UAE Public Holiday Calendar Management',
        'Real-Time Balance & Carry-Over Calculation'
      ]}
      capabilitiesAr={[
        'صندوق طلبات الإجازات ومسار الاعتماد متعدد المستويات',
        'محرك احتساب أرصدة واستحقاقات الإجازات',
        'إجازات المرض، الأمومة، والحداد القانونية الإلزامية',
        'إدارة تقويم العطلات الرسمية المعتمدة لدولة الإمارات',
        'احتساب الأرصدة التراكمية وترحيل الإجازات تلقائياً'
      ]}
      icon={CalendarDays}
    />
  );
}
