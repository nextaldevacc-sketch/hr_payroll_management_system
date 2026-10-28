'use client';

import React from 'react';
import { ModulePlaceholder } from '../../../components/layout/ModulePlaceholder';
import { Send } from 'lucide-react';

export default function MyRequestsPage() {
  return (
    <ModulePlaceholder
      titleEn="My Requests"
      titleAr="طلباتي"
      subtitleEn="Submit and track leave, overtime, attendance adjustments and HR requests in real time"
      subtitleAr="تقديم ومتابعة طلبات الإجازات والعمل الإضافي وتعديل البصمات والطلبات الإدارية"
      phaseNumber={7}
      phaseNameEn="Self-Service + Live Dashboard"
      phaseNameAr="الخدمة الذاتية ولوحة المؤشرات المباشرة"
      specDescriptionEn="Employee self-service: My Requests (leave, overtime and missing-punch requests) use the same screens, filtered to the logged-in employee."
      specDescriptionAr="الخدمة الذاتية للموظف: طلباتي (طلبات الإجازة، العمل الإضافي، وتصحيح البصمة المفقودة) تستخدم نفس شاشات النظام، مصفاة للموظف المسجل فقط."
      capabilitiesEn={[
        'Leave, Overtime & Missing Punch Requests',
        'Live Approval Progress Visual Stepper',
        'Manager & HR Review Feedback',
        'Attachment Upload for Supporting Documents',
        'Complete Archive of Approved & Historical Requests'
      ]}
      capabilitiesAr={[
        'طلبات الإجازة والعمل الإضافي وتصحيح البصمة المفقودة',
        'مؤشر مراحل سير واعتماد الطلب في الوقت الفعلي',
        'ملاحظات وردود المدير المباشر والموارد البشرية',
        'إرفاق المستندات الداعمة للطلب',
        'أرشيف شامل ومفصل لكافة الطلبات السابقة والمعتمدة'
      ]}
      icon={Send}
    />
  );
}
