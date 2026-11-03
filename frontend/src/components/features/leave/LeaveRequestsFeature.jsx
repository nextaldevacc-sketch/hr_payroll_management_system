'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import {
  CalendarDays,
  Plus,
  Check,
  X,
  AlertTriangle,
  Search,
  Filter,
  Paperclip,
  Clock,
  User,
  Inbox,
  FileText,
  UploadCloud,
  CheckCircle2,
  Calendar,
  Info,
} from 'lucide-react';
import { GlassCard } from '../../primitives/GlassCard';
import { StatusPill } from '../../primitives/StatusPill';
import { Modal } from '../../primitives/Modal';
import { Select } from '../../primitives/form/Select';
import { listLeaveRequests, getLeaveTypes, requestLeave, actOnLeave, getLeaveBalances } from '../../../services/leaveApi';

export default function LeaveRequestsFeature({ activeTab = 'all', onTabChange }) {
  const { user, language } = useAuth();
  const isAr = language === 'ar';

  const [currentTab, setCurrentTab] = useState(activeTab); // 'all' or 'inbox'
  const [requests, setRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // New Request Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [startDate, setStartDate] = useState('2026-10-19');
  const [endDate, setEndDate] = useState('2026-10-23');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayPeriod, setHalfDayPeriod] = useState('AM');
  const [reason, setReason] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [balancePreview, setBalancePreview] = useState(null);

  // Refusal Modal
  const [refusalModalOpen, setRefusalModalOpen] = useState(false);
  const [targetId, setTargetId] = useState(null);
  const [refusalReason, setRefusalReason] = useState('');
  const [refusing, setRefusing] = useState(false);

  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const canApprove = userRoles.some((r) => ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER'].includes(r));

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reqs, types] = await Promise.all([
        listLeaveRequests(),
        getLeaveTypes(),
      ]);
      setRequests(Array.isArray(reqs) ? reqs : (reqs?.items || []));
      setLeaveTypes(Array.isArray(types) ? types : []);
      if (Array.isArray(types) && types.length > 0 && !selectedTypeId) {
        setSelectedTypeId(types[0].id);
      }
    } catch (err) {
      console.error('Failed to load leave requests:', err);
      setError(err.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenNewRequest = async () => {
    setModalOpen(true);
    setSubmitError('');
    // Load balance preview
    try {
      const bals = await getLeaveBalances();
      setBalancePreview(bals);
    } catch (e) {
      // ignore
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setSubmitError(isAr ? 'سبب طلب الإجازة إلزامي' : 'Leave reason is required');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const formData = new FormData();
      formData.append('leave_type_id', selectedTypeId);
      formData.append('start_date', startDate);
      formData.append('end_date', isHalfDay ? startDate : endDate);
      formData.append('is_half_day', String(isHalfDay));
      if (isHalfDay) formData.append('half_day', halfDayPeriod);
      formData.append('reason', reason.trim());
      if (attachmentFile) {
        formData.append('attachment', attachmentFile);
      }

      await requestLeave(formData);
      setModalOpen(false);
      setReason('');
      setAttachmentFile(null);
      loadData();
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await actOnLeave(id, { action: 'Approve' });
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to approve');
    }
  };

  const handleOpenRefuse = (id) => {
    setTargetId(id);
    setRefusalReason('');
    setRefusalModalOpen(true);
  };

  const handleConfirmRefuse = async (e) => {
    e.preventDefault();
    if (!refusalReason.trim()) {
      alert(isAr ? 'سبب الرفض إلزامي' : 'Refusal reason is mandatory');
      return;
    }
    setRefusing(true);
    try {
      await actOnLeave(targetId, {
        action: 'Refuse',
        refusal_reason: refusalReason.trim(),
      });
      setRefusalModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to refuse');
    } finally {
      setRefusing(false);
    }
  };

  // Determine displayed requests
  const pendingInbox = requests.filter((r) => r.status === 'Pending');
  const displayedList = currentTab === 'inbox' ? pendingInbox : requests;

  const filteredRequests = displayedList.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = r.employee?.name?.toLowerCase() || '';
    const code = r.employee?.employee_number?.toLowerCase() || '';
    return name.includes(q) || code.includes(q);
  });

  return (
    <div className="space-y-4" data-testid="leave-requests-container">
      {/* Tab & Search Bar */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* View Switcher */}
            <div className="flex items-center gap-1 bg-surface/60 border border-border p-1 rounded-xl text-xs">
              <button
                type="button"
                id="tab-all-leave"
                data-testid="tab-all-leave"
                onClick={() => {
                  setCurrentTab('all');
                  if (onTabChange) onTabChange('all');
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 ${
                  currentTab === 'all'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>{isAr ? 'جميع طلبات الإجازة' : 'All Requests'}</span>
              </button>

              <button
                type="button"
                id="tab-inbox-leave"
                data-testid="tab-inbox-leave"
                onClick={() => {
                  setCurrentTab('inbox');
                  if (onTabChange) onTabChange('inbox');
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 ${
                  currentTab === 'inbox'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <Inbox className="w-3.5 h-3.5" />
                <span>{isAr ? 'صندوق الاعتماد' : 'Approval Inbox'}</span>
                {pendingInbox.length > 0 && (
                  <span className="w-5 h-5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-white flex items-center justify-center">
                    {pendingInbox.length}
                  </span>
                )}
              </button>
            </div>

            {/* Search Filter */}
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="leave-search-input"
                data-testid="leave-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'بحث بالموظف...' : 'Filter employee...'}
                className="bg-surface/60 border border-border pl-9 pr-3 py-1.5 rounded-xl text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary w-52"
              />
            </div>
          </div>

          <button
            type="button"
            id="new-leave-request-btn"
            data-testid="new-leave-request-btn"
            onClick={handleOpenNewRequest}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-on-primary hover:opacity-90 transition-opacity shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAr ? 'تقديم طلب إجازة جديد' : 'New Leave Request'}</span>
          </button>
        </div>
      </GlassCard>

      {/* Requests Table */}
      <GlassCard className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-text-muted flex flex-col items-center gap-2">
            <Clock className="w-6 h-6 animate-spin text-primary" />
            <p className="text-xs">{isAr ? 'جاري تحميل طلبات الإجازة...' : 'Loading leave requests...'}</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 text-xs">{error}</div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-text-muted">
            <Info className="w-8 h-8 mx-auto mb-2 opacity-60" />
            <p className="text-sm font-medium">
              {currentTab === 'inbox'
                ? isAr ? 'صندوق الاعتماد فارغ! لا توجد طلبات معلقة' : 'Inbox zero! No pending leave requests to approve.'
                : isAr ? 'لا توجد طلبات إجازة' : 'No leave requests found.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" id="leave-requests-table">
              <thead>
                <tr className="bg-surface/70 border-b border-border text-text-muted">
                  <th className="p-3.5 font-bold">{isAr ? 'الموظف' : 'Employee'}</th>
                  <th className="p-3.5 font-bold">{isAr ? 'نوع الإجازة' : 'Leave Type'}</th>
                  <th className="p-3.5 font-bold">{isAr ? 'الفترة' : 'Date Range'}</th>
                  <th className="p-3.5 font-bold text-center">{isAr ? 'أيام العمل' : 'Working Days'}</th>
                  <th className="p-3.5 font-bold">{isAr ? 'المرفق' : 'Attachment'}</th>
                  <th className="p-3.5 font-bold">{isAr ? 'السبب' : 'Reason'}</th>
                  {currentTab === 'inbox' && (
                    <th className="p-3.5 font-bold">{isAr ? 'مدة الانتظار (SLA)' : 'SLA Age'}</th>
                  )}
                  <th className="p-3.5 font-bold text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="p-3.5 font-bold text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-mono">
                {filteredRequests.map((req) => {
                  const startStr = new Date(req.start_date).toLocaleDateString(isAr ? 'ar-AE' : 'en-US', {
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'Asia/Dubai',
                  });
                  const endStr = new Date(req.end_date).toLocaleDateString(isAr ? 'ar-AE' : 'en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    timeZone: 'Asia/Dubai',
                  });

                  const isPending = req.status === 'Pending';
                  const isHalf = req.is_half_day;

                  return (
                    <tr key={req.id} className="hover:bg-surface/30 transition-colors">
                      <td className="p-3.5 font-sans">
                        <div className="font-semibold text-text">{req.employee?.name}</div>
                        <div className="text-[11px] text-text-muted">{req.employee?.employee_number}</div>
                      </td>
                      <td className="p-3.5 font-sans">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-surface border border-border text-text">
                          {isAr ? (req.leave_type?.name_ar || req.leave_type?.name) : req.leave_type?.name}
                        </span>
                        {isHalf && (
                          <span className="text-[10px] text-amber-400 block font-bold mt-0.5">
                            Half Day ({req.half_day})
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-sans text-text">
                        {isHalf ? startStr : `${startStr} → ${endStr}`}
                      </td>
                      <td className="p-3.5 text-center font-bold text-primary">
                        {Number(req.days_deducted).toFixed(1)}d
                      </td>
                      <td className="p-3.5 font-sans">
                        {req.attachment_url ? (
                          <a
                            href={req.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span>{isAr ? 'عرض' : 'Doc'}</span>
                          </a>
                        ) : (
                          <span className="text-text-muted text-[11px]">-</span>
                        )}
                      </td>
                      <td className="p-3.5 font-sans text-text-muted max-w-xs truncate" title={req.reason}>
                        {req.reason}
                      </td>
                      {currentTab === 'inbox' && (
                        <td className="p-3.5 font-sans">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/20">
                            1d pending
                          </span>
                        </td>
                      )}
                      <td className="p-3.5 text-center font-sans">
                        <StatusPill status={req.status} />
                      </td>
                      <td className="p-3.5 text-center font-sans">
                        {isPending && canApprove ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              id={`approve-leave-btn-${req.id}`}
                              data-testid={`approve-leave-btn-${req.id}`}
                              onClick={() => handleApprove(req.id)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>{isAr ? 'اعتماد' : 'Approve'}</span>
                            </button>
                            <button
                              type="button"
                              id={`refuse-leave-btn-${req.id}`}
                              data-testid={`refuse-leave-btn-${req.id}`}
                              onClick={() => handleOpenRefuse(req.id)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 border border-rose-500/30 flex items-center gap-1"
                            >
                              <X className="w-3 h-3" />
                              <span>{isAr ? 'رفض' : 'Refuse'}</span>
                            </button>
                          </div>
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

      {/* New Leave Request Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isAr ? 'تقديم طلب إجازة' : 'Request Leave'}
        subtitle={isAr ? 'يتم استبعاد العطلات الأسبوعية والرسمية تلقائياً من احتساب الأيام المستقطعة' : 'Weekends and UAE public holidays automatically excluded from deduction count'}
      >
        <form onSubmit={handleCreateRequest} className="space-y-4">
          <div>
            <Select
              id="new-leave-type"
              data-testid="new-leave-type"
              label={isAr ? 'نوع الإجازة' : 'Leave Type'}
              value={selectedTypeId}
              onChange={(e) => setSelectedTypeId(e.target.value)}
              options={leaveTypes.map((t) => ({
                value: t.id,
                label: isAr ? (t.name_ar || t.name) : t.name,
                meta: `${t.paid_percentage}% pay`,
              }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
                {isAr ? 'تاريخ البدء' : 'Start Date'}
              </label>
              <input
                type="date"
                id="new-leave-start"
                data-testid="new-leave-start"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-text font-mono focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
                {isAr ? 'تاريخ الانتهاء' : 'End Date'}
              </label>
              <input
                type="date"
                id="new-leave-end"
                data-testid="new-leave-end"
                disabled={isHalfDay}
                value={isHalfDay ? startDate : endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-text font-mono focus:ring-1 focus:ring-primary focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>

          {/* Half Day Option */}
          <div className="p-3 rounded-xl bg-surface border border-border/80 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-text">
              <input
                type="checkbox"
                id="new-leave-halfday"
                data-testid="new-leave-halfday"
                checked={isHalfDay}
                onChange={(e) => setIsHalfDay(e.target.checked)}
                className="rounded border-border text-primary focus:ring-0"
              />
              <span>{isAr ? 'إجازة نصف يوم (0.5 يوم)' : 'Half-Day Leave (0.5 days)'}</span>
            </label>

            {isHalfDay && (
              <div className="flex items-center gap-2 text-xs">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="halfDayPeriod"
                    value="AM"
                    checked={halfDayPeriod === 'AM'}
                    onChange={() => setHalfDayPeriod('AM')}
                    className="text-primary focus:ring-0"
                  />
                  <span>{isAr ? 'صباحي (AM)' : 'Morning (AM)'}</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="halfDayPeriod"
                    value="PM"
                    checked={halfDayPeriod === 'PM'}
                    onChange={() => setHalfDayPeriod('PM')}
                    className="text-primary focus:ring-0"
                  />
                  <span>{isAr ? 'مسائي (PM)' : 'Afternoon (PM)'}</span>
                </label>
              </div>
            )}
          </div>

          {/* Mandatory Attachment Upload */}
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1">
              {isAr ? 'المرفقات الثبوتية (إلزامية للمرضي > يومين، الأمومة، والحداد)' : 'Supporting Attachment (Required for Sick > 2d, Maternity, Bereavement)'}
            </label>
            <input
              type="file"
              id="new-leave-attachment"
              data-testid="new-leave-attachment"
              onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1 flex items-center justify-between">
              <span>{isAr ? 'سبب طلب الإجازة' : 'Leave Reason'}</span>
              <span className="text-rose-400 text-[11px]">*</span>
            </label>
            <textarea
              id="new-leave-reason"
              data-testid="new-leave-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isAr ? 'اذكر سبب الإجازة...' : 'State the reason for this leave request...'}
              className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs text-text placeholder:text-text-muted focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          {submitError && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
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
              id="submit-leave-btn"
              data-testid="submit-leave-btn"
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-on-primary hover:opacity-90 transition-opacity shadow-md disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting && <Clock className="w-3.5 h-3.5 animate-spin" />}
              <span>{isAr ? 'إرسال طلب الإجازة' : 'Submit Leave Request'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Refusal Modal */}
      <Modal
        isOpen={refusalModalOpen}
        onClose={() => setRefusalModalOpen(false)}
        title={isAr ? 'رفض طلب الإجازة' : 'Refuse Leave Request'}
        subtitle={isAr ? 'سبب الرفض إلزامي لإشعار الموظف وحفظ السجل' : 'Mandatory refusal reason for employee notification and audit'}
      >
        <form onSubmit={handleConfirmRefuse} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text mb-1">
              {isAr ? 'سبب الرفض' : 'Refusal Reason'}
            </label>
            <textarea
              id="leave-refusal-reason"
              data-testid="leave-refusal-reason"
              rows={3}
              value={refusalReason}
              onChange={(e) => setRefusalReason(e.target.value)}
              placeholder={isAr ? 'اذكر سبب الرفض...' : 'State the reason for rejecting leave request...'}
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
