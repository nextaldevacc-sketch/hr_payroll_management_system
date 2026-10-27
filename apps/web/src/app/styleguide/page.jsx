'use client';

import React, { useState } from 'react';
import { useTheme } from 'next-themes';
import { GlassCard } from '../../components/primitives/GlassCard';
import { BentoGrid } from '../../components/primitives/BentoGrid';
import { BentoTile } from '../../components/primitives/BentoTile';
import { IconWell } from '../../components/primitives/IconWell';
import { StatNumber } from '../../components/primitives/StatNumber';
import { StatusPill } from '../../components/primitives/StatusPill';
import { Stepper } from '../../components/primitives/Stepper';
import { DataTable } from '../../components/primitives/DataTable';
import { Button } from '../../components/primitives/form/Button';
import { Input } from '../../components/primitives/form/Input';
import { Select } from '../../components/primitives/form/Select';
import { Switch } from '../../components/primitives/form/Switch';
import { Modal } from '../../components/primitives/Modal';
import { Drawer } from '../../components/primitives/Drawer';
import { InsetBox } from '../../components/primitives/InsetBox';
import { ListDivided } from '../../components/primitives/ListDivided';
import { CalloutBar } from '../../components/primitives/CalloutBar';
import { formatCurrency } from '@nextal/shared';
import { useLanguage } from '../../context/LanguageContext';
import {
  Sparkles,
  Sun,
  Moon,
  Globe,
  Banknote,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers,
  Search,
  Check,
  ChevronRight
} from 'lucide-react';

export default function StyleguidePage() {
  const { theme, setTheme } = useTheme();
  const { language, toggleLanguage, isRTL } = useLanguage();

  const [inputVal, setInputVal] = useState('Ahmed Mansoor');
  const [selectVal, setSelectVal] = useState('Operations');
  const [switchVal, setSwitchVal] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Worked examples from Section 8.4
  const workedExamplesData = [
    {
      id: 1,
      employee: 'Ahmed Mansoor',
      basic: formatCurrency(5000),
      gross: formatCurrency(8000),
      overtime: formatCurrency(78.13),
      deductions: formatCurrency(1033.33),
      net: formatCurrency(7044.80),
      status: 'Calculated',
      note: '3h OT (+78.13), 2d Absent (-533.33), Loan (-500)',
    },
    {
      id: 2,
      employee: 'Sara Al-Ali (Exit Gratuity)',
      basic: formatCurrency(5000),
      gross: formatCurrency(7500),
      overtime: formatCurrency(0),
      deductions: formatCurrency(0),
      net: formatCurrency(12082.19),
      status: 'Validated',
      note: '3.5 yrs service × 21 days daily wage (164.38 × 73.5)',
    },
    {
      id: 3,
      employee: 'Omar Hassan (Exit Gratuity)',
      basic: formatCurrency(6000),
      gross: formatCurrency(9000),
      overtime: formatCurrency(0),
      deductions: formatCurrency(0),
      net: formatCurrency(32547.95),
      status: 'Validated',
      note: '7 yrs service: (21×5 + 30×2 = 165 days) × 197.26',
    },
  ];

  const columns = [
    { key: 'employee', header: 'Employee & Case' },
    { key: 'basic', header: 'Basic', isMoney: true },
    { key: 'gross', header: 'Gross', isMoney: true },
    { key: 'overtime', header: '+ OT', isMoney: true },
    { key: 'deductions', header: '− Deductions', isMoney: true },
    {
      key: 'net',
      header: 'Net Payable',
      isMoney: true,
      render: (val) => (
        <span className="font-bold text-secondary-text dark:text-emerald-400">
          {val}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Stage',
      render: (val) => <StatusPill status={val} />,
    },
    { key: 'note', header: 'UAE Formula / Breakdown' },
  ];

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-16">
      {/* Header and Live Control Matrix */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-wash text-primary-strong dark:text-primary border border-primary/20">
              Design System v2.0
            </span>
            <span className="text-xs text-text-muted">Manrope & IBM Plex Sans Arabic</span>
          </div>
          <h1 className="text-3xl font-extrabold text-text dark:gold-heading tracking-tight gold-page-title">
            Design Tokens & Primitives Style Guide
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Glassmorphism (50%) · Bento Grid (40%) · Neumorphic Wells (10%) · Light & Dark · English & Arabic (RTL)
          </p>
        </div>

        {/* Live Interactive Switchers for instantaneous testing */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            icon={<Globe className="w-4 h-4 text-primary" />}
          >
            Language: <strong className="ms-1">{language === 'en' ? 'English (LTR)' : 'عربي (RTL)'}</strong>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            icon={theme === 'dark' ? <Sun className="w-4 h-4 text-primary" /> : <Moon className="w-4 h-4" />}
          >
            Theme: <strong className="ms-1 capitalize">{theme || 'light'}</strong>
          </Button>
        </div>
      </div>

      {/* 1. Theme Tokens & Swatches */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-text dark:gold-heading flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          1. Curated Color Palette Tokens
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-tile border border-border bg-bg text-center">
            <div className="w-full h-12 rounded-lg bg-bg border border-border mb-2 flex items-center justify-center font-bold text-xs text-text">
              --bg
            </div>
            <span className="text-xs font-bold text-text block">Background</span>
            <span className="text-[10px] text-text-muted font-mono">White / Black</span>
          </div>

          <div className="p-3 rounded-tile border border-border bg-black/[0.02] dark:bg-white/[0.02] text-center">
            <div className="w-full h-12 rounded-lg bg-primary mb-2 flex items-center justify-center font-bold text-xs text-white shadow-sm">
              #4BB8FA
            </div>
            <span className="text-xs font-bold text-text block">Primary</span>
            <span className="text-[10px] text-text-muted font-mono">Buttons, Active nav</span>
          </div>

          <div className="p-3 rounded-tile border border-border bg-black/[0.02] dark:bg-white/[0.02] text-center">
            <div className="w-full h-12 rounded-lg bg-primary-strong mb-2 flex items-center justify-center font-bold text-xs text-white shadow-sm">
              #1E88C8
            </div>
            <span className="text-xs font-bold text-text block">Primary Strong</span>
            <span className="text-[10px] text-text-muted font-mono">Accessible blue text</span>
          </div>

          <div className="p-3 rounded-tile border border-border bg-black/[0.02] dark:bg-white/[0.02] text-center">
            <div className="w-full h-12 rounded-lg bg-secondary mb-2 flex items-center justify-center font-bold text-xs text-white shadow-sm">
              #306D29
            </div>
            <span className="text-xs font-bold text-text block">Secondary</span>
            <span className="text-[10px] text-text-muted font-mono">Paid / Net / Success</span>
          </div>

          <div className="p-3 rounded-tile border border-border bg-black/[0.02] dark:bg-white/[0.02] text-center">
            <div className="w-full h-12 rounded-lg bg-gradient-to-b from-[#F5C542] via-[#E6A60E] to-[#B07D05] mb-2 flex items-center justify-center font-bold text-xs text-black shadow-sm">
              Gold Finish
            </div>
            <span className="text-xs font-bold text-text block">Gold Coating</span>
            <span className="text-[10px] text-text-muted font-mono">Dark mode headings</span>
          </div>

          <div className="p-3 rounded-tile border border-border bg-black/[0.02] dark:bg-white/[0.02] text-center">
            <div className="w-full h-12 rounded-lg glass-panel mb-2 flex items-center justify-center font-bold text-xs text-text shadow-sm">
              Glass
            </div>
            <span className="text-xs font-bold text-text block">Glassmorphism</span>
            <span className="text-[10px] text-text-muted font-mono">18px-20px blur</span>
          </div>
        </div>
      </section>

      {/* 2. Neumorphic Icon Wells (The 10% Neumorphism Rule) */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-text dark:gold-heading">
            2. Neumorphic Icon Wells (Exclusively for Icons)
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Soft raised / inset circle and rounded square containers. Strictly applied to icons only.
          </p>
        </div>

        <GlassCard className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 items-center justify-items-center">
            <div className="flex flex-col items-center gap-1.5">
              <IconWell size="sm" shape="square" color="primary">
                <Banknote className="w-4 h-4" />
              </IconWell>
              <span className="text-[11px] text-text-muted">sm / square</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <IconWell size="md" shape="square" color="primary">
                <Banknote className="w-5 h-5" />
              </IconWell>
              <span className="text-[11px] text-text-muted">md / square</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <IconWell size="lg" shape="square" color="primary">
                <Banknote className="w-6 h-6" />
              </IconWell>
              <span className="text-[11px] text-text-muted">lg / square</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <IconWell size="xl" shape="square" color="gold">
                <Sparkles className="w-7 h-7" />
              </IconWell>
              <span className="text-[11px] text-text-muted">xl / gold</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <IconWell size="sm" shape="circle" color="secondary">
                <CheckCircle2 className="w-4 h-4" />
              </IconWell>
              <span className="text-[11px] text-text-muted">sm / circle</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <IconWell size="md" shape="circle" color="secondary">
                <CheckCircle2 className="w-5 h-5" />
              </IconWell>
              <span className="text-[11px] text-text-muted">md / circle</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <IconWell size="lg" shape="circle" color="danger">
                <AlertTriangle className="w-6 h-6" />
              </IconWell>
              <span className="text-[11px] text-text-muted">lg / danger</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <IconWell size="lg" shape="square" active={true} color="primary">
                <Check className="w-6 h-6" />
              </IconWell>
              <span className="text-[11px] text-text-muted">active / inset</span>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* 3. Status Pills & Workflow Stepper */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-text dark:gold-heading">
          3. Status Pills & Stepper Primitives
        </h2>

        <GlassCard className="p-6 space-y-6">
          <div>
            <span className="text-xs uppercase font-semibold text-text-muted block mb-3">
              Pay Run & Workflow Statuses (999px pills)
            </span>
            <div className="flex flex-wrap gap-2.5 items-center">
              <StatusPill status="Draft" />
              <StatusPill status="Calculated" />
              <StatusPill status="Validated" />
              <StatusPill status="Locked" />
              <StatusPill status="Paid" />
              <div className="w-[1px] h-6 bg-border mx-1" />
              <StatusPill status="Active" />
              <StatusPill status="Pending" />
              <StatusPill status="Approved" />
              <StatusPill status="Rejected" />
              <StatusPill status="Expiring Soon" />
              <StatusPill status="Expired" />
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <span className="text-xs uppercase font-semibold text-text-muted block mb-3">
              Pay Run Stage Stepper
            </span>
            <Stepper steps={['Draft', 'Calculated', 'Validated', 'Locked', 'Paid']} currentStep="Calculated" />
          </div>
        </GlassCard>
      </section>

      {/* 4. Form Controls */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-text dark:gold-heading">
          4. Form Controls (14px Radii, Accessible Focus Rings)
        </h2>

        <GlassCard className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Employee Name"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              icon={<Search className="w-4 h-4" />}
              helperText="Full legal name per UAE Passport"
            />

            <Select
              label="Department Unit"
              value={selectVal}
              onChange={(e) => setSelectVal(e.target.value)}
              options={['Operations', 'Engineering', 'Sales & Mktg', 'Logistics', 'Finance']}
              helperText="Cost center assignment"
            />

            <div className="flex flex-col justify-end">
              <Switch
                label="Auto-Enroll WPS SIF"
                description="Include in electronic salary transfer"
                checked={switchVal}
                onChange={setSwitchVal}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border flex flex-wrap gap-3 items-center">
            <Button variant="primary" size="md">
              Primary Action
            </Button>
            <Button variant="secondary" size="md">
              Secondary (Paid / Success)
            </Button>
            <Button variant="outline" size="md">
              Outline Button
            </Button>
            <Button variant="ghost" size="md">
              Ghost Button
            </Button>
            <Button variant="danger" size="md">
              Danger Button
            </Button>
            <Button variant="primary" size="md" loading={true}>
              Loading
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
              Open Sample Modal
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsDrawerOpen(true)}>
              Open Sample Drawer
            </Button>
          </div>
        </GlassCard>
      </section>

      {/* 5. DataTable with Section 8.4 Worked Examples */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text dark:gold-heading">
              5. Data Table & UAE Calculations Verification (Section 8.4)
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Comfortable row height, zebra OFF, hover ON, end-aligned tabular numbers.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary-wash text-secondary-text">
            Exact Precision Verified
          </span>
        </div>

        <GlassCard className="p-0 overflow-hidden">
          <DataTable
            columns={columns}
            data={workedExamplesData}
            onRowClick={(row) => alert(`Selected: ${row.employee}`)}
          />
        </GlassCard>
      </section>

      {/* 6. Inset & Tints (No Outlines Rule) */}
      <section className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-wash text-primary-strong dark:text-primary border border-primary/20">
              Rule: Dark-Mode Zero Harsh Outlines
            </span>
          </div>
          <h2 className="text-lg font-bold text-text dark:gold-heading">
            6. Inset & Tints Primitives
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Standardised borderless tone washes in dark mode and clean 1px borders in light mode. Ensures all nested boxes, counters, and callouts render without harsh white outlines.
          </p>
        </div>

        {/* 5 InsetBox Tones + Interactive */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text">InsetBox (5 Tones + Interactive State)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <InsetBox tone="neutral">
              <div className="text-xs font-bold text-text">Neutral Tone</div>
              <div className="text-[11px] text-text-muted mt-1">Counters, attendance chips, secondary metrics.</div>
            </InsetBox>

            <InsetBox tone="primary">
              <div className="text-xs font-bold text-primary">Primary Tone</div>
              <div className="text-[11px] text-text-muted mt-1">Holidays, highlight cards, active indicators.</div>
            </InsetBox>

            <InsetBox tone="danger">
              <div className="text-xs font-bold text-danger-text">Danger Tone</div>
              <div className="text-[11px] text-text-muted mt-1">Expired documents, payroll blocking errors.</div>
            </InsetBox>

            <InsetBox tone="warning">
              <div className="text-xs font-bold text-warning-text">Warning Tone</div>
              <div className="text-[11px] text-text-muted mt-1">Expiring within 30 days, missing WPS info.</div>
            </InsetBox>

            <InsetBox tone="success">
              <div className="text-xs font-bold text-secondary-text">Success Tone</div>
              <div className="text-[11px] text-text-muted mt-1">Approved items, 100% WPS audit readiness.</div>
            </InsetBox>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <InsetBox tone="neutral" interactive className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-text">Interactive Neutral InsetBox</div>
                <div className="text-[11px] text-text-muted">Hover transitions to inset-hover token.</div>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted rtl:-scale-x-100" />
            </InsetBox>

            <InsetBox tone="primary" interactive className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-primary">Interactive Primary InsetBox</div>
                <div className="text-[11px] text-text-muted">Clickable quick actions and shortcuts.</div>
              </div>
              <ChevronRight className="w-4 h-4 text-primary rtl:-scale-x-100" />
            </InsetBox>
          </div>
        </div>

        {/* CalloutBar in 3 Tones */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-semibold text-text">CalloutBar (Primary, Warning, Danger)</h3>
          <div className="space-y-2">
            <CalloutBar tone="primary" className="text-xs">
              <div className="font-bold text-primary">HR Manager Action Required</div>
              <div className="text-text-muted text-[11px] mt-0.5">2 blocking errors in Live Payroll cycle must be resolved before WPS SIF generation.</div>
            </CalloutBar>

            <CalloutBar tone="warning" className="text-xs">
              <div className="font-bold text-warning-text">WPS Compliance Alert</div>
              <div className="text-text-muted text-[11px] mt-0.5">2 employees are missing mandatory UAE Central Bank IBAN routing details.</div>
            </CalloutBar>

            <CalloutBar tone="danger" className="text-xs">
              <div className="font-bold text-danger-text">Critical Payroll Anomaly</div>
              <div className="text-text-muted text-[11px] mt-0.5">Negative net pay detected on 1 employee due to unpaid leave deduction exceeding wage cap.</div>
            </CalloutBar>
          </div>
        </div>

        {/* ListDivided */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-semibold text-text">ListDivided (Divided Rows Without Outer Box)</h3>
          <GlassCard className="p-4">
            <ListDivided className="text-xs">
              <div className="flex items-center justify-between py-2.5">
                <span className="font-medium text-text">SIF Header & Establishment ID Check</span>
                <span className="text-[11px] text-secondary font-bold">Passed</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="font-medium text-text">Central Bank Routing Code Validation</span>
                <span className="text-[11px] text-secondary font-bold">Passed</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="font-medium text-text">Labour Card / Person ID Integrity Check</span>
                <span className="text-[11px] text-warning-text font-bold">1 Warning</span>
              </div>
            </ListDivided>
          </GlassCard>
        </div>
      </section>

      {/* Modals & Drawers Demo */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Sample Glassmorphic Modal"
        subtitle="Accessible dialog with backdrop blur"
      >
        <p className="text-sm text-text-muted mb-4">
          Modals use glassmorphic panels, clear close triggers, and prevent background scrolling.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
            Dismiss
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(false)}>
            Confirm Action
          </Button>
        </div>
      </Modal>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Sample Glassmorphic Drawer"
        subtitle="RTL-aware side sheet"
        side="end"
      >
        <p className="text-sm text-text-muted mb-4">
          Drawers slide in from the end side (right in LTR, left in Arabic RTL) with responsive layouts.
        </p>
        <Button variant="primary" size="sm" className="w-full" onClick={() => setIsDrawerOpen(false)}>
          Close Drawer
        </Button>
      </Drawer>
    </div>
  );
}
