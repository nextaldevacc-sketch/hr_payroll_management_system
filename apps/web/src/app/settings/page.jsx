'use client';

import React from 'react';
import { ModulePlaceholder } from '../../components/layout/ModulePlaceholder';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <ModulePlaceholder
      titleEn="Settings"
      titleAr="الإعدادات"
      subtitleEn="Organization structure, salary rule builder, shifts, approval workflows and roles"
      subtitleAr="الهيكل التنظيمي، قواعد الرواتب، سياسات الورديات ومسارات الموافقة"
      phaseNumber={3}
      phaseNameEn="Settings"
      phaseNameAr="الإعدادات"
      specDescriptionEn="Setup tables, edited by the company admin."
      specDescriptionAr="جداول التكوين والإعداد، يتم إدارتها وتخصيصها بواسطة مدير الشركة."
      capabilitiesEn={[
        'Company Profile & Company Visa Entities',
        'Branches, Departments & Job Positions',
        'Shift Schedules & Lateness Penalty Steps',
        'Salary Rules, Codes & Structure Formulas',
        'Multi-Tier Approval Step Matrix'
      ]}
      capabilitiesAr={[
        'ملف الشركة ورخص وتأشيرات الكيانات التابعة',
        'الفروع، الأقسام الإدارية، والمسميات الوظيفية',
        'جداول الورديات وتدرج جزاءات التأخير والخروج',
        'قواعد ورموز وصيغ هياكل الرواتب المخصصة',
        'مصفوفة خطوات وصلاحيات الاعتماد والموافقة'
      ]}
      icon={Settings}
    />
  );
}
