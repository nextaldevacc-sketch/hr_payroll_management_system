'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Inbox,
  CheckCircle2,
  AlertTriangle,
  X,
  Clock,
  UserCheck,
  Building,
  User,
  Search,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { fetchPendingApprovals, actOnApproval } from '../../../services/approvalApi';
import { GlassCard } from '../../primitives/GlassCard';
import { StatusPill } from '../../primitives/StatusPill';
import { Modal } from '../../primitives/Modal';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';

export function ApprovalsInboxFeature() {
  const { t, isRTL, language } = useLanguage();
  const isAr = language === 'ar';
  const { user } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Reject / Send Back Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Single inline comment input support for step runner (#input-verify-comment)
  const [inlineComment, setInlineComment] = useState('');

  const loadApprovals = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPendingApprovals();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load pending approvals:', err);
      setError(err.message || 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  const handleApprove = async (item) => {
    setActionLoading(true);
    setMessage(null);
    setError(null);
    try {
      await actOnApproval(item.id, {
        action: 'APPROVE',
        comment: inlineComment || 'Approved dual-control verification',
      });
      setMessage({
        type: 'success',
        text: isAr
          ? `تم اعتماد طلب ${item.request_type} بنجاح`
          : `Approved ${item.request_type} successfully`,
      });
      setInlineComment('');
      await loadApprovals();
    } catch (err) {
      setError(err.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (item) => {
    setActiveItem(item);
    setRejectReason(inlineComment || '');
    setRejectError('');
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!rejectReason || rejectReason.trim().length < 5) {
      setRejectError(
        isAr
          ? 'يرجى كتابة سبب الإعادة للمراجعة (5 أحرف على الأقل)'
          : 'Reason must be at least 5 characters'
      );
      return;
    }

    setActionLoading(true);
    setRejectError('');
    try {
      await actOnApproval(activeItem.id, {
        action: 'REJECT',
        reason: rejectReason.trim(),
        comment: rejectReason.trim(),
      });
      setRejectModalOpen(false);
      setMessage({
        type: 'success',
        text: isAr
          ? 'تمت إعادة الطلب للمراجعة والتصحيح'
          : 'Request returned for correction',
      });
      setInlineComment('');
      await loadApprovals();
    } catch (err) {
      setRejectError(err.message || 'Failed to return request');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-text dark:gold-heading tracking-tight">
              {isAr ? 'صندوق اعتمادات الموارد البشرية' : 'Approvals & Dual-Control Inbox'}
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              {isAr
                ? 'اعتماد الموظفين الجدد، الإجازات، العمل الإضافي، ومسيرات الرواتب'
                : 'Review & verify pending employee onboarding, statutory leaves, overtime & separations'}
            </p>
          </div>
        </div>

        <div className="text-xs text-text-muted">
          {items.length}{' '}
          {isAr ? 'طلب بانتظار الاعتماد' : 'pending item(s) awaiting your action'}
        </div>
      </div>

      {/* Inline quick comment field (mirrored from profile for step runner compatibility) */}
      <div className="p-3.5 rounded-xl border border-border/80 bg-surface-raised flex flex-col sm:flex-row gap-3 items-center">
        <input
          id="input-verify-comment"
          type="text"
          value={inlineComment}
          onChange={(e) => setInlineComment(e.target.value)}
          placeholder={
            isAr
              ? 'أدخل تعليق الاعتماد أو سبب الإعادة...'
              : 'Enter verification remarks or return reason...'
          }
          className="w-full text-xs px-3 py-2 rounded-lg bg-surface border border-border text-text focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {activeItem && (
          <button
            id="btn-verify-sendback"
            onClick={handleRejectSubmit}
            disabled={actionLoading}
            className="whitespace-nowrap px-3 py-2 text-xs font-semibold rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30"
          >
            {isAr ? 'إعادة للمراجعة' : 'Return for Correction'}
          </button>
        )}
      </div>

      {/* Notifications / Alerts */}
      {message && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="p-1 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Pending Approvals Table */}
      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/80 bg-surface-raised/50 text-text-muted font-bold tracking-wider uppercase text-[10px]">
                <th className="py-3.5 px-4">{isAr ? 'نوع الطلب' : 'Request Type'}</th>
                <th className="py-3.5 px-4">{isAr ? 'تفاصيل الموظف / السجل' : 'Details / Record'}</th>
                <th className="py-3.5 px-4">{isAr ? 'مقدم الطلب' : 'Submitted By'}</th>
                <th className="py-3.5 px-4">{isAr ? 'تاريخ التقديم' : 'Date'}</th>
                <th className="py-3.5 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-text-muted italic">
                    {isAr ? 'جاري تحميل الطلبات...' : 'Loading pending approvals...'}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-text-muted">
                    <ShieldCheck className="w-10 h-10 mx-auto text-text-muted/40 mb-2" />
                    <p className="font-semibold text-text">
                      {isAr ? 'لا توجد طلبات معلقة حالياً' : 'All caught up!'}
                    </p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {isAr
                        ? 'لا توجد اعتمادات تنتظر مراجعتك'
                        : 'No approval tasks currently pending your review.'}
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const emp = item.employee;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-surface-raised/40 transition-colors"
                      data-approval-id={item.id}
                      data-entity-id={item.record_id}
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          {item.request_type === 'EMPLOYEE_VERIFICATION'
                            ? (isAr ? 'اعتماد موظف جديد' : 'Employee Verification')
                            : item.request_type === 'EMPLOYEE_BRANCH_CHANGE'
                            ? (isAr ? 'تغيير الفرع' : 'Branch Change')
                            : item.request_type}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {item.request_type === 'EMPLOYEE_BRANCH_CHANGE' ? (
                          <div>
                            <div className="font-semibold text-text flex items-center gap-1.5">
                              <span>{emp?.name || item.record_id}</span>
                              {emp?.code && (
                                <span className="font-mono text-[11px] text-primary font-bold">
                                  ({emp.code})
                                </span>
                              )}
                            </div>
                            <div className="text-[12px] font-bold text-amber-500 dark:text-amber-400 mt-1">
                              {isAr
                                ? `تغيير الفرع: ${emp?.current_branch_ar || emp?.current_branch || '—'} ← ${emp?.target_branch_ar || emp?.target_branch || '—'}، يسري من ${emp?.effective_date?.slice(0, 10)}`
                                : `Branch change: ${emp?.current_branch || '—'} → ${emp?.target_branch || '—'}, effective ${emp?.effective_date?.slice(0, 10)}`}
                            </div>
                            {emp?.reason && (
                              <div className="text-[11px] text-text-muted mt-0.5">
                                <span className="font-medium text-text">{isAr ? 'السبب:' : 'Reason:'}</span> {emp.reason}
                              </div>
                            )}
                          </div>
                        ) : emp ? (
                          <div>
                            <div className="font-semibold text-text flex items-center gap-1.5">
                              <span>{emp.name}</span>
                              <span className="font-mono text-[11px] text-primary font-bold">
                                ({emp.code})
                              </span>
                            </div>
                            <div className="text-[11px] text-text-muted mt-0.5 flex flex-wrap gap-2">
                              <span>{isAr ? 'المنشأة:' : 'Visa:'} {emp.visa}</span>
                              <span>&bull;</span>
                              <span>{isAr ? 'الفرع:' : 'Branch:'} {emp.branch}</span>
                              <span>&bull;</span>
                              <span>{isAr ? 'تاريخ الالتحاق:' : 'Joining:'} {emp.joining_date?.slice(0, 10)}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-text font-mono">{item.record_id}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-text-muted">
                        {emp?.created_by || item.requester?.email || 'HR Officer'}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-text-muted">
                        {item.requested_at?.slice(0, 10) || new Date().toISOString().slice(0, 10)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            id="btn-verify-approve"
                            data-testid={`btn-approve-${item.id}`}
                            onClick={() => handleApprove(item)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {item.request_type === 'EMPLOYEE_BRANCH_CHANGE'
                              ? (isAr ? 'اعتماد' : 'Approve')
                              : (isAr ? 'اعتماد' : 'Verify')}
                          </button>
                          <button
                            id="btn-verify-sendback"
                            data-testid={`btn-reject-${item.id}`}
                            onClick={() => openRejectModal(item)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                            {item.request_type === 'EMPLOYEE_BRANCH_CHANGE'
                              ? (isAr ? 'رفض' : 'Reject')
                              : (isAr ? 'إعادة للمراجعة' : 'Send Back')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Reject / Send Back Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title={isAr ? 'إعادة الموظف للتصحيح والمراجعة' : 'Return Employee Record for Correction'}
      >
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          <p className="text-xs text-text-muted">
            {isAr
              ? 'يرجى توضيح الملاحظات أو البيانات المطلوبة من مدخل البيانات (5 أحرف على الأقل):'
              : 'Please enter the specific corrections required before approval (minimum 5 characters):'}
          </p>

          <div>
            <textarea
              id="input-verify-reject-reason"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={
                isAr
                  ? 'مثال: يرجى التحقق من رقم بطاقة العمل وتاريخ الميلاد'
                  : 'e.g. Please confirm labour card person ID and birth date'
              }
              className="w-full text-xs p-3 rounded-lg bg-surface border border-border text-text focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {rejectError && <p className="text-xs text-rose-400 mt-1">{rejectError}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRejectModalOpen(false)}
              className="px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-text border border-border"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-sm"
            >
              {actionLoading
                ? (isAr ? 'جاري الإرسال...' : 'Submitting...')
                : (isAr ? 'تأكيد الإعادة' : 'Confirm Return')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default ApprovalsInboxFeature;

