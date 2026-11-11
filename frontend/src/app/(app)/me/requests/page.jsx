'use client';

import React, { useState, useEffect } from 'react';
import {
  Send,
  Calendar,
  Clock,
  XCircle,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/primitives/form/Button';
import { Select } from '@/components/primitives/form/Select';
import { Modal } from '@/components/primitives/Modal';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { formatErrorMessage } from '@/utils/formatError';
import { getMyRequests, cancelMyRequest, submitMyRequest } from '@/services/meApi';

export default function MyRequestsPage() {
  const { language } = useLanguage();
  const { showSuccess, showError } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  // New Request Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newReqType, setNewReqType] = useState('MissingPunch');
  const [workDate, setWorkDate] = useState('2026-10-15');
  const [punchTime, setPunchTime] = useState('09:00');
  const [otHours, setOtHours] = useState('2.0');
  const [otType, setOtType] = useState('OT_NORMAL');
  const [reqReason, setReqReason] = useState('');
  const [submittingNew, setSubmittingNew] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadRequests = async () => {
    try {
      const list = await getMyRequests();
      setRequests(list || []);
    } catch (err) {
      console.warn('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleCancel = async (reqItem) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من إلغاء هذا الطلب؟' : 'Are you sure you want to cancel this pending request?')) {
      return;
    }
    setCancellingId(reqItem.id);
    try {
      await cancelMyRequest(reqItem.request_type, reqItem.id);
      showSuccess(language === 'ar' ? 'تم إلغاء الطلب بنجاح' : 'Request cancelled successfully');
      loadRequests();
    } catch (err) {
      showError(formatErrorMessage(err, language));
    } finally {
      setCancellingId(null);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!reqReason.trim()) {
      setModalError(language === 'ar' ? 'يرجى إدخال سبب الطلب' : 'Please provide a reason');
      return;
    }
    setSubmittingNew(true);
    setModalError('');
    try {
      if (newReqType === 'MissingPunch') {
        await submitMyRequest({
          type: 'MissingPunch',
          work_date: workDate,
          requested_time: `${workDate}T${punchTime}:00Z`,
          reason: reqReason.trim(),
        });
      } else {
        await submitMyRequest({
          type: 'Overtime',
          work_date: workDate,
          hours: Number(otHours),
          ot_type: otType,
          reason: reqReason.trim(),
          compensation: 'Pay',
        });
      }
      setIsNewModalOpen(false);
      setReqReason('');
      await loadRequests();
    } catch (err) {
      setModalError(err.message || 'Failed to submit request');
    } finally {
      setSubmittingNew(false);
    }
  };

  return (
    <div id="my-requests-container" className="space-y-6 animate-fadeIn pb-12 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text gold-page-title">
            {language === 'ar' ? 'طلباتي ومسار الموافقات' : 'My Requests & Approval Trails'}
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            {language === 'ar'
              ? 'متابعة حالة طلبات الإجازة والعمل الإضافي والبصمة، ومسار اعتماد المسؤولين، مع إمكانية الإلغاء للطلبات المعلقة'
              : 'Track status and audit trails of your submitted requests, with one-click cancellation for pending items'}
          </p>
        </div>
        <Button
          id="btn-new-request"
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsNewModalOpen(true)}
        >
          {language === 'ar' ? 'طلب جديد' : 'New Request'}
        </Button>
      </div>

      {/* Requests List */}
      <div className="glass-panel rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-text-muted">Loading submitted requests...</div>
        ) : requests.length === 0 ? (
          <div className="py-12 text-center text-xs text-text-muted">No requests submitted yet</div>
        ) : (
          <div className="divide-y divide-border/40">
            {requests.map((r) => {
              const isPending = r.status === 'Pending';
              const isExpanded = expandedId === r.id;

              return (
                <div key={r.id} className="p-4 sm:p-5 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-primary-wash text-primary flex-shrink-0 mt-0.5">
                        <Send className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-text">{r.title}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600' :
                            r.status === 'Rejected' ? 'bg-rose-500/10 text-rose-600' :
                            r.status === 'Cancelled' ? 'bg-slate-500/10 text-slate-500' :
                            'bg-amber-500/10 text-amber-600'
                          }`}>
                            {r.status}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">
                          Submitted on {new Date(r.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {isPending && (
                        <Button
                          size="xs"
                          variant="danger"
                          icon={<XCircle className="w-3 h-3" />}
                          loading={cancellingId === r.id}
                          onClick={() => handleCancel(r)}
                        >
                          {language === 'ar' ? 'إلغاء الطلب' : 'Cancel Request'}
                        </Button>
                      )}

                      {r.actions?.length > 0 && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : r.id)}
                          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 px-2 py-1"
                        >
                          <span>{language === 'ar' ? 'مسار الاعتماد' : 'Approval Trail'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Approval Trail Breakdown */}
                  {isExpanded && r.actions?.length > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border/60 text-xs space-y-2 animate-fadeIn">
                      <span className="font-bold text-text-muted text-[11px] uppercase block">
                        Approval Audit Trail
                      </span>
                      {r.actions.map((act, idx) => (
                        <div key={act.id || idx} className="flex items-center justify-between text-xs py-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                              {act.step_no}
                            </span>
                            <span className="font-medium text-text">{act.actor?.email || 'Approver'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${act.action === 'Approve' ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {act.action}
                            </span>
                            <span className="text-text-muted text-[10px]">
                              {new Date(act.action_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Request Modal */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title={language === 'ar' ? 'تقديم طلب جديد' : 'Submit New Request'}
        subtitle={language === 'ar' ? 'طلب تصحيح بصمة أو ساعات عمل إضافي' : 'Submit a missing punch or overtime request'}
      >
        <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
          {modalError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
              {modalError}
            </div>
          )}

          <div>
            <Select
              id="select-request-type"
              label="Request Type"
              value={newReqType}
              onChange={(e) => setNewReqType(e.target.value)}
              options={[
                { value: 'MissingPunch', label: 'Missing Punch Correction' },
                { value: 'Overtime', label: 'Overtime Request' },
              ]}
            />
          </div>

          <div>
            <label className="block font-semibold text-text mb-1">Work Date</label>
            <input
              id="input-work-date"
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-surface border border-border text-text"
              required
            />
          </div>

          {newReqType === 'MissingPunch' ? (
            <div>
              <label className="block font-semibold text-text mb-1">Punch Time (Asia/Dubai)</label>
              <input
                id="input-punch-time"
                type="time"
                value={punchTime}
                onChange={(e) => setPunchTime(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-surface border border-border text-text"
                required
              />
            </div>
          ) : (
            <>
              <div>
                <Select
                  id="select-ot-type"
                  label="Overtime Type"
                  value={otType}
                  onChange={(e) => setOtType(e.target.value)}
                  options={[
                    { value: 'OT_NORMAL', label: 'Normal Overtime (1.25x)' },
                    { value: 'OT_NIGHT', label: 'Night Overtime (1.50x)' },
                    { value: 'OT_REST', label: 'Rest Day Overtime (1.50x)' },
                    { value: 'OT_HOLIDAY', label: 'Public Holiday Overtime (1.50x)' },
                  ]}
                />
              </div>
              <div>
                <label className="block font-semibold text-text mb-1">Hours</label>
                <input
                  id="input-ot-hours"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="12"
                  value={otHours}
                  onChange={(e) => setOtHours(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-surface border border-border text-text"
                  required
                />
              </div>
            </>
          )}

          <div>
            <label className="block font-semibold text-text mb-1">Reason (Mandatory)</label>
            <textarea
              id="input-req-reason"
              rows={3}
              placeholder="State the reason for this request..."
              value={reqReason}
              onChange={(e) => setReqReason(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-surface border border-border text-text"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsNewModalOpen(false)}
              className="px-4 py-2 rounded-xl text-text-muted hover:text-text font-medium"
            >
              Cancel
            </button>
            <Button
              id="btn-submit-request-confirm"
              type="submit"
              variant="primary"
              loading={submittingNew}
            >
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
