'use client';

import React from 'react';
import { ModulePlaceholder } from '../../components/layout/ModulePlaceholder';
import { Users } from 'lucide-react';

export default function EmployeesPage() {
  return (
    <ModulePlaceholder
      titleEn="Employees"
      titleAr="الموظفون"
      subtitleEn="Employee master records, versioned contracts and document vault"
      subtitleAr="سجل الموظفين الشامل، إصدارات العقود المؤرخة والوثائق الرسمية"
      phaseNumber={4}
      phaseNameEn="Employees"
      phaseNameAr="الموظفون"
      specDescriptionEn="Employee master, departments, jobs, versioned contracts with salary history, bank and WPS details, and secure documents."
      specDescriptionAr="سجل الموظفين الشامل، الهيكل الإداري والوظائف، إصدارات العقود المؤرخة مع سجل الرواتب، وتفاصيل الحسابات البنكية ونظام حماية الأجور والوثائق الآمنة."
      capabilitiesEn={[
        'Employee List & 7-Tab Profile View',
        'Dated Contract Versions & Salary History',
        'Bank Details & WPS SIF Validation',
        'New Employee Onboarding Wizard',
        'UAE Visa & Emirates ID Record Linking'
      ]}
      capabilitiesAr={[
        'قائمة الموظفين وعرض الملف بسبعة تبويبات',
        'إصدارات العقود المؤرخة وسجل الرواتب التاريخي',
        'بيانات الحساب البنكي والتحقق من نظام حماية الأجور',
        'معالج إضافة وتسجيل موظف جديد',
        'ربط وثائق الإقامة والهوية الإماراتية بالملف'
      ]}
      icon={Users}
    />
  );
}
