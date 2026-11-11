'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../context/ToastContext';
import { formatErrorMessage } from '../../../utils/formatError';
import {
  Clock,
  Plus,
  Check,
  X,
  AlertTriangle,
  Search,
  Filter,
  CheckCheck,
  User,
  Calendar,
  Layers,
  ChevronDown,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { GlassCard } from '../../primitives/GlassCard';
import { StatusPill } from '../../primitives/StatusPill';
import { Modal } from '../../primitives/Modal';
import { Select } from '../../primitives/form/Select';
import { listOvertime, requestOvertime, actOnOvertime, bulkApproveOvertime } from '../../../services/overtimeApi';

const OT_TYPE_LABELS = {
  OT_NORMAL: { en: 'Normal OT (1.25x)', ar: 'إضافي عادي (1.25x)', color: 'blue' },
  OT_NIGHT: { en: 'Night OT 22-04 (1.50x)', ar: 'إضافي ليلي 22-04 (1.50x)', color: 'purple' },
  OT_REST: { en: 'Rest Day OT (1.50x)', ar: 'إضافي راحة أسبوعية (1.50x)', color: 'indigo' },
  OT_HOLIDAY: { en: 'Public Holiday (1.50x)', ar: 'إضافي عطلة رسمية (1.50x)', color: 'emerald' },
};

export default function OvertimeRequestsFeature() {
  const { user, language } = useAuth();
  const { showError, showSuccess } = useToast();
  const isAr = language === 'ar';

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // New Request Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newWorkDate, setNewWorkDate] = useState('2026-10-15');
  const [newHours, setNewHours] = useState('2.0');
  const [newOtType, setNewOtType] = useState('OT_NORMAL');
  const [newCompensation, setNewCompensation] = useState('Pay');
  const [newReason, setNewReason] = useState('');
  const [submittingNew, setSubmittingNew] = useState(false);
  const [modalError, setModalError] = useState('');

  // Refusal Modal
  const [refusalModalOpen, setRefusalModalOpen] = useState(false);
  const [targetRequestId, setTargetRequestId] = useState(null);
  const [refusalReason, setRefusalReason] = useState('');
  const [refusing, setRefusing] = useState(false);

  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const canApprove = userRoles.some((r) => ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER'].includes(r));

  const loadRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listOvertime({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setRequests(Array.isArray(data) ? data : (data?.items || []));
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Failed to load overtime requests:', err);
      setError(err.message || 'Failed to load overtime');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  // Bulk Select Toggle
  const handleToggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAllPending = () => {
    const pendingIds = requests.filter((r) => r.status === 'Pending').map((r) => r.id);
    if (selectedIds.size === pendingIds.length && pendingIds.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingIds));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setBulkProcessing(true);
    try {
      await bulkApproveOvertime(Array.from(selectedIds));
      showSuccess(isAr ? 'تم اعتماد ساعات العمل الإضافي بنجاح' : 'Overtime requests approved successfully');
      loadRequests();
    } catch (err) {
      showError(formatErrorMessage(err, language) || (isAr ? 'فشل الاعتماد الجماعي' : 'Bulk approval failed'));
    } finally {
      setBulkProcessing(false);
    }
  };

  // Action on single overtime item
  const handleAction = async (id, action, customType = null, customComp = null) => {
    try {
      await actOnOvertime(id, {
        action,
        otType: customType,
        compensation: customComp,
      });
      showSuccess(isAr ? 'تم تنفيذ الإجراء بنجاح' : 'Action executed successfully');
      loadRequests();
    } catch (err) {
      showError(formatErrorMessage(err, language) || (isAr ? 'فشل تنفيذ الإجراء' : 'Action failed'));
    }
  };

  const handleOpenRefusal = (id) => {
    setTargetRequestId(id);
    setRefusalReason('');
    setRefusalModalOpen(true);
  };

  const handleConfirmRefusal = async (e) => {
    e.preventDefault();
    if (!refusalReason.trim()) {
      showError(isAr ? 'سبب الرفض إلزامي' : 'Refusal reason is mandatory');
      return;
    }
    setRefusing(true);
    try {
      await actOnOvertime(targetRequestId, {
        action: 'Refuse',
        reason: refusalReason.trim(),
      });
      setRefusalModalOpen(false);
      showSuccess(isAr ? 'تم رفض الطلب بنجاح' : 'Request refused successfully');
      loadRequests();
    } catch (err) {
      showError(formatErrorMessage(err, language) || (isAr ? 'فشل الرفض' : 'Refusal failed'));
    } finally {
      setRefusing(false);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!newReason.trim()) {
      setModalError(isAr ? 'سبب العمل الإضافي إلزامي' : 'Overtime reason is required');
      return;
    }
    setSubmittingNew(true);
    setModalError('');
    try {
      await requestOvertime({
        employee_id: newEmployeeId || undefined,
        work_date: newWorkDate,
        hours: Number(newHours),
        ot_type: newOtType,
        compensation: newCompensation,
        reason: newReason.trim(),
      });
      setModalOpen(false);
      setNewReason('');
      loadRequests();
    } catch (err) {
      setModalError(err.message || 'Failed to submit request');
    } finally {
      setSubmittingNew(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = r.employee?.name?.toLowerCase() || '';
    const code = r.employee?.employee_number?.toLowerCase() || '';
    return name.includes(q) || code.includes(q);
  });

  return (
    <div className="space-y-4" data-testid="overtime-requests-container">
      {/* Controls Header */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="ot-search-input"
                data-testid="ot-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'بحث بالموظف أو الرقم...' : 'Filter employee...'}
                className="bg-surface/60 border border-border pl-9 pr-3 py-1.5 rounded-xl text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary w-52"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 bg-surface/60 border border-border p-1 rounded-xl text-xs">
              {['ALL', 'Pending', 'Approved', 'Refused'].map((st) => (
                <button
                  key={st}
                  type="button"
                  id={`ot-tab-${st}`}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                    statusFilter === st
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  {st === 'ALL'
                    ? isAr ? 'الكل' : 'All'
                    : st === 'Pending'
                    ? isAr ? 'قيد الانتظار' : 'Pending'
                    : st === 'Approved'
                    ? isAr ? 'معتمد' : 'Approved'
                    : isAr ? 'مرفوض' : 'Refused'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canApprove && selectedIds.size > 0 && (
              <button
                type="button"
                id="bulk-approve-ot-btn"
                data-testid="bulk-approve-ot-btn"
                disabled={bulkProcessing}
                onClick={handleBulkApprove}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-md flex items-center gap-2"
              >
                {bulkProcessing ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
                <span>
                  {isAr ? `اعتماد جماعي (${selectedIds.size})` : `Bulk Approve (${selectedIds.size})`}
                </span>
              </button>
            )}

            <button
              type="button"
              id="new-ot-request-btn"
              data-testid="new-ot-request-btn"
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-on-primary hover:opacity-90 transition-opacity shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'طلب عمل إضافي جديد' : 'New Overtime Request'}</span>
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Requests Table */}
      <GlassCard className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-text-muted flex flex-col items-center gap-2">
            <Clock className="w-6 h-6 animate-spin text-primary" />
            <p className="text-xs">{isAr ? 'جاري تحميل طلبات العمل الإضافي...' : 'Loading overtime requests...'}</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 text-xs">{error}</div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-text-muted">
            <Info className="w-8 h-8 mx-auto mb-2 opacity-60" />
            <p className="text-sm font-medium">
              {isAr ? 'لا توجد طلبات عمل إضافي' : 'No overtime requests found'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" id="overtime-table">
              <thead>
                <tr className="bg-surface/70 border-b border-border text-text-muted">
                  {canApprove && (
                    <th className="p-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          selectedIds.size > 0 &&
                          selectedIds.size === requests.filter((r) => r.status === 'Pending').length
                        }
                        onChange={handleSelectAllPending}
                        className="rounded border-border text-primary focus:ring-0"
                      />
                    </th>
                  )}
                  <th className="p-3.5 font-bold">{isAr ? 'الموظف' : 'Employee'}</th>
                  <th className="p-3.5 font-bold">{isAr ? 'التاريخ' : 'Work Date'}</th>
                  <th className="p-3.5 font-bold text-center">{isAr ? 'الساعات' : 'Hours'}</th>
                  <th className="p-3.5 font-bold">{isAr ? 'النوع المقترح' : 'OT Type & Rate'}</th>
                  <th className="p-3.5 font-bold">{isAr ? 'التعويض' : 'Comp.'}</th>
                  <th className="p-3.5 font-bold">{isAr ? 'السبب' : 'Reason'}</th>
                  <th className="p-3.5 font-bold text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="p-3.5 font-bold text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-mono">
                {filteredRequests.map((req) => {
                  const dateStr = new Date(req.work_date).toLocaleDateString(isAr ? 'ar-AE' : 'en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'Asia/Dubai',
                  });

                  const otConfig = OT_TYPE_LABELS[req.ot_type] || { en: req.ot_type, ar: req.ot_type, color: 'blue' };
                  const isSelf = user?.id === req.employee?.user_id;
                  const isPending = req.status === 'Pending';
                  const isSelected = selectedIds.has(req.id);

                  return (
                    <tr
                      key={req.id}
                      className={`hover:bg-surface/30 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                    >
                      {canApprove && (
                        <td className="p-3.5 text-center">
                          {isPending && !isSelf ? (
                            <input
                              type="checkbox"
                              data-testid={`ot-checkbox-${req.id}`}
                              checked={isSelected}
                              onChange={() => handleToggleSelect(req.id)}
                              className="rounded border-border text-primary focus:ring-0"
                            />
                          ) : null}
                        </td>
                      )}
                      <td className="p-3.5 font-sans">
                        <div className="font-semibold text-text" data-i18n-skip>{req.employee?.name}</div>
                        <div className="text-[11px] text-text-muted" data-i18n-skip>{req.employee?.employee_number}</div>
                      </td>
                      <td className="p-3.5 font-sans text-text">{dateStr}</td>
                      <td className="p-3.5 text-center font-bold text-primary">
                        {Number(req.hours).toFixed(1)}h
                      </td>
                      <td className="p-3.5 font-sans">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-surface border border-border text-text block w-fit">
                          {isAr ? otConfig.ar : otConfig.en}
                        </span>
                        {req.rate && (
                          <span className="text-[10px] text-text-muted font-mono block mt-0.5">
                            Rate: AED {Number(req.rate).toFixed(2)}/h
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          req.compensation === 'SubstituteDay'
                            ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {req.compensation === 'SubstituteDay' ? (isAr ? 'يوم بديل' : 'Sub Day') : (isAr ? 'صرف مالي' : 'Pay')}
                        </span>
                      </td>
                      <td className="p-3.5 font-sans text-text-muted max-w-xs truncate" title={req.reason}>
                        {req.reason}
                      </td>
                      <td className="p-3.5 text-center font-sans">
                        <StatusPill status={req.status} />
                      </td>
                      <td className="p-3.5 text-center font-sans">
                        {isPending ? (
                          isSelf ? (
                            <div className="flex items-center justify-center gap-1 text-[11px] text-amber-400" title="Self-approval is strictly forbidden">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>{isAr ? 'حظر الموافقة الذاتية' : 'Self-Approval Blocked'}</span>
                            </div>
                          ) : canApprove ? (
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Quick Approve (Pay) */}
                              <button
                                type="button"
                                data-testid={`ot-approve-btn-${req.id}`}
                                onClick={() => handleAction(req.id, 'Approve')}
                                title="Approve with Pay"
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                <span>{isAr ? 'اعتماد' : 'Approve'}</span>
                              </button>

                              {/* Quick Approve as Substitute Day */}
                              <button
                                type="button"
                                data-testid={`ot-subday-btn-${req.id}`}
                                onClick={() => handleAction(req.id, 'Approve', req.ot_type, 'SubstituteDay')}
                                title="Approve as Substitute Day Off"
                                className="px-2 py-1 rounded-lg text-xs font-semibold bg-purple-600/15 text-purple-300 hover:bg-purple-600/25 border border-purple-500/20"
                              >
                                {isAr ? 'بديل' : 'Sub Day'}
                              </button>

                              {/* Refuse */}
                              <button
                                type="button"
                                data-testid={`ot-refuse-btn-${req.id}`}
                                onClick={() => handleOpenRefusal(req.id)}
                                title="Refuse"
                                className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/20"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-text-muted text-[11px]">{isAr ? 'قيد المراجعة' : 'Under Review'}</span>
                          )
                        ) : (
                          <span className="text-text-muted text-[11px] font-mono">
                            {req.approver?.name || '-'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* New Overtime Request Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isAr ? 'تقديم طلب عمل إضافي' : 'Submit Overtime Request'}
        subtitle={isAr ? 'يتم احتساب السعر تلقائياً بناءً على الراتب الأساسي وفترة العمل' : 'Rate computed automatically from contract basic salary and working window'}
      >
        <form onSubmit={handleCreateRequest} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
                {isAr ? 'تاريخ العمل الإضافي' : 'Work Date'}
              </label>
              <input
                type="date"
                id="new-ot-date"
                data-testid="new-ot-date"
                value={newWorkDate}
                onChange={(e) => setNewWorkDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-text font-mono focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
                {isAr ? 'ساعات العمل الإضافي' : 'Overtime Hours'}
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="8.0"
                id="new-ot-hours"
                data-testid="new-ot-hours"
                value={newHours}
                onChange={(e) => setNewHours(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-text font-mono focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Select
                id="new-ot-type"
                data-testid="new-ot-type"
                label={isAr ? 'نوع العمل الإضافي' : 'Overtime Category'}
                value={newOtType}
                onChange={(e) => setNewOtType(e.target.value)}
                options={[
                  { value: 'OT_NORMAL', label: 'Normal Day (1.25x)' },
                  { value: 'OT_NIGHT', label: 'Night Window 22:00-04:00 (1.50x)' },
                  { value: 'OT_REST', label: 'Rest Day Work (1.50x)' },
                  { value: 'OT_HOLIDAY', label: 'Public Holiday (1.50x)' },
                ]}
              />
            </div>

            <div>
              <Select
                id="new-ot-compensation"
                data-testid="new-ot-compensation"
                label={isAr ? 'طريقة التعويض المفضلة' : 'Preferred Compensation'}
                value={newCompensation}
                onChange={(e) => setNewCompensation(e.target.value)}
                options={[
                  { value: 'Pay', label: isAr ? 'صرف مالي مع الراتب' : 'Financial Pay (with payroll)' },
                  { value: 'SubstituteDay', label: isAr ? 'يوم راحة بديل' : 'Substitute Day Off' },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1 flex items-center justify-between">
              <span>{isAr ? 'سبب العمل الإضافي والتفاصيل' : 'Overtime Justification & Reason'}</span>
              <span className="text-rose-400 text-[11px]">*</span>
            </label>
            <textarea
              id="new-ot-reason"
              data-testid="new-ot-reason"
              rows={3}
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder={isAr ? 'اذكر سبب العمل الإضافي والمهام المنجزة...' : 'Describe urgent workload, deployment window, or project deliverable...'}
              className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs text-text placeholder:text-text-muted focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          {modalError && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-surface border border-border text-text hover:bg-surface-hover"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              id="submit-ot-btn"
              data-testid="submit-ot-btn"
              disabled={submittingNew}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-on-primary hover:opacity-90 transition-opacity shadow-md disabled:opacity-50 flex items-center gap-1.5"
            >
              {submittingNew && <Clock className="w-3.5 h-3.5 animate-spin" />}
              <span>{isAr ? 'إرسال الطلب للاعتماد' : 'Submit Overtime Request'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Refusal Reason Modal */}
      <Modal
        isOpen={refusalModalOpen}
        onClose={() => setRefusalModalOpen(false)}
        title={isAr ? 'رفض طلب العمل الإضافي' : 'Refuse Overtime Request'}
        subtitle={isAr ? 'سبب الرفض إلزامي للإشعار والتدقيق' : 'Mandatory refusal reason for notification and audit'}
      >
        <form onSubmit={handleConfirmRefusal} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text mb-1">
              {isAr ? 'سبب الرفض' : 'Refusal Reason'}
            </label>
            <textarea
              id="ot-refusal-reason"
              data-testid="ot-refusal-reason"
              rows={3}
              value={refusalReason}
              onChange={(e) => setRefusalReason(e.target.value)}
              placeholder={isAr ? 'اذكر سبب الرفض...' : 'State the reason for rejecting overtime request...'}
              className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs text-text placeholder:text-text-muted focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={() => setRefusalModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-surface border border-border text-text hover:bg-surface-hover"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={refusing}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-500 transition-colors shadow-sm disabled:opacity-50"
            >
              {refusing ? (isAr ? 'جاري الرفض...' : 'Rejecting...') : (isAr ? 'تأكيد الرفض' : 'Confirm Refusal')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
