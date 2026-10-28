'use client';

import React from 'react';
import { ModulePlaceholder } from '../../../components/layout/ModulePlaceholder';
import { User } from 'lucide-react';

export default function MyProfilePage() {
  return (
    <ModulePlaceholder
      titleEn="My Profile"
      titleAr="ملفي الشخصي"
      subtitleEn="View personal details, employment contract terms, and official company records"
      subtitleAr="عرض البيانات الشخصية، بنود عقد العمل، والبيانات الرسمية المعتمدة"
      phaseNumber={7}
      phaseNameEn="Self-Service + Live Dashboard"
      phaseNameAr="الخدمة الذاتية ولوحة المؤشرات المباشرة"
      specDescriptionEn="Employee self-service: My Profile, My Payslips, My Attendance, My Leave Balance, My Requests and My Documents use the same screens, filtered to the logged-in employee."
      specDescriptionAr="الخدمة الذاتية للموظف: ملفي الشخصي، مسيرات رواتبي، حضوري، رصيد إجازاتي، طلباتي ووثائقي تستخدم نفس شاشات النظام، مصفاة للموظف المسجل فقط."
      capabilitiesEn={[
        'Personal Identity & Contact Information',
        'Job Position, Department & Reporting Line',
        'Active Contract Effective Terms & Grade',
        'Registered Salary Bank Account & IBAN Details',
        'Audit Log of Profile Information Updates'
      ]}
      capabilitiesAr={[
        'الهوية الشخصية وبيانات التواصل المعتمدة',
        'المسمى الوظيفي والقسم والمدير المسؤول المباشر',
        'شروط العقد الساري وتاريخ التعيين والدرجة',
        'بيانات الحساب المصرفي والآيبان المعتمد لتحويل الراتب',
        'سجل التدقيق لكافة التحديثات المعتمدة على الملف'
      ]}
      icon={User}
    />
  );
}
