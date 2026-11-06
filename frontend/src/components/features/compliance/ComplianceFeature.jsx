'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { getEnumLabel } from '../../../i18n/enums';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  FileText,
  Search,
  Filter,
  RefreshCw,
  Upload,
  CheckCircle2,
  Calendar,
  History,
  X,
  Eye,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import {
  getComplianceOverview,
  listComplianceDocuments,
  renewDocument,
  verifyDocument,
  getDocumentHistory,
} from '../../../services/complianceApi';
import { Select } from '../../primitives/form/Select';
import { useVisa } from '../../../context/VisaContext';
import { withVisa } from '../../../lib/visaQuery';

export default function ComplianceFeature() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { selectedVisaId } = useVisa();
  const isAr = language === 'ar';

  const [stats, setStats] = useState({
    total: 0,
    expired: 0,
    expiring30: 0,
    expiring60: 0,
    expiring90: 0,
    expiringSoon: 0,
    missingData: 0,
    valid: 0,
    pendingVerification: 0,
  });

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modal states
  const [renewModalDoc, setRenewModalDoc] = useState(null);
  const [historyModalDoc, setHistoryModalDoc] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formDocNumber, setFormDocNumber] = useState('');
  const [formIssueDate, setFormIssueDate] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formFile, setFormFile] = useState(null);
  const [message, setMessage] = useState(null);

  const canVerify = useMemo(() => {
    const roles = user?.roles || [];
    return roles.includes('COMPANY_ADMIN') || roles.includes('HR_MANAGER') || roles.includes('HR_OFFICER');
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewRes, listRes] = await Promise.all([
        getComplianceOverview(withVisa({}, selectedVisaId)),
        listComplianceDocuments(
          withVisa(
            {
              status: statusFilter !== 'ALL' ? statusFilter : undefined,
              doc_type: typeFilter !== 'ALL' ? typeFilter : undefined,
              search: search || undefined,
            },
            selectedVisaId
          )
        ),
      ]);

      if (overviewRes?.data) {
        setStats(overviewRes.data);
      } else if (overviewRes && !overviewRes.error) {
        setStats(overviewRes);
      }

      const items = Array.isArray(listRes) ? listRes : (listRes?.items || listRes?.data || []);
      setDocuments(items);
    } catch (err) {
      console.error('Failed to load compliance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, typeFilter, selectedVisaId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const openRenewModal = (doc) => {
    setRenewModalDoc(doc);
    setFormDocNumber(doc.doc_number || '');
    setFormIssueDate(doc.issue_date ? doc.issue_date.slice(0, 10) : '');
    setFormExpiryDate(doc.expiry_date ? doc.expiry_date.slice(0, 10) : '');
    setFormFile(null);
  };

  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    if (!formExpiryDate) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('doc_number', formDocNumber);
      if (formIssueDate) formData.append('issue_date', formIssueDate);
      formData.append('expiry_date', formExpiryDate);
      if (formFile) formData.append('file', formFile);

      await renewDocument(renewModalDoc.id, formData);
      setMessage({
        type: 'success',
        text: isAr ? 'تم رفع التجديد بنجاح وبانتظار تحقق الموارد البشرية' : 'Renewal submitted successfully for HR verification',
      });
      setRenewModalDoc(null);
      await loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (docId) => {
    try {
      await verifyDocument(docId);
      setMessage({
        type: 'success',
        text: isAr ? 'تم اعتماد وتأكيد صحة الوثيقة بنجاح' : 'Document verified successfully',
      });
      await loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const openHistoryModal = async (doc) => {
    setHistoryModalDoc(doc);
    setHistoryData(null);
    try {
      const res = await getDocumentHistory(doc.id);
      setHistoryData(res?.data || res);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-emerald-500" />
            {isAr ? 'راصد الامتثال وصلاحية الوثائق' : 'Document Expiry Tracker'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? 'متابعة صلاحية التأشيرات، الهويات الإماراتية، بطاقات العمل والتأمين الصحي'
              : 'UAE residency visas, Emirates IDs, labour cards, insurance expiry radar and renewals'}
          </p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {isAr ? 'تحديث البيانات' : 'Refresh'}
        </button>
      </div>

      {/* Alert toast */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bento Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Expired */}
        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-700 dark:text-rose-400">
              {isAr ? 'منتهية الصلاحية' : 'Expired'}
            </span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-900 dark:text-rose-200">{stats.expired || 0}</div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{isAr ? 'تحتاج تجديد فوري' : 'Needs immediate renewal'}</div>
        </div>

        {/* <= 30 Days */}
        <div className="p-4 rounded-xl border border-orange-200 dark:border-orange-900/60 bg-orange-50/60 dark:bg-orange-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-orange-700 dark:text-orange-400">
              {isAr ? 'خلال ٣٠ يوماً' : '≤ 30 Days'}
            </span>
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-orange-900 dark:text-orange-200">{stats.expiring30 || 0}</div>
          <div className="text-[11px] text-orange-600 dark:text-orange-400 mt-1">{isAr ? 'تنبيه عاجل' : 'Urgent milestone'}</div>
        </div>

        {/* <= 60 Days */}
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
              {isAr ? 'خلال ٦٠ يوماً' : '≤ 60 Days'}
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-200">{stats.expiring60 || 0}</div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">{isAr ? 'مرحلة الإعداد' : 'In preparation'}</div>
        </div>

        {/* <= 90 Days */}
        <div className="p-4 rounded-xl border border-yellow-200 dark:border-yellow-900/60 bg-yellow-50/60 dark:bg-yellow-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">
              {isAr ? 'خلال ٩٠ يوماً' : '≤ 90 Days'}
            </span>
            <Calendar className="w-4 h-4 text-yellow-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-yellow-900 dark:text-yellow-200">{stats.expiring90 || 0}</div>
          <div className="text-[11px] text-yellow-600 dark:text-yellow-400 mt-1">{isAr ? 'الرادار المبكر' : 'Early radar notice'}</div>
        </div>

        {/* Missing Data */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              {isAr ? 'بيانات ناقصة' : 'Missing Data'}
            </span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-800 dark:text-slate-200">{stats.missingData || 0}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{isAr ? 'بدون تاريخ انتهاء' : 'Missing expiry date'}</div>
        </div>

        {/* Total Documents */}
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {isAr ? 'إجمالي الوثائق' : 'Total Tracked'}
            </span>
            <FileCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-200">{stats.total || 0}</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">{stats.valid || 0} {isAr ? 'سارية المفعول' : 'Valid'}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-wrap gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={isAr ? 'بحث بالاسم أو كود الموظف أو رقم الوثيقة...' : 'Search employee, code, or document #...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
          >
            {isAr ? 'بحث' : 'Search'}
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status select */}
          <div className="min-w-[180px]">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              placeholder={isAr ? 'جميع الحالات' : 'All Statuses'}
              options={[
                { value: 'ALL', label: isAr ? 'جميع الحالات' : 'All Statuses' },
                { value: 'Expiring Soon', label: isAr ? 'توشك على الانتهاء (≤ 90 يوم)' : 'Expiring Soon (≤ 90d)' },
                { value: 'Expired', label: isAr ? 'منتهية الصلاحية' : 'Expired' },
                { value: 'Valid', label: isAr ? 'سارية المفعول' : 'Valid' },
                { value: 'Missing Data', label: isAr ? 'بيانات ناقصة' : 'Missing Data' },
                { value: 'Pending Verification', label: isAr ? 'بانتظار التحقق' : 'Pending Verification' },
              ]}
            />
          </div>

          {/* Type select */}
          <div className="min-w-[180px]">
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              placeholder={isAr ? 'جميع أنواع الوثائق' : 'All Document Types'}
              options={[
                { value: 'ALL', label: isAr ? 'جميع أنواع الوثائق' : 'All Document Types' },
                { value: 'VISA', label: isAr ? 'تأشيرة إقامة' : 'Residency Visa' },
                { value: 'EMIRATES_ID', label: isAr ? 'الهوية الإماراتية' : 'Emirates ID' },
                { value: 'PASSPORT', label: isAr ? 'جواز السفر' : 'Passport' },
                { value: 'LABOUR_CARD', label: isAr ? 'بطاقة العمل' : 'Labour Card' },
                { value: 'INSURANCE', label: isAr ? 'التأمين الصحي' : 'Health Insurance' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                <th className="py-3 px-4">{isAr ? 'الموظف' : 'Employee'}</th>
                <th className="py-3 px-4">{isAr ? 'القسم' : 'Department'}</th>
                <th className="py-3 px-4">{isAr ? 'نوع الوثيقة' : 'Document Type'}</th>
                <th className="py-3 px-4">{isAr ? 'رقم الوثيقة' : 'Document #'}</th>
                <th className="py-3 px-4">{isAr ? 'تاريخ الانتهاء' : 'Expiry Date'}</th>
                <th className="py-3 px-4">{isAr ? 'المدة المتبقية' : 'Days Remaining'}</th>
                <th className="py-3 px-4">{isAr ? 'الحالة' : 'Status'}</th>
                <th className="py-3 px-4">{isAr ? 'التحقق' : 'Verification'}</th>
                <th className="py-3 px-4 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                    {isAr ? 'جاري تحميل سجلات الامتثال...' : 'Loading compliance records...'}
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    {isAr ? 'لا توجد وثائق مطابقة لخيارات التصفية' : 'No documents match the current filters'}
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const days = doc.days_remaining;
                  let daysBadgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
                  if (days !== null && days !== undefined) {
                    if (days < 0) daysBadgeColor = 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400';
                    else if (days <= 30) daysBadgeColor = 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400';
                    else if (days <= 60) daysBadgeColor = 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400';
                    else if (days <= 90) daysBadgeColor = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400';
                    else daysBadgeColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400';
                  }

                  let statusBadgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
                  if (doc.status === 'Expired') statusBadgeColor = 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400';
                  else if (doc.status === 'Expiring Soon') statusBadgeColor = 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400';
                  else if (doc.status === 'Valid') statusBadgeColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400';

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                        <div data-i18n-skip>{isAr ? doc.employee_name_ar || doc.employee_name : doc.employee_name}</div>
                        <div className="text-xs text-slate-400 font-mono" data-i18n-skip>{doc.employee_code}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {(isAr ? doc.department_name_ar || doc.department_name : doc.department_name) || (isAr ? 'عام' : 'General')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          {getEnumLabel('document_type', doc.doc_type, language)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700 dark:text-slate-300" data-i18n-skip>
                        {doc.doc_number || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300" data-i18n-skip>
                        {doc.expiry_date ? new Date(doc.expiry_date).toISOString().slice(0, 10) : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${daysBadgeColor}`}>
                          {days !== null && days !== undefined
                            ? days < 0
                              ? `${Math.abs(days)} ${isAr ? 'يوم منتهية' : 'd expired'}`
                              : `${days} ${isAr ? 'يوم متبقية' : 'd left'}`
                            : '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadgeColor}`}>
                          {getEnumLabel('document_status', doc.status, language)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            doc.verification_status === 'Verified'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                          }`}
                        >
                          {doc.verification_status === 'Verified' ? (isAr ? 'معتمد' : 'Verified') : (isAr ? 'بانتظار التحقق' : 'Pending')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* HR Verify Button */}
                          {canVerify && doc.verification_status === 'Pending' && (
                            <button
                              onClick={() => handleVerify(doc.id)}
                              title={isAr ? 'اعتماد الوثيقة' : 'Verify Document'}
                              className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 transition-colors"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Upload Renewal */}
                          <button
                            onClick={() => openRenewModal(doc)}
                            title={isAr ? 'رفع التجديد' : 'Upload Renewal'}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                          >
                            <Upload className="w-4 h-4" />
                          </button>

                          {/* History */}
                          <button
                            onClick={() => openHistoryModal(doc)}
                            title={isAr ? 'سجل التجديدات' : 'Renewal History'}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                          >
                            <History className="w-4 h-4" />
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
      </div>

      {/* Renew Document Modal */}
      {renewModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-500" />
                {isAr ? 'رفع تجديد الوثيقة' : 'Upload Renewed Document'}
              </h3>
              <button
                onClick={() => setRenewModalDoc(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRenewSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  {isAr ? 'الموظف' : 'Employee'}
                </label>
                <input
                  type="text"
                  disabled
                  value={`${renewModalDoc.employee_name} (${renewModalDoc.employee_code})`}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    {isAr ? 'نوع الوثيقة' : 'Document Type'}
                  </label>
                  <input
                    type="text"
                    disabled
                    value={renewModalDoc.doc_type}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    {isAr ? 'رقم الوثيقة الجديد' : 'New Document #'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formDocNumber}
                    onChange={(e) => setFormDocNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    {isAr ? 'تاريخ الإصدار' : 'Issue Date'}
                  </label>
                  <input
                    type="date"
                    value={formIssueDate}
                    onChange={(e) => setFormIssueDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    {isAr ? 'تاريخ الانتهاء الجديد' : 'New Expiry Date'} *
                  </label>
                  <input
                    type="date"
                    required
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  {isAr ? 'الملف الجديد (PDF / صورة)' : 'New Document File (PDF / Image)'}
                </label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setFormFile(e.target.files[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 dark:file:bg-emerald-950/60 dark:file:text-emerald-300 hover:file:bg-emerald-100"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenewModalDoc(null)}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {isAr ? 'رفع واعتماد للتأكيد' : 'Submit Renewal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-500" />
                {isAr ? 'سجل تجديدات وتعديلات الوثيقة' : 'Document Version & Audit History'}
              </h3>
              <button
                onClick={() => setHistoryModalDoc(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-[450px] overflow-y-auto space-y-4">
              {!historyData ? (
                <div className="text-center py-8 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                  {isAr ? 'جاري استرجاع سجل الإصدارات...' : 'Fetching history snapshots...'}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                      {isAr ? 'النسخ السابقة المحفوظة' : 'Archived Version Snapshots'}
                    </h4>
                    {historyData.versions?.length === 0 ? (
                      <p className="text-xs text-slate-400">{isAr ? 'لا توجد نسخ سابقة محفوظة' : 'No previous version snapshots'}</p>
                    ) : (
                      <div className="space-y-2">
                        {historyData.versions?.map((v) => (
                          <div
                            key={v.id}
                            className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs"
                          >
                            <div className="flex justify-between items-center font-medium text-slate-800 dark:text-slate-200">
                              <span>Version #{v.version_no}</span>
                              <span className="text-slate-400 font-normal">
                                {new Date(v.created_at).toLocaleString()}
                              </span>
                            </div>
                            <div className="mt-1 text-slate-600 dark:text-slate-400 font-mono">
                              Doc #: {v.snapshot?.doc_number || '—'} | Expiry: {v.snapshot?.expiry_date ? new Date(v.snapshot.expiry_date).toISOString().slice(0, 10) : '—'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                      {isAr ? 'سجل التدقيق والتغييرات' : 'Audit Log Trail'}
                    </h4>
                    {historyData.auditLogs?.length === 0 ? (
                      <p className="text-xs text-slate-400">{isAr ? 'لا توجد حركات تدقيق' : 'No audit entries found'}</p>
                    ) : (
                      <div className="space-y-2">
                        {historyData.auditLogs?.map((log) => (
                          <div
                            key={log.id}
                            className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs flex justify-between items-start"
                          >
                            <div>
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                {log.action}
                              </span>
                              <span className="text-slate-500 dark:text-slate-400 ml-2">
                                by {log.user?.email || 'SYSTEM'}
                              </span>
                            </div>
                            <span className="text-slate-400">
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

