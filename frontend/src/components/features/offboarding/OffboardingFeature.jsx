'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { getEnumLabel } from '../../../i18n/enums';
import {
  UserMinus,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  FileSpreadsheet,
  Download,
  Lock,
  ArrowRight,
  ShieldAlert,
  Building,
  User,
  Check,
  ChevronRight,
  RefreshCw,
  XCircle,
  Calendar,
  DollarSign,
  Briefcase,
} from 'lucide-react';
import {
  listSeparations,
  getSeparation,
  createSeparation,
  actOnSeparation,
  updateClearanceItem,
  updateSeparationTask,
} from '../../../services/separationsApi';
import {
  getSettlementBySeparation,
  prepareSettlement,
  validateSettlement,
  approveSettlement,
  paySettlement,
  getSettlementPdfUrl,
} from '../../../services/settlementsApi';
import { fetchEmployees } from '../../../services/employeesApi';
import { request } from '../../../services/apiClient';
import { Select } from '../../primitives/form/Select';

export function OffboardingFeature() {
  const { user, seesSalary } = useAuth();
  const { t, language, dir } = useLanguage();
  const isRtl = dir === 'rtl';

  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'clearance' | 'settlement'
  const [separations, setSeparations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedSeparation, setSelectedSeparation] = useState(null);
  const [settlement, setSettlement] = useState(null);
  const [settlementLoading, setSettlementLoading] = useState(false);

  // Modals
  const [isInitiateModalOpen, setIsInitiateModalOpen] = useState(false);
  const [isClearItemModalOpen, setIsClearItemModalOpen] = useState(false);
  const [activeClearItem, setActiveClearItem] = useState(null);

  // Form states
  const [employeesList, setEmployeesList] = useState([]);
  const [newSepData, setNewSepData] = useState({
    employee_id: '',
    type: 'Resignation',
    notice_date: new Date().toISOString().slice(0, 10),
    last_working_day: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    reason: '',
  });

  const [clearItemForm, setClearItemForm] = useState({
    status: 'Cleared',
    amount_due: 0,
    note: '',
  });

  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Fetch separations list
  const fetchSeparations = async () => {
    try {
      setLoading(true);
      const res = await listSeparations();
      const items = Array.isArray(res) ? res : (res?.items || res?.data?.items || res?.data || []);
      setSeparations(items);
    } catch (err) {
      console.error('Failed to load separations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeparations();
  }, []);

  // Fetch employees for create modal
  useEffect(() => {
    if (isInitiateModalOpen && employeesList.length === 0) {
      fetchEmployees({ limit: 100 })
        .then((res) => {
          const list = Array.isArray(res) ? res : (res?.items || res?.data?.items || res?.data || []);
          setEmployeesList(list);
        })
        .catch((err) => console.error(err));
    }
  }, [isInitiateModalOpen, employeesList.length]);

  // Load detailed separation & settlement when selected
  const handleSelectSeparation = async (sep, targetTab = 'clearance') => {
    try {
      setSelectedSeparation(sep);
      setActiveTab(targetTab);
      setActionError(null);
      setActionSuccess(null);

      // Refresh full separation details
      const detailRes = await getSeparation(sep.id);
      const fullSep = detailRes?.data !== undefined && detailRes?.data !== null ? detailRes.data : detailRes;
      setSelectedSeparation(fullSep || sep);

      if (seesSalary) {
        setSettlementLoading(true);
        try {
          const setRes = await getSettlementBySeparation(sep.id);
          const fullSet = setRes?.data !== undefined && setRes?.data !== null ? setRes.data : setRes;
          setSettlement(fullSet || null);
        } catch {
          setSettlement(null);
        } finally {
          setSettlementLoading(false);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered separations
  const filteredSeparations = useMemo(() => {
    return separations.filter((s) => {
      const matchStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'PENDING' && s.status === 'Pending') ||
        (filterStatus === 'APPROVED' && s.status === 'Approved') ||
        (filterStatus === 'COMPLETED' && s.final_settlement?.status === 'Paid');

      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        s.employee?.name?.toLowerCase().includes(q) ||
        s.employee?.arabic_name?.includes(q) ||
        s.employee?.employee_code?.toLowerCase().includes(q);

      return matchStatus && matchQuery;
    });
  }, [separations, filterStatus, searchQuery]);

  // Handle Initiate Separation
  const handleCreateSeparationSubmit = async (e) => {
    e.preventDefault();
    setActionError(null);
    try {
      await createSeparation(newSepData);
      setIsInitiateModalOpen(false);
      setNewSepData({
        employee_id: '',
        type: 'Resignation',
        notice_date: new Date().toISOString().slice(0, 10),
        last_working_day: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
        reason: '',
      });
      fetchSeparations();
    } catch (err) {
      setActionError(err.message || 'Failed to initiate separation');
    }
  };

  // Handle Approve Separation
  const handleApproveSeparation = async () => {
    if (!selectedSeparation) return;
    setActionError(null);
    try {
      await actOnSeparation(selectedSeparation.id, { action: 'Approve' });
      setActionSuccess('Separation approved. Multi-department clearance checklist activated.');
      handleSelectSeparation(selectedSeparation, 'clearance');
      fetchSeparations();
    } catch (err) {
      setActionError(err.message || 'Failed to approve separation');
    }
  };

  // Handle Clear Item modal
  const openClearItemModal = (item) => {
    setActiveClearItem(item);
    setClearItemForm({
      status: item.status || 'Cleared',
      amount_due: Number(item.amount_due || 0),
      note: item.note || '',
    });
    setIsClearItemModalOpen(true);
  };

  const handleClearItemSubmit = async (e) => {
    e.preventDefault();
    setActionError(null);
    try {
      await updateClearanceItem(activeClearItem.id, clearItemForm);
      setIsClearItemModalOpen(false);
      const detailRes = await getSeparation(selectedSeparation.id);
      setSelectedSeparation(detailRes?.data !== undefined ? detailRes.data : detailRes);
      fetchSeparations();
    } catch (err) {
      setActionError(err.message || 'Failed to update clearance item');
    }
  };

  const handleUpdateTask = async (taskId, newStatus, refNo, note) => {
    try {
      setActionError(null);
      await updateSeparationTask(taskId, {
        status: newStatus,
        reference_number: refNo,
        note,
      });
      setActionSuccess('Cancellation task updated successfully.');
      if (selectedSeparation) {
        handleSelectSeparation(selectedSeparation, activeTab);
      }
      fetchSeparations();
    } catch (err) {
      setActionError(err.message || 'Failed to update cancellation task');
    }
  };

  // Settlement actions
  const handlePrepareSettlement = async () => {
    if (!selectedSeparation) return;
    setActionError(null);
    try {
      const res = await prepareSettlement(selectedSeparation.id);
      setSettlement(res?.data !== undefined ? res.data : res);
      setActionSuccess('Settlement calculated and prepared successfully.');
      fetchSeparations();
    } catch (err) {
      setActionError(err.message || 'Failed to prepare settlement');
    }
  };

  const handleValidateSettlement = async () => {
    if (!settlement) return;
    setActionError(null);
    try {
      const res = await validateSettlement(settlement.id);
      setSettlement(res?.data !== undefined ? res.data : res);
      setActionSuccess('Settlement validated by HR Manager.');
      fetchSeparations();
    } catch (err) {
      setActionError(err.message || 'Failed to validate settlement');
    }
  };

  const handleApproveSettlement = async () => {
    if (!settlement) return;
    setActionError(null);
    try {
      const res = await approveSettlement(settlement.id);
      setSettlement(res?.data !== undefined ? res.data : res);
      setActionSuccess('Settlement approved by General Manager. Financial snapshot is now frozen.');
      fetchSeparations();
    } catch (err) {
      setActionError(err.message || 'Failed to approve settlement');
    }
  };

  const handlePaySettlement = async () => {
    if (!settlement) return;
    setActionError(null);
    try {
      const res = await paySettlement(settlement.id);
      setSettlement(res?.data !== undefined ? res.data : res);
      setActionSuccess('Settlement marked as Paid by Finance.');
      fetchSeparations();
    } catch (err) {
      setActionError(err.message || 'Failed to mark settlement as paid');
    }
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    if (!settlement) return;
    try {
      const blob = await request(getSettlementPdfUrl(settlement.id), { responseType: 'blob' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Settlement_${selectedSeparation?.employee?.employee_code || 'Payslip'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      setActionError('Failed to download PDF');
    }
  };

  // Download Excel Reports
  const handleDownloadGratuityReport = async () => {
    try {
      const blob = await request('/settlements/reports/gratuity-provision', { responseType: 'blob' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Gratuity_Provision_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      setActionError('Failed to download gratuity provision report');
    }
  };

  const handleDownloadLeaveLiabilityReport = async () => {
    try {
      const blob = await request('/settlements/reports/leave-liability', { responseType: 'blob' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Leave_Liability_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      setActionError('Failed to download leave liability report');
    }
  };

  const hasUnclearedClearance = useMemo(() => {
    if (!selectedSeparation?.clearance_items) return true;
    return selectedSeparation.clearance_items.some((c) => c.status !== 'Cleared');
  }, [selectedSeparation]);

  const snap = settlement?.snapshot || {};

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <UserMinus className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {t('offboarding.title')}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {t('offboarding.subtitle')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {seesSalary && (
            <>
              <button
                onClick={handleDownloadGratuityReport}
                className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                title="Download UAE Statutory Gratuity Provision Excel Report"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                <span>{language === 'ar' ? 'تقرير مكافأة نهاية الخدمة' : 'Gratuity Report'}</span>
              </button>
              <button
                onClick={handleDownloadLeaveLiabilityReport}
                className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                title="Download Leave Liability Excel Report"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-500" />
                <span>{language === 'ar' ? 'تقرير مستحقات الإجازات' : 'Leave Liability'}</span>
              </button>
            </>
          )}

          <button
            onClick={() => setIsInitiateModalOpen(true)}
            className="px-4 py-2 text-sm font-bold rounded-lg bg-primary text-black hover:opacity-90 flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t('offboarding.newSeparation')}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('list')}
          className={`pb-3 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'list'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>{t('offboarding.tabs.separations')}</span>
          <span className="px-1.5 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-normal">
            {separations.length}
          </span>
        </button>

        {selectedSeparation && (
          <>
            <button
              onClick={() => setActiveTab('clearance')}
              className={`pb-3 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'clearance'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t('offboarding.clearance.title')}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 font-mono">
                {selectedSeparation.employee?.employee_code}
              </span>
            </button>

            {seesSalary && (
              <button
                onClick={() => setActiveTab('settlement')}
                className={`pb-3 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 ${
                  activeTab === 'settlement'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>{t('offboarding.tabs.settlement')}</span>
                {settlement && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      settlement.status === 'Paid'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        : settlement.status === 'Approved'
                        ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {getEnumLabel('settlement_status', settlement.status, language)}
                  </span>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* Global Alerts */}
      {actionError && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{actionError}</div>
          <button onClick={() => setActionError(null)} className="text-red-500 hover:text-red-700">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{actionSuccess}</div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-700">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: SEPARATIONS LIST */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white/60 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {language === 'ar' ? 'التصفية:' : 'Filters:'}
              </span>
              {['ALL', 'PENDING', 'APPROVED', 'COMPLETED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    filterStatus === st
                      ? 'bg-amber-500 text-slate-950 dark:bg-amber-400 dark:text-slate-950 shadow-sm font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {language === 'ar'
                    ? ({ ALL: 'الكل', PENDING: 'قيد الانتظار', APPROVED: 'معتمد', COMPLETED: 'مكتمل' }[st] || st)
                    : st}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="py-3.5 px-4">{t('offboarding.fields.employee')}</th>
                    <th className="py-3.5 px-4">{t('offboarding.fields.type')}</th>
                    <th className="py-3.5 px-4">{t('offboarding.fields.lastWorkingDay')}</th>
                    <th className="py-3.5 px-4">{t('offboarding.fields.clearanceStatus')}</th>
                    <th className="py-3.5 px-4">{t('offboarding.fields.settlementStatus')}</th>
                    {seesSalary && <th className="py-3.5 px-4 text-right">{t('offboarding.fields.netPayable')}</th>}
                    <th className="py-3.5 px-4 text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
                        Loading offboarding records...
                      </td>
                    </tr>
                  ) : filteredSeparations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No offboarding records found.
                      </td>
                    </tr>
                  ) : (
                    filteredSeparations.map((sep) => (
                      <tr
                        key={sep.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                        onClick={() => handleSelectSeparation(sep, 'clearance')}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white" data-i18n-skip>
                            {sep.employee?.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <span className="font-mono" data-i18n-skip>{sep.employee?.employee_code}</span>
                            {sep.employee?.arabic_name && (
                              <span className="font-arabic">· {sep.employee?.arabic_name}</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              sep.type === 'Resignation'
                                ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                                : 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300'
                            }`}
                          >
                            {getEnumLabel('separation_reason', sep.type, language)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                          {new Date(sep.last_working_day).toISOString().slice(0, 10)}
                        </td>

                        <td className="py-3.5 px-4">
                          {sep.all_clearance_cleared ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {getEnumLabel('clearance_status', 'All Cleared', language)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                              <Clock className="w-3.5 h-3.5" />
                              {sep.pending_clearance_count} {language === 'ar' ? 'معلق' : 'Pending'}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {sep.final_settlement ? (
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                sep.final_settlement.status === 'Paid'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                  : sep.final_settlement.status === 'Approved'
                                  ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                                  : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                              }`}
                            >
                              {getEnumLabel('settlement_status', sep.final_settlement.status, language)}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">
                              {getEnumLabel('settlement_status', 'Not Prepared', language)}
                            </span>
                          )}
                        </td>

                        {seesSalary && (
                          <td className="py-3.5 px-4 text-right font-mono font-semibold">
                            {sep.final_settlement ? (
                              <span
                                className={
                                  Number(sep.final_settlement.net_payable) < 0
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-slate-900 dark:text-white'
                                }
                              >
                                AED {Number(sep.final_settlement.net_payable).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        )}

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectSeparation(sep, 'clearance');
                            }}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          >
                            {language === 'ar' ? 'إدارة' : 'Manage'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLEARANCE CHECKLIST */}
      {activeTab === 'clearance' && selectedSeparation && (
        <div className="space-y-6">
          {/* Employee & Separation Card */}
          <div className="bg-white/80 dark:bg-slate-900/80 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedSeparation.employee?.name}
                </h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {selectedSeparation.employee?.employee_code}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    selectedSeparation.status === 'Approved'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {getEnumLabel('separation_status', selectedSeparation.status, language)}
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                <span>Type: <strong>{selectedSeparation.type}</strong></span>
                <span>Notice Date: <strong>{new Date(selectedSeparation.notice_date).toISOString().slice(0, 10)}</strong></span>
                <span>Last Working Day: <strong>{new Date(selectedSeparation.last_working_day).toISOString().slice(0, 10)}</strong></span>
                {selectedSeparation.notice_shortfall_days > 0 && (
                  <span className="text-rose-600 font-semibold">
                    Shortfall: {selectedSeparation.notice_shortfall_days} days
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedSeparation.status === 'Pending' && (
                <button
                  onClick={handleApproveSeparation}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Approve Separation
                </button>
              )}

              {seesSalary && (
                <button
                  onClick={() => setActiveTab('settlement')}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5"
                >
                  <DollarSign className="w-4 h-4" />
                  Open Settlement
                </button>
              )}
            </div>
          </div>

          {/* T35 Warning: uncleared items */}
          {hasUnclearedClearance && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 text-amber-600" />
              <span>
                <strong>Article 51 / T35 Gate:</strong> Final settlement cannot be approved while any clearance item is pending. Each department owner must clear their item and record any amount due.
              </span>
            </div>
          )}

          {/* Clearance Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedSeparation.clearance_items?.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all ${
                  item.status === 'Cleared'
                    ? 'bg-white dark:bg-slate-900 border-emerald-500/30'
                    : 'bg-white dark:bg-slate-900 border-amber-500/30 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold uppercase text-slate-400">
                      {item.department?.name || 'Department'}
                    </span>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                      {item.item}
                    </h3>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      item.status === 'Cleared'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                  <div>Assigned Owner: <strong>{item.owner_user?.email || 'Department Manager'}</strong></div>
                  {Number(item.amount_due) > 0 && (
                    <div className="text-rose-600 dark:text-rose-400 font-semibold">
                      Amount Due to Deduct: AED {Number(item.amount_due).toFixed(2)}
                    </div>
                  )}
                  {item.note && <div className="italic text-slate-600 dark:text-slate-300">Note: {item.note}</div>}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={() => openClearItemModal(item)}
                    className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    Update Clearance
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Cancellation Tasks (FR-OF7) */}
          <div className="mt-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  {t('offboarding.tasks.title')}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('offboarding.tasks.subtitle')}
                </p>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {selectedSeparation.tasks?.length || 0} Tasks
              </span>
            </div>

            {(!selectedSeparation.tasks || selectedSeparation.tasks.length === 0) ? (
              <div className="text-center py-6 text-xs text-slate-400">
                No active cancellation tasks. Tasks are automatically scheduled upon final working date and approved settlement.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedSeparation.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {task.task_type === 'VISA_CANCELLATION'
                          ? t('offboarding.tasks.visaTask')
                          : t('offboarding.tasks.labourTask')}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          task.status === 'Done'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : task.status === 'In Progress'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {task.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 space-y-1">
                      <div>Due Date: <strong>{new Date(task.due_date).toLocaleDateString()}</strong></div>
                      {task.reference_number && (
                        <div>Reference #: <strong className="font-mono">{task.reference_number}</strong></div>
                      )}
                      {task.note && <div className="italic">{task.note}</div>}
                    </div>

                    {task.status !== 'Done' && (
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <button
                          onClick={() => {
                            const ref = prompt('Enter cancellation reference / application number:', task.reference_number || '');
                            if (ref !== null) {
                              handleUpdateTask(task.id, 'Done', ref, task.note);
                            }
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                        >
                          {t('offboarding.tasks.markDone')}
                        </button>
                        {task.status === 'Open' && (
                          <button
                            onClick={() => handleUpdateTask(task.id, 'In Progress', task.reference_number, task.note)}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                          >
                            {t('offboarding.tasks.markInProgress')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: FINAL SETTLEMENT BENTO */}
      {activeTab === 'settlement' && selectedSeparation && seesSalary && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Final Settlement: {selectedSeparation.employee?.name}
                </h2>
                {settlement && ['Approved', 'Paid'].includes(settlement.status) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <Lock className="w-3 h-3" />
                    {t('offboarding.settlement.frozenBadge')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Statutory UAE Labour Law calculation · Frozen upon General Manager approval
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {!settlement ? (
                <button
                  onClick={handlePrepareSettlement}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-white shadow-sm flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {t('offboarding.settlement.prepare')}
                </button>
              ) : (
                <>
                  {settlement.status === 'Prepared' && (
                    <button
                      onClick={handleValidateSettlement}
                      disabled={hasUnclearedClearance}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-sm flex items-center gap-1.5"
                      title={hasUnclearedClearance ? 'Cannot validate while clearance items are open' : ''}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {t('offboarding.settlement.validate')}
                    </button>
                  )}

                  {settlement.status === 'Validated' && (
                    <button
                      onClick={handleApproveSettlement}
                      disabled={hasUnclearedClearance}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-sm flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      {t('offboarding.settlement.approve')}
                    </button>
                  )}

                  {settlement.status === 'Approved' && (
                    <button
                      onClick={handlePaySettlement}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {t('offboarding.settlement.pay')}
                    </button>
                  )}

                  <button
                    onClick={handleDownloadPdf}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {t('offboarding.settlement.downloadPdf')}
                  </button>
                </>
              )}
            </div>
          </div>

          {settlementLoading ? (
            <div className="py-12 text-center text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-rose-500" />
              Loading final settlement figures...
            </div>
          ) : !settlement ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
              <DollarSign className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                {language === 'ar' ? 'لم يتم إعداد تسوية نهائية' : 'No Final Settlement Prepared'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                {language === 'ar'
                  ? 'احتساب الراتب النسبي حتى آخر يوم عمل، مكافأة المادة 51، وبدل الإجازات بالضغط على إعداد التسوية.'
                  : 'Calculate pro-rated salary to last day, Article 51 gratuity, and leave encashment by clicking Prepare Settlement.'}
              </p>
              <button
                onClick={handlePrepareSettlement}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-white"
              >
                {language === 'ar' ? 'إعداد التسوية الآن' : 'Prepare Settlement Now'}
              </button>
            </div>
          ) : (
            <>
              {/* Negative Net Banner */}
              {snap.is_negative_net && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                  <div className="text-sm">
                    <strong>{t('offboarding.settlement.negativeNetWarning')}</strong>{' '}
                    <span className="font-mono font-bold text-rose-700 dark:text-rose-300">
                      AED {Math.abs(Number(settlement.net_payable)).toFixed(2)}
                    </span>
                    . Recoveries exceed dues.
                  </div>
                </div>
              )}

              {/* Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Tile 1: Service Period */}
                <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    Service Period
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    {snap.service_years ? Number(snap.service_years).toFixed(2) : '—'} <span className="text-sm font-normal text-slate-500">years</span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between">
                      <span>Joining Date:</span>
                      <span className="font-mono">{snap.joining_date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Working Day:</span>
                      <span className="font-mono">{snap.last_working_day}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Calendar Days:</span>
                      <span className="font-mono">{snap.raw_calendar_days}</span>
                    </div>
                    <div className="flex justify-between text-rose-600 font-medium">
                      <span>Unpaid Absence Days:</span>
                      <span className="font-mono">-{snap.unpaid_absence_days || 0}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                      <span>Net Service Days:</span>
                      <span className="font-mono">{snap.net_service_days}</span>
                    </div>
                  </div>
                </div>

                {/* Tile 2: Gratuity Breakdown */}
                <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider">
                    <Briefcase className="w-4 h-4" />
                    Statutory Gratuity (Art. 51)
                  </div>
                  <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                    AED {Number(settlement.gratuity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between">
                      <span>Daily Wage (Basic×12÷365):</span>
                      <span className="font-mono">AED {Number(snap.basic_daily_wage || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>1st 5 Years (21d/yr):</span>
                      <span className="font-mono">{snap.gratuity_working?.step1_days_up_to_5y || 0} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span>After 5 Years (30d/yr):</span>
                      <span className="font-mono">{snap.gratuity_working?.step2_days_over_5y || 0} days</span>
                    </div>
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Max Cap (24mo Basic):</span>
                      <span className="font-mono">AED {Number(snap.gratuity_working?.cap_amount || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Tile 3: Leave Encashment & Salary Due */}
                <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" />
                    Salary &amp; Leave Encashment
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    AED {Number(Number(settlement.salary_due) + Number(settlement.leave_encashment)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between">
                      <span>Salary to Last Day:</span>
                      <span className="font-mono font-semibold">AED {Number(settlement.salary_due).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Unused Annual Leave:</span>
                      <span className="font-mono">{settlement.leave_encashment_days} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Leave Encashment (Daily Basic):</span>
                      <span className="font-mono font-semibold">AED {Number(settlement.leave_encashment).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deductions & Net Pay Banner */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Deductions & Recoveries */}
                <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {t('offboarding.settlement.totalRecoveries')}
                  </h3>
                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between">
                      <span>{t('offboarding.settlement.noticeShortfall')}:</span>
                      <span className="font-mono text-rose-600 font-semibold">-AED {Number(settlement.notice_recovery).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('offboarding.settlement.loanRecovery')}:</span>
                      <span className="font-mono text-rose-600 font-semibold">-AED {Number(settlement.loan_recovery).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('offboarding.settlement.trainingRecovery')}:</span>
                      <span className="font-mono text-rose-600 font-semibold">-AED {Number(settlement.training_recovery).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('offboarding.settlement.clearanceRecovery')}:</span>
                      <span className="font-mono text-rose-600 font-semibold">-AED {Number(settlement.clearance_recovery).toFixed(2)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between font-bold text-rose-600">
                      <span>Total Recoveries:</span>
                      <span className="font-mono">-AED {Number(snap.total_recoveries || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Net Payable Highlight */}
                <div className="p-6 rounded-xl bg-slate-900 text-white shadow-lg flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {t('offboarding.settlement.netPayable')}
                    </span>
                    <div className="text-3xl font-black mt-2 text-sky-400 font-mono">
                      AED {Number(settlement.net_payable).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span>Status: <strong>{settlement.status}</strong></span>
                    <span>Ref: #{settlement.id.slice(0, 8)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* MODAL: Initiate Separation */}
      {isInitiateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {t('offboarding.newSeparation')}
              </h3>
              <button
                onClick={() => setIsInitiateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSeparationSubmit} className="p-5 space-y-4">
              <div>
                <Select
                  label={t('offboarding.fields.employee')}
                  required
                  placeholder="Select Employee..."
                  value={newSepData.employee_id}
                  onChange={(e) => setNewSepData({ ...newSepData, employee_id: e.target.value })}
                  options={employeesList.map((emp) => ({
                    value: emp.id,
                    label: `${emp.employee_code} - ${emp.name}`,
                    meta: emp.arabic_name || undefined,
                  }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Select
                    label={t('offboarding.fields.type')}
                    value={newSepData.type}
                    onChange={(e) => setNewSepData({ ...newSepData, type: e.target.value })}
                    options={[
                      { value: 'Resignation', label: t('offboarding.types.resignation') },
                      { value: 'Termination', label: t('offboarding.types.termination') },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('offboarding.fields.noticeDate')}
                  </label>
                  <input
                    type="date"
                    required
                    value={newSepData.notice_date}
                    onChange={(e) => setNewSepData({ ...newSepData, notice_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('offboarding.fields.lastWorkingDay')}
                </label>
                <input
                  type="date"
                  required
                  value={newSepData.last_working_day}
                  onChange={(e) => setNewSepData({ ...newSepData, last_working_day: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('offboarding.fields.reason')}
                </label>
                <textarea
                  rows={3}
                  value={newSepData.reason}
                  onChange={(e) => setNewSepData({ ...newSepData, reason: e.target.value })}
                  placeholder="Reason for resignation or termination..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInitiateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-primary text-black hover:opacity-90 shadow-sm transition-all"
                >
                  Submit Separation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Update Clearance Item */}
      {isClearItemModalOpen && activeClearItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  {activeClearItem.department?.name}
                </span>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {activeClearItem.item}
                </h3>
              </div>
              <button
                onClick={() => setIsClearItemModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleClearItemSubmit} className="p-5 space-y-4">
              <div>
                <Select
                  label="Status"
                  value={clearItemForm.status}
                  onChange={(e) => setClearItemForm({ ...clearItemForm, status: e.target.value })}
                  options={[
                    { value: 'Pending', label: 'Pending (Not Cleared)' },
                    { value: 'Cleared', label: 'Cleared (Approved)' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Amount Due to Recover (AED)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={clearItemForm.amount_due}
                  onChange={(e) => setClearItemForm({ ...clearItemForm, amount_due: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  placeholder="0.00"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Deducted directly from employee final settlement dues.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Asset Condition
                </label>
                <textarea
                  rows={3}
                  value={clearItemForm.note}
                  onChange={(e) => setClearItemForm({ ...clearItemForm, note: e.target.value })}
                  placeholder="Asset condition, serial numbers, remarks..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsClearItemModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-primary text-black hover:opacity-90 shadow-sm transition-all"
                >
                  Save Clearance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default OffboardingFeature;

