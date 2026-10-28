'use client';

import React from 'react';
import { ModulePlaceholder } from '../../components/layout/ModulePlaceholder';
import { Banknote } from 'lucide-react';

export default function PayrollPage() {
  return (
    <ModulePlaceholder
      titleEn="Payroll & WPS"
      titleAr="الرواتب ونظام حماية الأجور"
      subtitleEn="End-to-end UAE payroll calculation, variance analysis, GM approval and WPS SIF generation"
      subtitleAr="احتساب مسير الرواتب الإماراتي، تحليل الفروقات، موافقة المدير العام وملف WPS"
      phaseNumber={6}
      phaseNameEn="Payroll"
      phaseNameAr="الرواتب والأجور"
      specDescriptionEn="Cut-off, validation, calculation, variance review, approval, locking and corrections."
      specDescriptionAr="تاريخ الإغلاق، التدقيق المسبق، الاحتساب، مراجعة الفروقات، الموافقة، الإغلاق المحكم وإصدار كشوفات التصحيح."
      capabilitiesEn={[
        'Pay Run Lifecycle: Draft → Calc → Valid → Lock → Paid',
        'Pre-Run Validation & IBAN / Labour Card Error Checks',
        'Variance Report vs Previous Month with Justifications',
        'Salary Adjustments (Loans, Advances, Bonuses, Deductions)',
        'MOHRE Compliant WPS SIF Generation (EDR & SCR Records)'
      ]}
      capabilitiesAr={[
        'دورة حياة المسير: مسودة ← احتساب ← تدقيق ← إغلاق ← دفع',
        'التدقيق المسبق وفحص أخطاء الآيبان وبطاقات العمل المانعة',
        'تقرير تباين الرواتب مقارنة بالشهر السابق مع التبريرات',
        'التسويات المالية (السلف، القروض، المكافآت، والاستقطاعات)',
        'توليد ملف حماية الأجور المتوافق مع الوزارة (سجلات EDR و SCR)'
      ]}
      icon={Banknote}
    />
  );
}
