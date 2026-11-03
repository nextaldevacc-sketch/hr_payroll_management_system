'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Clock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  X,
  Plus,
  Trash2,
  Lock,
} from 'lucide-react';
import { useLanguage } from '../../../../context/LanguageContext';
import { Select } from '../../../primitives/form/Select';
import {
  fetchSupportGrants,
  createSupportGrant,
  revokeSupportGrant,
} from '../../../../services/settingsApi';

export function SupportAccessDrawer({ isOpen, onClose }) {
  const { isRTL, language } = useLanguage();
  const isAr = language === 'ar';

  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [granting, setGranting] = useState(false);
  const [reason, setReason] = useState('Urgent payroll configuration troubleshooting');
  const [durationHours, setDurationHours] = useState('24');
  const [message, setMessage] = useState(null);

  const loadGrants = async () => {
    setLoading(true);
    try {
      const res = await fetchSupportGrants();
      const items = Array.isArray(res) ? res : (res?.data || []);
      setGrants(items);
    } catch (err) {
      console.error('Failed to load support grants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadGrants();
    }
  }, [isOpen]);

  const handleCreateGrant = async (e) => {
    e.preventDefault();
    setGranting(true);
    setMessage(null);
    try {
      await createSupportGrant({
        reason,
        duration_hours: parseInt(durationHours, 10),
      });
      setMessage({
        type: 'success',
        text: isAr ? 'تم منح صلاحية الدعم الفني بنجاح' : 'Support access granted successfully',
      });
      await loadGrants();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async (id) => {
    try {
      await revokeSupportGrant(id);
      setMessage({
        type: 'success',
        text: isAr ? 'تم إلغاء صلاحية الدعم الفني فوراً' : 'Support access revoked immediately',
      });
      await loadGrants();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  if (!isOpen) return null;

  const now = new Date();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-sm">
      <div className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 max-w-full flex pl-10 rtl:pl-0 rtl:pr-10">
        <div className="w-screen max-w-xl bg-white dark:bg-slate-900 border-l rtl:border-l-0 rtl:border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  {isAr ? 'صلاحيات الدعم الفني للمنصة (FR-PL3)' : 'Platform Support Access (FR-PL3)'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isAr
                    ? 'منح وإلغاء صلاحية مؤقتة لمهندسي المنصة مع تسجيل كل حركة'
                    : 'Time-limited access grants for platform engineers with full audit trails'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Toast message */}
            {message && (
              <div
                className={`p-3.5 rounded-xl flex items-center justify-between text-xs font-medium ${
                  message.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                <span>{message.text}</span>
                <button onClick={() => setMessage(null)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Grant New Access Box */}
            <form onSubmit={handleCreateGrant} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-500" />
                {isAr ? 'منح صلاحية دعم فني جديدة' : 'Grant New Support Access Window'}
              </h3>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'سبب منح الصلاحية (مطلوب)' : 'Troubleshooting Reason (Required)'}
                </label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. October bank file reconciliation issue"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <Select
                  label={isAr ? 'مدة الصلاحية' : 'Access Duration'}
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  options={[
                    { value: '2', label: `2 ${isAr ? 'ساعات' : 'Hours'}` },
                    { value: '4', label: `4 ${isAr ? 'ساعات' : 'Hours'}` },
                    { value: '8', label: `8 ${isAr ? 'ساعات' : 'Hours'}` },
                    { value: '24', label: `24 ${isAr ? 'ساعة (يوم كامل)' : 'Hours (1 Day)'}` },
                    { value: '48', label: `48 ${isAr ? 'ساعة (يومان)' : 'Hours (2 Days)'}` },
                    { value: '72', label: `72 ${isAr ? 'ساعة (3 أيام)' : 'Hours (3 Days)'}` },
                  ]}
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={granting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
                >
                  {granting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {isAr ? 'تأكيد منح الصلاحية' : 'Grant Support Access'}
                </button>
              </div>
            </form>

            {/* Existing Grants List */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isAr ? 'سجل الصلاحيات الممنوحة' : 'Granted Access History'}
              </h3>

              {loading ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-emerald-500" />
                  {isAr ? 'جاري التحميل...' : 'Loading grants...'}
                </div>
              ) : grants.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  {isAr ? 'لا توجد صلاحيات دعم فني سابقة' : 'No support access grants recorded'}
                </p>
              ) : (
                <div className="space-y-2.5">
                  {grants.map((g) => {
                    const starts = new Date(g.starts_at);
                    const ends = new Date(g.ends_at);
                    const isRevoked = Boolean(g.revoked_at);
                    const isExpired = now > ends;
                    const isActive = !isRevoked && !isExpired && now >= starts;

                    return (
                      <div
                        key={g.id}
                        className={`p-3.5 rounded-xl border text-xs transition-colors ${
                          isActive
                            ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                isActive
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                  : isRevoked
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {isActive ? (isAr ? 'نشط' : 'Active') : isRevoked ? (isAr ? 'ملغي' : 'Revoked') : (isAr ? 'منتهي' : 'Expired')}
                            </span>
                            <span className="font-mono text-slate-500 dark:text-slate-400">
                              {g.platform_user?.email || 'Platform Admin'}
                            </span>
                          </div>

                          {isActive && (
                            <button
                              onClick={() => handleRevoke(g.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                              {isAr ? 'إلغاء فوري' : 'Revoke'}
                            </button>
                          )}
                        </div>

                        <p className="text-slate-700 dark:text-slate-300 font-medium">{g.reason}</p>

                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap justify-between text-[11px] text-slate-400 font-mono">
                          <span>Starts: {starts.toLocaleString()}</span>
                          <span>Ends: {ends.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SupportAccessDrawer;

