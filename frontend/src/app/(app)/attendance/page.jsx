'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  Clock,
  Calendar,
  UploadCloud,
  AlertTriangle,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import AttendanceGridFeature from '@/components/features/attendance/AttendanceGridFeature';
import BiometricImportFeature from '@/components/features/attendance/BiometricImportFeature';
import MissingPunchQueueFeature from '@/components/features/attendance/MissingPunchQueueFeature';
import AttendanceReviewFeature from '@/components/features/attendance/AttendanceReviewFeature';
import OvertimeRequestsFeature from '@/components/features/overtime/OvertimeRequestsFeature';
import { RouteGuard } from '@/components/common/RouteGuard';

export default function AttendancePage() {
  const { user, language, canAccess } = useAuth();
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState('grid'); // 'grid' | 'import' | 'queue' | 'overtime' | 'review'

  return (
    <RouteGuard area="attendance">
      <div className="space-y-6 max-w-7xl mx-auto pb-12 w-full max-w-full overflow-x-hidden" data-testid="attendance-page">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-text tracking-tight flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-primary" />
            <span>{isAr ? 'إدارة الحضور وسجلات البصمة والعمل الإضافي' : 'Attendance, Biometrics & Overtime'}</span>
          </h1>
          <p className="text-xs text-text-muted mt-1">
            {isAr
              ? 'توقيت آسيا/دبي (UTC+4)، استيراد البصمات ومعالجة الاستثناءات، اعتماد العمل الإضافي، وتأكيد الحضور الشهري'
              : 'Asia/Dubai (UTC+4) day boundary, biometric deduplication, missing punch queue, overtime calculations, and manager sign-off.'}
          </p>
        </div>

        {/* Navigation Tabs */}
        <div role="tablist" className="flex items-center gap-1.5 bg-surface/80 border border-border/80 p-1 rounded-2xl text-xs backdrop-blur-md overflow-x-auto max-w-full">
          <button
            type="button"
            id="tab-attendance-grid"
            data-testid="tab-attendance-grid"
            role="tab"
            aria-selected={activeTab === 'grid'}
            onClick={() => setActiveTab('grid')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 ${
              activeTab === 'grid'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{isAr ? 'شبكة الحضور' : 'Daily Grid'}</span>
          </button>

          {canAccess('attendance', 'edit') && (
          <button
            type="button"
            id="tab-biometric-import"
            data-testid="tab-biometric-import"
            role="tab"
            aria-selected={activeTab === 'import'}
            onClick={() => setActiveTab('import')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 ${
              activeTab === 'import'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>{isAr ? 'استيراد البصمة' : 'Biometric Import'}</span>
          </button>
          )}

          <button
            type="button"
            id="tab-missing-punches"
            data-testid="tab-missing-punches"
            role="tab"
            aria-selected={activeTab === 'queue'}
            onClick={() => setActiveTab('queue')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 ${
              activeTab === 'queue'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{isAr ? 'البصمات المفقودة' : 'Missing Punches'}</span>
          </button>

          {(canAccess('overtime', 'view') || canAccess('overtime', 'approve_team')) && (
          <button
            type="button"
            id="tab-overtime-requests"
            data-testid="tab-overtime-requests"
            role="tab"
            aria-selected={activeTab === 'overtime'}
            onClick={() => setActiveTab('overtime')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 ${
              activeTab === 'overtime'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isAr ? 'العمل الإضافي' : 'Overtime'}</span>
          </button>
          )}

          <button
            type="button"
            id="tab-attendance-review"
            data-testid="tab-attendance-review"
            role="tab"
            aria-selected={activeTab === 'review'}
            onClick={() => setActiveTab('review')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 ${
              activeTab === 'review'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isAr ? 'الاعتماد الشهري' : 'Sign-Off'}</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'grid' && <AttendanceGridFeature />}
      {activeTab === 'import' && canAccess('attendance', 'edit') && <BiometricImportFeature />}
      {activeTab === 'queue' && <MissingPunchQueueFeature />}
      {activeTab === 'overtime' && (canAccess('overtime', 'view') || canAccess('overtime', 'approve_team')) && <OvertimeRequestsFeature />}
      {activeTab === 'review' && <AttendanceReviewFeature />}
    </div>
  </RouteGuard>
);
}
