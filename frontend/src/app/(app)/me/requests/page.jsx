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
} from 'lucide-react';
import { Button } from '@/components/primitives/form/Button';
import { useLanguage } from '@/context/LanguageContext';
import { getMyRequests, cancelMyRequest } from '@/services/meApi';

export default function MyRequestsPage() {
  const { language } = useLanguage();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

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
      alert(language === 'ar' ? 'تم إلغاء الطلب بنجاح' : 'Request cancelled successfully');
      loadRequests();
    } catch (err) {
      alert('Failed to cancel request: ' + err.message);
    } finally {
      setCancellingId(null);
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
    </div>
  );
}
