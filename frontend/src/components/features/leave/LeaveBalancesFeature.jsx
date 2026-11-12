'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import {
  CalendarDays,
  Award,
  Activity,
  Heart,
  Baby,
  Clock,
  CheckCircle,
  AlertCircle,
  Layers,
  Search,
} from 'lucide-react';
import { GlassCard } from '../../primitives/GlassCard';
import { getLeaveBalances } from '../../../services/leaveApi';
import { fetchEmployees } from '../../../services/employeesApi';
import { useVisa } from '../../../context/VisaContext';
import { withVisa } from '../../../lib/visaQuery';

export default function LeaveBalancesFeature() {
  const { user, language, canAccess } = useAuth();
  const { selectedVisaId } = useVisa();
  const isAr = language === 'ar';

  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(user?.employee_id || '');
  const [balances, setBalances] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    async function loadBalances() {
      setLoading(true);
      setError(null);
      try {
        let targetEmployeeId = selectedEmployeeId || user?.employee_id || '';
        if (canAccess('employees', 'view')) {
          const empRes = await fetchEmployees(withVisa({ limit: 50 }, selectedVisaId));
          const empList = Array.isArray(empRes?.data)
            ? empRes.data
            : (Array.isArray(empRes?.employees) ? empRes.employees : []);
          if (!active) return;
          setEmployees(empList);
          if (!targetEmployeeId || (empList.length > 0 && !empList.some((e) => e.id === targetEmployeeId))) {
            targetEmployeeId = empList[0]?.id || '';
            if (targetEmployeeId && targetEmployeeId !== selectedEmployeeId) {
              setSelectedEmployeeId(targetEmployeeId);
            }
          }
        }

        if (!targetEmployeeId) {
          if (active) setBalances(null);
          return;
        }

        const data = await getLeaveBalances({ employee_id: targetEmployeeId });
        if (active) setBalances(data);
      } catch (err) {
        console.error('Failed to load leave balances:', err);
        if (active) setError(err.message || 'Failed to load balances');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadBalances();
    return () => { active = false; };
  }, [selectedEmployeeId, selectedVisaId, user?.employee_id]);

  const balanceRows = Array.isArray(balances?.balances) ? balances.balances : [];
  const annualRow = balanceRows.find((b) => b.code === 'ANNUAL' || /annual/i.test(b.name || ''));
  const sickRow = balanceRows.find((b) => b.code === 'SICK' || /sick/i.test(b.name || ''));
  const sickTaken = Number(balances?.sick_leave?.totalTaken ?? sickRow?.days_taken ?? 0);
  const sickLeave = balances?.sick_leave || {
    totalTaken: sickTaken,
    bands: {
      full: Math.min(15, sickTaken),
      half: Math.min(30, Math.max(0, sickTaken - 15)),
      unpaid: Math.min(45, Math.max(0, sickTaken - 45)),
    },
    caps: { full: 15, half: 30, unpaid: 45, maxTotal: 90 },
  };
  const displayYear = balances?.year || new Date().getFullYear();

  return (
    <div className="space-y-6" data-testid="leave-balances-container">
      {/* Top Banner */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-text flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              <span>{isAr ? 'أرصدة واستحقاقات الإجازات القانونية' : 'UAE Statutory Leave Entitlements & Balances'}</span>
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {isAr
                ? 'وفق المادة 29 و31 من المرسوم بقانون اتحادي رقم 33 لسنة 2021 بشأن تنظيم علاقات العمل'
                : 'Compliant with Articles 29 & 31 of UAE Federal Decree-Law No. 33 of 2021.'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {employees.length > 0 && (
              <select
                aria-label={isAr ? 'اختر الموظف' : 'Select Employee'}
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-surface border border-border text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employee_code} — {isAr ? (emp.arabic_name || emp.name) : emp.name}
                  </option>
                ))}
              </select>
            )}
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-xl bg-surface border border-border text-primary">
              {isAr ? `السنة ${displayYear}` : `Year ${displayYear}`}
            </span>
          </div>
        </div>
      </GlassCard>

      {/* Statutory Sick Leave 90-Day Progression Band */}
      <GlassCard className="p-5 border-amber-500/20 bg-amber-500/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold text-text">
              {isAr ? 'تدرج الإجازة المرضية القانونية (90 يوماً في السنة التعاقدية)' : 'Statutory Sick Leave Cap (90 Days / Calendar Year)'}
            </h4>
          </div>
          <span className="text-xs font-mono font-bold text-amber-400">
            {sickLeave.totalTaken} / 90 {isAr ? 'يوم مستخدم' : 'days taken'}
          </span>
        </div>

        {/* 3-Band Progression Bar */}
        <div className="space-y-2">
          <div className="h-4 w-full rounded-full bg-surface overflow-hidden flex p-0.5 border border-border">
            {/* Band 1: Full Pay (1-15 days) */}
            <div
              style={{ width: `${(Math.min(sickLeave.bands.full, 15) / 90) * 100}%` }}
              className="h-full bg-emerald-500 rounded-l-full transition-all"
              title={`Full Pay (100%): ${sickLeave.bands.full} / 15 days`}
            />
            {/* Band 2: Half Pay (16-45 days) */}
            <div
              style={{ width: `${(Math.min(sickLeave.bands.half, 30) / 90) * 100}%` }}
              className="h-full bg-amber-500 transition-all"
              title={`Half Pay (50%): ${sickLeave.bands.half} / 30 days`}
            />
            {/* Band 3: Unpaid (46-90 days) */}
            <div
              style={{ width: `${(Math.min(sickLeave.bands.unpaid, 45) / 90) * 100}%` }}
              className="h-full bg-rose-500 rounded-r-full transition-all"
              title={`Unpaid (0%): ${sickLeave.bands.unpaid} / 45 days`}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-text-muted">
                {isAr ? 'أول 15 يوم (أجر كامل 100%)' : 'First 15d (Full Pay 100%)'}:
              </span>
              <span className="font-mono font-bold text-text">{sickLeave.bands.full}/15</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="text-text-muted">
                {isAr ? 'التالية 30 يوم (نصف أجر 50%)' : 'Next 30d (Half Pay 50%)'}:
              </span>
              <span className="font-mono font-bold text-text">{sickLeave.bands.half}/30</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span className="text-text-muted">
                {isAr ? 'الأخيرة 45 يوم (بدون أجر)' : 'Last 45d (Unpaid 0%)'}:
              </span>
              <span className="font-mono font-bold text-text">{sickLeave.bands.unpaid}/45</span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Leave Type Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Annual Leave Card */}
        <GlassCard className="p-5 border-primary/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              <span className="text-xs font-bold text-text">{isAr ? 'الإجازة السنوية' : 'Annual Leave'}</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
              100% Pay
            </span>
          </div>

          <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-text-muted block text-[11px]">{isAr ? 'المخصص السنوي' : 'Allocated'}</span>
              <span className="text-lg font-mono font-bold text-text">
                {annualRow?.days_allocated ?? balances?.annual?.allocated ?? 0}d
              </span>
            </div>
            <div>
              <span className="text-text-muted block text-[11px]">{isAr ? 'مرحل سابق' : 'Carry-Over'}</span>
              <span className="text-lg font-mono font-bold text-text">
                {annualRow?.carry_over_days ?? balances?.annual?.carryOver ?? 0}d
              </span>
            </div>
            <div>
              <span className="text-text-muted block text-[11px]">{isAr ? 'مستخدم' : 'Taken'}</span>
              <span className="text-lg font-mono font-bold text-amber-400">
                {annualRow?.days_taken ?? balances?.annual?.taken ?? 0}d
              </span>
            </div>
            <div>
              <span className="text-text-muted block text-[11px]">{isAr ? 'الرصيد المتاح' : 'Available'}</span>
              <span className="text-lg font-mono font-bold text-emerald-400">
                {annualRow?.remaining_balance ?? balances?.annual?.available ?? 0}d
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Maternity & Parental Leave */}
        <GlassCard className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Baby className="w-5 h-5 text-purple-400" />
              <span className="text-xs font-bold text-text">{isAr ? 'إجازة الأمومة والوالدية' : 'Maternity & Parental'}</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-300">
              Statutory
            </span>
          </div>

          <div className="pt-2 border-t border-border/40 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">{isAr ? 'إجازة الأمومة (أول 45 يوم)' : 'Maternity (First 45d):'}</span>
              <span className="font-mono font-bold text-emerald-400">100% Pay</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">{isAr ? 'إجازة الأمومة (التالية 15 يوم)' : 'Maternity (Next 15d):'}</span>
              <span className="font-mono font-bold text-amber-400">50% Pay</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">{isAr ? 'إجازة الوالدية (كلا الوالدين)' : 'Parental Leave (Both):'}</span>
              <span className="font-mono font-bold text-text">5d (100% Pay)</span>
            </div>
          </div>
        </GlassCard>

        {/* Bereavement & Special Leave */}
        <GlassCard className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-blue-400" />
              <span className="text-xs font-bold text-text">{isAr ? 'الإجازات الخاصة والحداد' : 'Bereavement & Special'}</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-300">
              UAE Law
            </span>
          </div>

          <div className="pt-2 border-t border-border/40 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">{isAr ? 'وفاة الزوج / الزوجة' : 'Death of Spouse:'}</span>
              <span className="font-mono font-bold text-text">5d (100% Pay)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">{isAr ? 'وفاة الأقارب من الدرجة 1-2' : 'Close Relative:'}</span>
              <span className="font-mono font-bold text-text">3d (100% Pay)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">{isAr ? 'إجازة الحج (لمرة واحدة)' : 'Hajj Leave (Once):'}</span>
              <span className="font-mono font-bold text-text">30d (Unpaid)</span>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
