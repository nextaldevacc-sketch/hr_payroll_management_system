'use client';

import React from 'react';
import { ModulePlaceholder } from '../../../components/layout/ModulePlaceholder';
import { Wallet } from 'lucide-react';

export default function MyPayslipsPage() {
  return (
    <ModulePlaceholder
      titleEn="My Payslips"
      titleAr="مسيرات رواتبي"
      subtitleEn="View and download monthly payslips, earnings breakdowns and bank transfer receipts"
      subtitleAr="عرض وتحميل كشوف الرواتب الشهرية، تفاصيل المستحقات وإيصالات التحويل البنكي"
      phaseNumber={7}
      phaseNameEn="Self-Service + Live Dashboard"
      phaseNameAr="الخدمة الذاتية ولوحة المؤشرات المباشرة"
      specDescriptionEn="Employee self-service: View released payslips from locked runs, gross earnings, overtime breakdown, statutory deductions and net transfer confirmation."
      specDescriptionAr="الخدمة الذاتية للموظف: عرض كشوف الرواتب المعتمدة من المسيرات المغلقة، تفصيل الأجر الإجمالي، ساعات الإضافي، الاستقطاعات الصافية وإشعار التحويل."
      capabilitiesEn={[
        'Monthly Locked & Released Payslip Archive',
        'Transparent Breakdown: Basic + Allowances + OT',
        'Deduction Audit: Loans, Advances & Absences',
        'Official Downloadable PDF Payslip Generation',
        'Year-to-Date Earnings & Tax Exemption Summary'
      ]}
      capabilitiesAr={[
        'أرشيف كشوف الرواتب الصادرة والمعتمدة شهرياً',
        'تفصيل شفاف: الأساسي + البدلات + ساعات الإضافي',
        'كشف الاستقطاعات: السلف والقروض والغياب',
        'توليد كشف راتب رسمي بصيغة PDF للطباعة',
        'ملخص سنوي تراكمي للأجور والبدلات المصروفة'
      ]}
      icon={Wallet}
    />
  );
}
