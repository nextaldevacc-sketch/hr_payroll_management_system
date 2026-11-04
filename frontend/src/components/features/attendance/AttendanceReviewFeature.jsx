'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building,
  Users,
  Lock,
  Calendar,
  Check,
} from 'lucide-react';
import { GlassCard } from '../../primitives/GlassCard';
import { StatusPill } from '../../primitives/StatusPill';
import { Select } from '../../primitives/form/Select';
import { useVisa } from '../../../context/VisaContext';
import { withVisa } from '../../../lib/visaQuery';
import { confirmManagerAttendance, confirmHRAttendance, getAttendanceGrid } from '../../../services/attendanceApi';

export default function AttendanceReviewFeature({ onConfirmed }) {
  const { user, language } = useAuth();
  const { selectedVisaId } = useVisa();
  const isAr = language === 'ar';

  const [periodFrom, setPeriodFrom] = useState('2026-10-01');
  const [periodTo, setPeriodTo] = useState('2026-10-31');

  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [stats, setStats] = useState({ totalDays: 0, pendingReview: 0, managerConfirmed: 0, hrConfirmed: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const isHRRole =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'COMPANY_ADMIN' ||
    user?.role === 'HR_MANAGER' ||
    user?.role === 'HR_OFFICER' ||
    user?.roles?.includes('HR_OFFICER') ||
    user?.roles?.includes('HR_MANAGER');
  const isManagerRole = isHRRole || user?.role === 'DEPT_MANAGER' || user?.roles?.includes('DEPT_MANAGER');

  const loadReviewStatus = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const grid = await getAttendanceGrid(withVisa({ from: periodFrom, to: periodTo }, selectedVisaId));
      if (grid) {
        setDepartments(grid.departments || []);
        if (grid.departments && grid.departments.length > 0 && !selectedDeptId) {
          setSelectedDeptId(grid.departments[0].id);
        }

        // Count review statuses
        let total = 0;
        let pending = 0;
        let mgr = 0;
        let hr = 0;

        (grid.grid || []).forEach((row) => {
          Object.values(row.days || {}).forEach((d) => {
            total++;
            if (d.review_status === 'HRConfirmed') hr++;
            else if (d.review_status === 'ManagerConfirmed') mgr++;
            else pending++;
          });
        });

        setStats({ totalDays: total, pendingReview: pending, managerConfirmed: mgr, hrConfirmed: hr });
      }
    } catch (err) {
      console.error('Failed to load review status:', err);
      setErrorMessage(err.message || 'Failed to load status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviewStatus();
  }, [periodFrom, periodTo, selectedVisaId]);

  const handleManagerConfirm = async () => {
    if (!selectedDeptId) return;
    setSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const res = await confirmManagerAttendance({
        department_id: selectedDeptId,
        period_from: periodFrom,
        period_to: periodTo,
      });
      setSuccessMessage(
        isAr
          ? `تم اعتماد حضور القسم بنجاح (${res.confirmed_count} سجل يومي)`
          : `Department attendance confirmed (${res.confirmed_count} days updated to ManagerConfirmed)`
      );
      loadReviewStatus();
      if (onConfirmed) onConfirmed();
    } catch (err) {
      setErrorMessage(err.message || (isAr ? 'فشل اعتماد القسم' : 'Failed to confirm department'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleHRConfirm = async () => {
    setSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const res = await confirmHRAttendance({
        period_from: periodFrom,
        period_to: periodTo,
      });
      setSuccessMessage(
        isAr
          ? `تم الاعتماد النهائي للشركة بنجاح (${res.confirmed_count} سجل يومي جاهز لمسير الرواتب)`
          : `Company attendance confirmed by HR (${res.confirmed_count} days locked & payroll-ready)`
      );
      loadReviewStatus();
      if (onConfirmed) onConfirmed();
    } catch (err) {
      setErrorMessage(err.message || (isAr ? 'فشل اعتماد الموارد البشرية' : 'Failed to confirm company attendance'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="attendance-review-container">
      {/* Top Banner & Period Selector */}
      <GlassCard className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-text flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span>{isAr ? 'مراجعة واعتماد الحضور الشهري (مسار التوثيق)' : 'Monthly Attendance Review & Sign-Off'}</span>
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {isAr
                ? 'المرحلة 1: يعتمد مدير القسم فريقه ← المرحلة 2: تعتمد الموارد البشرية الشركة بالكامل ليصبح جاهزاً للرواتب وقفل التعديل'
                : 'Step 1: Dept Manager confirms team → Step 2: HR Manager signs off company to lock records and mark Payroll-Ready.'}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-surface/60 border border-border px-3 py-1.5 rounded-xl">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs text-text-muted">{isAr ? 'الفترة:' : 'Period:'}</span>
            <input
              type="date"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
              className="bg-transparent text-xs text-text font-mono border-none focus:outline-none"
            />
            <span className="text-xs text-text-muted">→</span>
            <input
              type="date"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
              className="bg-transparent text-xs text-text font-mono border-none focus:outline-none"
            />
          </div>
        </div>
      </GlassCard>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-4 border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400">
              {isAr ? 'بانتظار مراجعة المدير' : 'Pending Review'}
            </span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-text mt-2">
            {stats.pendingReview}
          </div>
          <span className="text-[11px] text-text-muted">
            {isAr ? 'سجلات تتطلب مراجعة المشرف' : 'Days awaiting manager confirmation'}
          </span>
        </GlassCard>

        <GlassCard className="p-4 border-blue-500/20 bg-blue-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-400">
              {isAr ? 'معتمد من مدير القسم' : 'Manager Confirmed'}
            </span>
            <Check className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-text mt-2">
            {stats.managerConfirmed}
          </div>
          <span className="text-[11px] text-text-muted">
            {isAr ? 'جاهزة للاعتماد النهائي من HR' : 'Ready for final HR sign-off'}
          </span>
        </GlassCard>

        <GlassCard className="p-4 border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400">
              {isAr ? 'معتمد نهائياً (جاهز للرواتب)' : 'HR Confirmed (Locked)'}
            </span>
            <Lock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-text mt-2">
            {stats.hrConfirmed}
          </div>
          <span className="text-[11px] text-text-muted">
            {isAr ? 'مقفل وجاهز لمسير الرواتب' : 'Locked against edits, payroll ready'}
          </span>
        </GlassCard>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Action Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Department Manager Sign-Off */}
        <GlassCard className="p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h4 className="text-xs font-bold text-text">
                {isAr ? 'اعتماد مدير القسم (المرحلة 1)' : 'Department Manager Sign-Off (Step 1)'}
              </h4>
              <p className="text-[11px] text-text-muted">
                {isAr ? 'يؤكد صحة حضور وغياب وساعات عمل فريقه' : 'Confirms team hours, attendance, and overtime validity'}
              </p>
            </div>
          </div>

          <div>
            <Select
              id="confirm-dept-select"
              data-testid="confirm-dept-select"
              label={isAr ? 'حدد القسم للاعتماد:' : 'Select Department to Confirm:'}
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              options={departments.map((d) => ({
                value: d.id,
                label: isAr ? (d.name_ar || d.name) : d.name,
              }))}
            />
          </div>

          <button
            type="button"
            id="confirm-dept-btn"
            data-testid="confirm-dept-btn"
            disabled={submitting || !selectedDeptId}
            onClick={handleManagerConfirm}
            className="w-full py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Clock className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>{isAr ? 'اعتماد حضور القسم المحدد' : 'Confirm Department Attendance'}</span>
          </button>
        </GlassCard>

        {/* Step 2: HR Manager Sign-Off */}
        <GlassCard className="p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div>
              <h4 className="text-xs font-bold text-text">
                {isAr ? 'اعتماد الموارد البشرية النهائي (المرحلة 2)' : 'HR Manager Final Sign-Off (Step 2)'}
              </h4>
              <p className="text-[11px] text-text-muted">
                {isAr ? 'يقفل الشهر ضد التعديل ويجعل البيانات جاهزة للمسير' : 'Locks all company attendance and marks records Payroll-Ready'}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface border border-border/80 text-[11px] text-text-muted space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span>{isAr ? 'حماية بيانات الرواتب' : 'Payroll Immutability Protection'}</span>
            </div>
            <p>
              {isAr
                ? 'بمجرد اعتماد HR، لن يُسمح بأي تعديل يدوي على سجلات الحضور لهذا الشهر وفق معايير الحوكمة والتدقيق.'
                : 'Once confirmed by HR, attendance days are permanently locked against manual edits for audit integrity.'}
            </p>
          </div>

          <button
            type="button"
            id="confirm-hr-btn"
            data-testid="confirm-hr-btn"
            disabled={submitting || !isHRRole}
            onClick={handleHRConfirm}
            className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Clock className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>{isAr ? 'اعتماد حضور الشركة بالكامل (جاهز للرواتب)' : 'Confirm Company Attendance (Payroll Ready)'}</span>
          </button>
        </GlassCard>
      </div>
    </div>
  );
}
