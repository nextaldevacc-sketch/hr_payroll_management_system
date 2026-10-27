'use client';

import React from 'react';
import { ModulePlaceholder } from '../../../components/layout/ModulePlaceholder';
import { FileText } from 'lucide-react';

export default function MyDocumentsPage() {
  return (
    <ModulePlaceholder
      titleEn="My Documents"
      titleAr="وثائقي الرسمية"
      subtitleEn="Secure employee document storage, expiry tracking and renewal verification"
      subtitleAr="مستودع الوثائق الرسمية الآمن للموظف، متابعة تواريخ الانتهاء والتحقق من التجديد"
      phaseNumber={7}
      phaseNameEn="Self-Service + Live Dashboard"
      phaseNameAr="الخدمة الذاتية ولوحة المؤشرات المباشرة"
      specDescriptionEn="Employee self-service: View personal documents (Emirates ID, passport, visa, labour contract, insurance), upload renewals, and receive expiry alerts."
      specDescriptionAr="الخدمة الذاتية للموظف: عرض الوثائق الشخصية (الهوية الإماراتية، الجواز، الإقامة، عقد العمل، التأمين)، ورفع التجديدات واستلام تنبيهات الانتهاء."
      capabilitiesEn={[
        'Emirates ID, Passport & UAE Residency Visa View',
        'MOHRE Labour Contract & Health Insurance Policy',
        'Direct Document Upload for Renewal Submissions',
        'Document Expiry Status & 90/60/30-Day Warnings',
        'Encrypted Storage with Role-Based Access Control'
      ]}
      capabilitiesAr={[
        'استعراض الهوية الإماراتية وجواز السفر وتأشيرة الإقامة',
        'عقد العمل الصادر من الوزارة وبوليصة التأمين الصحي',
        'رفع مباشر للمستندات والوثائق المجددة لاعتمادها',
        'متابعة حالة صلاحية الوثائق وتنبيهات 90/60/30 يوماً',
        'تخزين مشفر آمن مع تقييد الوصول حسب الصلاحيات'
      ]}
      icon={FileText}
    />
  );
}
