'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BentoGrid } from '../components/primitives/BentoGrid';
import { LivePayrollHeroTile } from '../components/features/dashboard/LivePayrollHeroTile';
import { HeadcountTile } from '../components/features/dashboard/HeadcountTile';
import { PendingApprovalsTile } from '../components/features/dashboard/PendingApprovalsTile';
import { WpsReadinessTile } from '../components/features/dashboard/WpsReadinessTile';
import { DocumentsExpiryTile } from '../components/features/dashboard/DocumentsExpiryTile';
import { ExceptionsTile } from '../components/features/dashboard/ExceptionsTile';
import { AttendanceSegmentTile } from '../components/features/dashboard/AttendanceSegmentTile';
import { OvertimeTile } from '../components/features/dashboard/OvertimeTile';
import { PayrollTrendTile } from '../components/features/dashboard/PayrollTrendTile';
import { DepartmentChartTile } from '../components/features/dashboard/DepartmentChartTile';
import { FinanceLiabilitiesTile } from '../components/features/dashboard/FinanceLiabilitiesTile';
import { WeekAheadTile } from '../components/features/dashboard/WeekAheadTile';
import { QuickActionsTile } from '../components/features/dashboard/QuickActionsTile';
import { RecentActivityTile } from '../components/features/dashboard/RecentActivityTile';
import { VarianceTile } from '../components/features/dashboard/VarianceTile';

import { Drawer } from '../components/primitives/Drawer';
import { Modal } from '../components/primitives/Modal';
import { Button } from '../components/primitives/form/Button';
import { mockDashboardData } from '../lib/mockData';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency } from '@nextal/shared';
import {
  Upload,
  Play,
  FileCheck2,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [activeDrawer, setActiveDrawer] = useState(null);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);

  const handleQuickAction = (actionId) => {
    switch (actionId) {
      case 'import':
        setActiveDrawer('import');
        break;
      case 'new-emp':
        router.push('/employees');
        break;
      case 'leave':
        router.push('/leave');
        break;
      case 'salary-adj':
        router.push('/payroll/adjustments');
        break;
      case 'holiday':
        router.push('/leave');
        break;
      case 'payrun':
        router.push('/payroll');
        break;
      default:
        break;
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-fadeIn pb-12">
      {/* Page Title & Action Bar: Spacing used instead of dividing line */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text gold-page-title">
            {t('dashboard.title')}
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Gulf Tech Logistics LLC · {t('dashboard.subtitle')}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={<Upload className="w-3.5 h-3.5" />}
            onClick={() => setActiveDrawer('import')}
          >
            Import Punches
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Play className="w-3.5 h-3.5" />}
            onClick={() => router.push('/payroll')}
          >
            Calculate Payroll
          </Button>
        </div>
      </div>

      {/* 12-Column Explicit Bento Grid Layout */}
      <BentoGrid id="hr-dashboard-bento-grid">
        {/* Row 1 & 2: live (6x2), head (3x1), appr (3x1), wps (3x1), docs (3x1) */}
        <LivePayrollHeroTile
          data={mockDashboardData.livePayroll}
          onClick={() => router.push('/payroll')}
          onOpenValidation={() => router.push('/payroll')}
        />

        <HeadcountTile
          data={mockDashboardData.headcount}
          onClick={() => setActiveDrawer('headcount')}
        />

        <PendingApprovalsTile
          data={mockDashboardData.pendingApprovals}
          onClick={() => router.push('/leave')}
          onApproveItem={() => router.push('/leave')}
          onOpenItem={() => router.push('/leave')}
        />

        <WpsReadinessTile
          data={mockDashboardData.wpsReadiness}
          onClick={() => router.push('/compliance')}
          onFilterMissing={() => router.push('/compliance')}
        />

        <DocumentsExpiryTile
          data={mockDashboardData.expiringDocs}
          onClick={() => setActiveDrawer('docs')}
        />

        {/* Row 3: exc (4x1), att (4x1), ot (4x1) */}
        <ExceptionsTile
          data={mockDashboardData.exceptions}
          onSelectException={() => router.push('/attendance')}
          onClick={() => router.push('/attendance')}
        />

        <AttendanceSegmentTile
          data={mockDashboardData.attendanceToday}
          onClick={() => router.push('/attendance')}
        />

        <OvertimeTile
          data={mockDashboardData.overtimeMonth}
          onClick={() => router.push('/attendance')}
        />

        {/* Row 4: trend (6x1), dept (3x1), liab (3x1) */}
        <PayrollTrendTile
          data={mockDashboardData.payrollTrend}
          onClick={() => router.push('/reports')}
        />

        <DepartmentChartTile
          data={mockDashboardData.departmentHeadcount}
          onClick={() => setActiveDrawer('headcount')}
        />

        <FinanceLiabilitiesTile
          data={mockDashboardData.financeLiabilities}
          onClick={() => router.push('/reports')}
        />

        {/* Row 5: week (8x1), quick (4x1) */}
        <WeekAheadTile
          data={mockDashboardData.weekAhead}
          onClick={() => router.push('/leave')}
        />

        <QuickActionsTile
          data={mockDashboardData.quickActions}
          onAction={handleQuickAction}
        />

        {/* Row 6: audit (8x1), var (4x1) */}
        <RecentActivityTile
          data={mockDashboardData.recentActivity}
          onClick={() => setActiveDrawer('audit')}
        />

        <VarianceTile
          data={mockDashboardData.variance}
          onClick={() => setIsPayrollModalOpen(true)}
        />
      </BentoGrid>

      {/* Pay Run Overview Modal */}
      <Modal
        isOpen={isPayrollModalOpen}
        onClose={() => setIsPayrollModalOpen(false)}
        title="October 2026 Pay Run Overview"
        subtitle="MOHRE Visa #442901 · Gulf Tech Logistics LLC"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-primary-wash/50 border border-primary/20">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="text-primary font-bold">Pay Run Stage</span>
              <span className="px-2 py-0.5 rounded-full bg-primary text-[var(--on-primary)] text-[10px] font-bold">
                CALCULATED
              </span>
            </div>
            <p className="text-xs text-text-muted">
              Live calculation verified with 42 contracts. Ready for HR Manager review and variance audit.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border">
              <span className="text-text-muted">Total Gross Salary</span>
              <p className="text-base font-bold text-text tabular-nums mt-0.5">
                <bdi>{formatCurrency(mockDashboardData.livePayroll.figures.gross, 'AED', language)}</bdi>
              </p>
            </div>
            <div className="p-3 rounded-xl bg-secondary-wash border border-secondary/20">
              <span className="text-secondary-text font-semibold">Net to WPS SIF</span>
              <p className="text-base font-bold text-secondary-text tabular-nums mt-0.5">
                <bdi>{formatCurrency(mockDashboardData.livePayroll.figures.netToWps, 'AED', language)}</bdi>
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsPayrollModalOpen(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<FileCheck2 className="w-4 h-4" />}
              onClick={() => {
                setIsPayrollModalOpen(false);
                router.push('/payroll');
              }}
            >
              Open Full Pay Run Detail
            </Button>
          </div>
        </div>
      </Modal>

      {/* Drawer for details */}
      <Drawer
        isOpen={Boolean(activeDrawer)}
        onClose={() => setActiveDrawer(null)}
        title={
          activeDrawer === 'exceptions'
            ? 'Attendance & Payroll Exceptions'
            : activeDrawer === 'approvals'
            ? 'Pending Approval Inbox'
            : activeDrawer === 'docs'
            ? 'Expiring UAE Documents (90 Days)'
            : activeDrawer === 'import'
            ? 'Import Biometric Device Punches'
            : activeDrawer === 'headcount'
            ? 'Headcount & Department Overview'
            : activeDrawer === 'attendance'
            ? "Today's Biometric Attendance"
            : 'Detail Overview'
        }
        subtitle="Live system records"
        side="end"
      >
        <div className="space-y-4">
          {activeDrawer === 'exceptions' && (
            <div className="space-y-3">
              {mockDashboardData.exceptions.map((ex) => (
                <div key={ex.id} className="p-3 rounded-xl border border-border bg-black/[0.02] dark:bg-white/[0.02]">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold text-text">{ex.title}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-warning-wash text-warning-text">
                      {ex.count} items
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mb-2">{ex.subtitle}</p>
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    {ex.action}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {activeDrawer === 'approvals' && (
            <div className="space-y-2">
              {mockDashboardData.pendingApprovals.items.map((item) => (
                <div key={item.type} className="p-3 rounded-xl border border-border flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-text block">{item.type}</span>
                    <span className="text-text-muted">Awaiting step confirmation</span>
                  </div>
                  <span className="font-extrabold text-sm tabular-nums text-primary">{item.count}</span>
                </div>
              ))}
            </div>
          )}

          {activeDrawer === 'docs' && (
            <div className="space-y-3">
              {mockDashboardData.expiringDocs.items.map((doc, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-border text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-text">{doc.employee}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${doc.daysLeft < 0 ? 'bg-danger-wash text-danger-text' : 'bg-warning-wash text-warning-text'}`}>
                      {doc.daysLeft < 0 ? 'EXPIRED' : `${doc.daysLeft}d left`}
                    </span>
                  </div>
                  <div className="flex justify-between text-text-muted text-[11px]">
                    <span>{doc.doc}</span>
                    <span>Responsible: {doc.owner}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeDrawer === 'import' && (
            <div className="space-y-4 text-xs">
              <div className="p-6 border-2 border-dashed border-border rounded-xl text-center">
                <Upload className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-semibold text-text">Drop biometric CSV / DAT file here</p>
                <p className="text-[11px] text-text-muted mt-1">ZKTeco, Suprema, Anviz standard format</p>
              </div>
              <Button variant="primary" size="md" className="w-full">
                Process Biometric File
              </Button>
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
}
