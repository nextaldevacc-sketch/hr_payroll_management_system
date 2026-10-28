'use client';

import React from 'react';
import { ModulePlaceholder } from '../../components/layout/ModulePlaceholder';
import { UserMinus } from 'lucide-react';

export default function OffboardingPage() {
  return (
    <ModulePlaceholder
      titleEn="Offboarding & Final Settlement"
      titleAr="نهاية الخدمة والتسوية النهائية"
      subtitleEn="Resignations, multi-department asset clearance, statutory gratuity and exit settlement"
      subtitleAr="الاستقالات، براءة الذمة بين الأقسام، مكافأة نهاية الخدمة والتسوية النهائية"
      phaseNumber={8}
      phaseNameEn="Offboarding"
      phaseNameAr="نهاية الخدمة"
      specDescriptionEn="Notice, clearance, gratuity, leave encashment, recoveries, settlement payslip, access deactivation."
      specDescriptionAr="فترة الإشعار، براءة الذمة، مكافأة نهاية الخدمة، بدل الإجازات، الاستردادات، كشف التسوية، وإلغاء الصلاحيات."
      capabilitiesEn={[
        'Resignation & Termination Exit Workflow',
        'Multi-Department Clearance Checklist (IT, Admin, Finance, HR)',
        'Statutory UAE Gratuity (EOSB) Pro-Rata Calculator',
        'Leave Encashment & Unserved Notice Shortfall Recovery',
        'Frozen Settlement Snapshot & Access Deactivation'
      ]}
      capabilitiesAr={[
        'مسار إنهاء الخدمة والاستقالة وفترة الإشعار التعاقدية',
        'قائمة براءة الذمة للأقسام (التقنية، الإدارة، المالية، الموارد)',
        'حاسبة مكافأة نهاية الخدمة النسبية وفق المادة 51 من القانون',
        'احتساب بدل الإجازة النقدية واسترداد عجز فترة الإشعار',
        'تجميد أرقام التسوية النهائية وأرشفة الموظف وتعطيل الدخول'
      ]}
      icon={UserMinus}
    />
  );
}
