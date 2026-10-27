'use client';

import React from 'react';
import { ModulePlaceholder } from '../../components/layout/ModulePlaceholder';
import { BarChart3 } from 'lucide-react';

export default function ReportsPage() {
  return (
    <ModulePlaceholder
      titleEn="Reports & Integrations"
      titleAr="التقارير والتصدير المالي"
      subtitleEn="Payroll registers, variance analytics, statutory liabilities and accounting exports"
      subtitleAr="سجلات الرواتب، تحليلات التباين، المخصصات المالية وتصدير القيود المحاسبية"
      phaseNumber={9}
      phaseNameEn="Compliance, Reports & Audit"
      phaseNameAr="الامتثال والتقارير والتدقيق"
      specDescriptionEn="Payment files, month-end checks and reports."
      specDescriptionAr="ملفات الصرف، تدقيقات وتقارير نهاية الشهر المحاسبية."
      capabilitiesEn={[
        'Payroll Register with Departmental Cost Breakdown',
        'Monthly Payroll Variance Report with Threshold Highlighting',
        'Gratuity & Annual Leave Accrued Liability Provisions',
        'Attendance & Leave Utilization Analytics',
        'Accounting General Ledger Journal CSV Export'
      ]}
      capabilitiesAr={[
        'سجل الرواتب التفصيلي مع توزيع مراكز التكلفة والأقسام',
        'تقرير تباين الرواتب الشهري مع إبراز الفروقات الكبرى',
        'مخصصات مكافأة نهاية الخدمة والتزامات الإجازات المتراكمة',
        'تحليلات استهلاك الإجازات ومعدلات الانضباط وساعات العمل',
        'تصدير قيود اليومية العامة بتنسيق CSV للأنظمة المحاسبية'
      ]}
      icon={BarChart3}
    />
  );
}
