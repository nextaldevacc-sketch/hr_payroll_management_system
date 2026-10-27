'use client';

import React from 'react';
import { ModulePlaceholder } from '../../components/layout/ModulePlaceholder';
import { Clock } from 'lucide-react';

export default function AttendancePage() {
  return (
    <ModulePlaceholder
      titleEn="Attendance & Shifts"
      titleAr="الحضور والورديات"
      subtitleEn="Biometric punch import, shift rosters, overtime requests and attendance sign-off"
      subtitleAr="استيراد بصمات الحضور، جداول الورديات، طلبات الإضافي واعتماد الحضور الشهري"
      phaseNumber={5}
      phaseNameEn="Attendance, OT & Leave"
      phaseNameAr="الحضور والعمل الإضافي والإجازات"
      specDescriptionEn="Punches, exceptions, late and early-out penalties, overtime requests, manager and HR sign-off."
      specDescriptionAr="سجلات البصمة، استثناءات الحضور، جزاءات التأخير والخروج المبكر، طلبات العمل الإضافي، واعتماد المديرين والموارد البشرية."
      capabilitiesEn={[
        'Daily Attendance Grid (Cell Edit with Audit)',
        'Biometric File Import & Punch Processing',
        'Missing Punch Queue & Exception Management',
        'Overtime Requests (Normal, Night, Rest, Holiday)',
        'Manager & HR Monthly Attendance Sign-Off'
      ]}
      capabilitiesAr={[
        'شبكة الحضور اليومية مع التعديل الموثق بالتدقيق',
        'استيراد ومعالجة ملفات أجهزة البصمة',
        'طابور استثناءات البصمات الفردية المفقودة',
        'طلبات العمل الإضافي (عادي، ليلي، راحة، عطلة رسمية)',
        'اعتماد مسؤولي الأقسام والموارد البشرية الشهري'
      ]}
      icon={Clock}
    />
  );
}
