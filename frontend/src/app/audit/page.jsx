'use client';

import React from 'react';
import { ModulePlaceholder } from '../../components/layout/ModulePlaceholder';
import { History } from 'lucide-react';

export default function AuditPage() {
  return (
    <ModulePlaceholder
      titleEn="Audit History"
      titleAr="سجل التدقيق"
      subtitleEn="Immutable, tamper-proof activity ledger documenting every change, approval and login"
      subtitleAr="سجل غير قابل للتعديل يوثق كل تغيير واعتماد وتسجيل دخول"
      phaseNumber={9}
      phaseNameEn="Compliance, Reports & Audit"
      phaseNameAr="الامتثال والتقارير والتدقيق"
      specDescriptionEn="Read-only list of every change, approval and login, filtered by user, record or date."
      specDescriptionAr="قائمة للقراءة فقط ترصد كل تغيير واعتماد وتسجيل دخول، قابلة للتصفية حسب المستخدم أو السجل أو التاريخ."
      capabilitiesEn={[
        'Append-Only Database-Enforced Audit Log',
        'Actor, Timestamp, Entity, Record ID & Action Tracking',
        'Structured Before vs After Value JSON Diffs',
        'Search & Filter by Entity, User or Date Range',
        'Regulatory Compliance Audit Export for MOHRE'
      ]}
      capabilitiesAr={[
        'سجل إضافة فقط محمي على مستوى محرك قاعدة البيانات',
        'توثيق المنفذ، الطابع الزمني، الكيان، معرف السجل ونوع الإجراء',
        'مقارنة فروقات تفصيلية بين القيمة السابقة والجديدة',
        'بحث وتصفية حسب الكيان، المستخدم أو النطاق الزمني',
        'تصدير تقارير التدقيق النظامية لوزارة الموارد البشرية'
      ]}
      icon={History}
    />
  );
}
