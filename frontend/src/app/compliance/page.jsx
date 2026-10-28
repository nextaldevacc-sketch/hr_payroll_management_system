'use client';

import React from 'react';
import { ModulePlaceholder } from '../../components/layout/ModulePlaceholder';
import { ShieldCheck } from 'lucide-react';

export default function CompliancePage() {
  return (
    <ModulePlaceholder
      titleEn="Compliance & Documents"
      titleAr="الامتثال والوثائق القانونية"
      subtitleEn="UAE residency visas, Emirates IDs, labour cards, insurance expiry tracker and alert owners"
      subtitleAr="تأشيرات الإقامة، الهوية الإماراتية، بطاقات العمل، راصد انتهاء الوثائق والتنبيهات"
      phaseNumber={9}
      phaseNameEn="Compliance, Reports & Audit"
      phaseNameAr="الامتثال والتقارير والتدقيق"
      specDescriptionEn="Visa, Emirates ID, labour card, passport, MOHRE contract and insurance, each with an owner and reminders."
      specDescriptionAr="التأشيرات، الهوية الإماراتية، بطاقة العمل، جواز السفر، عقود الوزارة والتأمين الصحي، مع تعيين المسؤول والتنبيهات التلقائية."
      capabilitiesEn={[
        'Automated Expiry Radar (≤90, ≤60, ≤30 Days & Expired)',
        'Assigned Document Renewal Responsible Owners',
        'Secure Vault for PDF / Image Document Attachments',
        'MOHRE Quota & UAE National Emiratisation Tracking',
        'Document Verification & HR Sign-Off Workflow'
      ]}
      capabilitiesAr={[
        'رادار التنبيه التلقائي (≤90، ≤60، ≤30 يوماً والوثائق المنتهية)',
        'تعيين الموظف المسؤول عن تجديد كل وثيقة رسمية',
        'خزنة مشفرة لحفظ مرفقات الوثائق الرسمية والمستندات',
        'متابعة كوتة الوزارة ونسب التوطين المعتمدة',
        'مسار تدقيق واعتماد الوثائق المجددة من الموارد البشرية'
      ]}
      icon={ShieldCheck}
    />
  );
}
