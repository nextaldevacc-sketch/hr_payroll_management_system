'use client';

import React from 'react';
import { ModulePlaceholder } from '../../../components/layout/ModulePlaceholder';
import { CalendarDays } from 'lucide-react';

export default function MyLeavePage() {
  return (
    <ModulePlaceholder
      titleEn="My Leave Balance"
      titleAr="رصيد إجازاتي"
      subtitleEn="Real-time statutory leave entitlements, monthly accruals, used days and pending requests"
      subtitleAr="أرصدة الإجازات القانونية، الاستحقاقات الشهرية المتراكمة والأيام المستهلكة والطلبات"
      phaseNumber={7}
      phaseNameEn="Self-Service + Live Dashboard"
      phaseNameAr="الخدمة الذاتية ولوحة المؤشرات المباشرة"
      specDescriptionEn="Employee self-service: View annual leave balance, monthly accrual progress, statutory sick and maternity balances, and submit leave requests."
      specDescriptionAr="الخدمة الذاتية للموظف: عرض رصيد الإجازات السنوية، متابعة تراكم الأيام الشهري، أرصدة إجازات المرض والأمومة القانونية، وتقديم طلبات الإجازة."
      capabilitiesEn={[
        'Annual Leave Live Available Balance & Accrual',
        'Statutory Sick Leave Quota Tracking (Full / Half / Unpaid)',
        'Public Holiday Calendar Integration',
        'Leave Request History & Manager Approval Status',
        'Direct Link to Submit New Leave Application'
      ]}
      capabilitiesAr={[
        'رصيد الإجازات السنوية الفعلي ومعدل التراكم الشهري',
        'متابعة حصة الإجازات المرضية القانونية (كامل/نصف/بدون راتب)',
        'الربط التلقائي مع تقويم العطلات الرسمية المعتمدة',
        'سجل طلبات الإجازات ومتابعة حالة اعتماد المديرين',
        'رابط مباشر وسريع لتقديم طلب إجازة جديد'
      ]}
      icon={CalendarDays}
    />
  );
}
