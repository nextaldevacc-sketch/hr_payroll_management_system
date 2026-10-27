'use client';

import React from 'react';
import { ModulePlaceholder } from '../../../components/layout/ModulePlaceholder';
import { CalendarCheck } from 'lucide-react';

export default function MyAttendancePage() {
  return (
    <ModulePlaceholder
      titleEn="My Attendance"
      titleAr="سجل حضوري"
      subtitleEn="Daily biometric punches, assigned shift hours, break times and working hours history"
      subtitleAr="بصمات الحضور والانصراف اليومية، مواعيد الوردية المعتمدة وسجل ساعات العمل"
      phaseNumber={7}
      phaseNameEn="Self-Service + Live Dashboard"
      phaseNameAr="الخدمة الذاتية ولوحة المؤشرات المباشرة"
      specDescriptionEn="Employee self-service: View check-in and check-out punches, shift timings, overtime hours recorded, and request missing punch corrections."
      specDescriptionAr="الخدمة الذاتية للموظف: عرض بصمات الحضور والانصراف، مواعيد الورديات، ساعات العمل الإضافي المسجلة، وتقديم طلبات تعديل البصمات المفقودة."
      capabilitiesEn={[
        'Daily Punch-In & Punch-Out Timeline',
        'Shift Schedule & Weekly Rest Days Calendar',
        'Lateness & Early Exit Grace Tracking',
        'One-Click Missing Punch Correction Request',
        'Monthly Total Hours & Punctuality Summary'
      ]}
      capabilitiesAr={[
        'الجدول الزمني لحركات الدخول والخروج اليومية',
        'جدول الوردية المعتمدة ومواعيد الراحة الأسبوعية',
        'متابعة فترات السماح للتأخير أو الخروج المبكر',
        'تقديم طلب تصحيح بصمة مفقودة بنقرة واحدة',
        'ملخص إجمالي ساعات العمل ومؤشر الانضباط الشهري'
      ]}
      icon={CalendarCheck}
    />
  );
}
