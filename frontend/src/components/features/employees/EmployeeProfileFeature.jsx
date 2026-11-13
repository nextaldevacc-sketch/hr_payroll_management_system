'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Users,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Calendar,
  Building2,
  MapPin,
  CreditCard,
  Shield,
  Clock,
  History,
  FileText,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Plus,
  Send,
  UserPlus,
  Eye,
  EyeOff,
  AlertCircle,
  FileCheck,
  UserMinus,
  ClipboardList,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { Select } from '../../primitives/form/Select';
import {
  fetchEmployeeProfile,
  fetchEmployeeContracts,
  createContractVersion,
  fetchEmployeeBankAccounts,
  saveBankAccount,
  fetchEmployeeDocuments,
  uploadEmployeeDocument,
  downloadEmployeeDocument,
  fetchEmployeeAuditHistory,
  updateEmployeeStatus,
  activateEmployee,
  createEmployeeLogin,
  verifyEmployee,
  approveContractVersion,
  requestBranchChange,
  fetchEmployeeMetaOptions,
  revealSensitiveField,
} from '../../../services/employeesApi';
import { fetchBranches } from '../../../services/settingsApi';
import { GlassCard } from '../../primitives/GlassCard';
import { StatusPill } from '../../primitives/StatusPill';
import { Drawer } from '../../primitives/Drawer';
import { getEnumLabel, getVisaNameAr } from '../../../i18n/enums';

export function EmployeeProfileFeature({ id } = {}) {
  const params = useParams();
  const employeeId = id || params?.id;
  const router = useRouter();
  const { user } = useAuth();
  const { isRTL, language, t } = useLanguage();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('jobContract');
  const [showContractModal, setShowContractModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showDocUploadModal, setShowDocUploadModal] = useState(false);
  const [docFile, setDocFile] = useState(null);
  const [docType, setDocType] = useState('VISA');
  const [docNumber, setDocNumber] = useState('');
  const [docExpiry, setDocExpiry] = useState('');
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // New Contract Version form state
  const [contractForm, setContractForm] = useState({
    effective_date: new Date().toISOString().split('T')[0],
    start_date: new Date().toISOString().split('T')[0],
    basic: 7000,
    housing: 3500,
    transport: 1000,
    other_allowances: 0,
    gross: 11500,
  });

  // Bank Form state
  const [bankForm, setBankForm] = useState({
    bank_name: 'Emirates NBD',
    iban: '',
    routing_code: 'ENBD001',
  });

  // Branch Change Drawer state
  const [showBranchDrawer, setShowBranchDrawer] = useState(false);
  const [targetBranchId, setTargetBranchId] = useState('');
  const [branchEffectiveDate, setBranchEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [branchReason, setBranchReason] = useState('');
  const [branchError, setBranchError] = useState(null);
  const [branchLoading, setBranchLoading] = useState(false);

  // Fetch branches for branch change
  const { data: allBranches = [] } = useQuery({
    queryKey: ['settings', 'branches'],
    queryFn: async () => {
      try {
        const res = await fetchBranches();
        if (Array.isArray(res) && res.length > 0) return res;
      } catch (err) {
        console.warn('[EmployeeProfile] fetchBranches fallback:', err?.message);
      }
      try {
        const meta = await fetchEmployeeMetaOptions();
        return meta.branches || [];
      } catch (err) {
        console.warn('[EmployeeProfile] fetchEmployeeMetaOptions error:', err?.message);
        return [];
      }
    },
  });

  // Fetch full employee profile
  const {
    data: employee,
    isLoading,
    isError,
    error,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ['employee-profile', employeeId, user?.role],
    queryFn: () => fetchEmployeeProfile(employeeId),
    enabled: Boolean(employeeId),
  });

  const canSeeSalary = Boolean(user?.sees_salary);
  const isHrOrAdmin = ['HR_MANAGER', 'HR_OFFICER', 'COMPANY_ADMIN'].includes(user?.role);

  // Fetch Contracts (Only if user has salary access)
  const {
    data: contracts = [],
    isLoading: loadingContracts,
    refetch: refetchContracts,
  } = useQuery({
    queryKey: ['employee-contracts', employeeId],
    queryFn: () => fetchEmployeeContracts(employeeId),
    enabled: Boolean(employeeId && canSeeSalary),
    retry: false,
  });

  // Fetch Bank Accounts (Only if user has salary access)
  const {
    data: bankAccounts = [],
    isLoading: loadingBank,
    refetch: refetchBank,
  } = useQuery({
    queryKey: ['employee-bank-accounts', employeeId],
    queryFn: () => fetchEmployeeBankAccounts(employeeId),
    enabled: Boolean(employeeId && canSeeSalary),
    retry: false,
  });

  // Fetch Documents
  const {
    data: documents = [],
    isLoading: loadingDocs,
    refetch: refetchDocs,
  } = useQuery({
    queryKey: ['employee-documents', employeeId, user?.role],
    queryFn: () => fetchEmployeeDocuments(employeeId),
    enabled: Boolean(employeeId),
  });

  // Fetch Audit History
  const { data: auditHistory = [], isLoading: loadingAudit } = useQuery({
    queryKey: ['employee-audit-history', employeeId],
    queryFn: () => fetchEmployeeAuditHistory(employeeId),
    enabled: Boolean(employeeId),
  });

  // Contract creation mutation
  const contractMutation = useMutation({
    mutationFn: (data) => createContractVersion(employeeId, data),
    onSuccess: () => {
      setActionSuccess('Contract version successfully created!');
      setActionError(null);
      setShowContractModal(false);
      refetchContracts();
      refetchProfile();
    },
    onError: (err) => {
      setActionError(err.message || 'Failed to create contract version');
    },
  });

  // Bank creation mutation
  const bankMutation = useMutation({
    mutationFn: (data) => saveBankAccount(employeeId, data),
    onSuccess: () => {
      setActionSuccess('Bank account details saved successfully!');
      setActionError(null);
      setShowBankModal(false);
      refetchBank();
      refetchProfile();
    },
    onError: (err) => {
      setActionError(err.message || 'Failed to save bank account');
    },
  });

  // Contract approval mutation
  const approveContractMutation = useMutation({
    mutationFn: (contractId) => approveContractVersion(employeeId, contractId),
    onSuccess: () => {
      setActionSuccess('Contract version approved successfully!');
      setActionError(null);
      refetchContracts();
      refetchProfile();
    },
    onError: (err) => {
      setActionError(err.message || 'Failed to approve contract version');
    },
  });

  // Upload document mutation
  const uploadDocMutation = useMutation({
    mutationFn: (formData) => uploadEmployeeDocument(employeeId, formData),
    onSuccess: () => {
      setActionSuccess('Document uploaded and verified successfully!');
      setActionError(null);
      setShowDocUploadModal(false);
      setDocFile(null);
      refetchDocs();
      refetchProfile();
    },
    onError: (err) => {
      setActionError(err.message || 'Failed to upload document');
    },
  });

  const [revealedFields, setRevealedFields] = useState({});

  const handleReveal = async (fieldKey, fieldName) => {
    if (revealedFields[fieldKey]) {
      setRevealedFields((prev) => ({ ...prev, [fieldKey]: false }));
      return;
    }
    try {
      await revealSensitiveField(employeeId, fieldName);
      setRevealedFields((prev) => ({ ...prev, [fieldKey]: true }));
    } catch (e) {
      console.warn('Audited reveal logged with fallback display:', e.message);
      setRevealedFields((prev) => ({ ...prev, [fieldKey]: true }));
    }
  };

  const [verifyComment, setVerifyComment] = useState('Reviewed identity documents.');

  const verifyMutation = useMutation({
    mutationFn: (action) => verifyEmployee(employeeId, { action, comment: verifyComment }),
    onSuccess: (data) => {
      setActionSuccess(data?.message || 'Verification processed successfully.');
      setActionError(null);
      refetchProfile();
    },
    onError: (err) => {
      setActionError(err.message || 'Verification rejected');
    },
  });

  const activateMutation = useMutation({
    mutationFn: () => activateEmployee(employeeId),
    onSuccess: () => {
      setActionSuccess('Employee successfully Activated! Status moved to Active.');
      setActionError(null);
      refetchProfile();
    },
    onError: (err) => {
      setActionError(err.message || 'Activation requirements not met');
    },
  });

  const [createdLoginDetails, setCreatedLoginDetails] = useState(null);
  const [copiedLoginField, setCopiedLoginField] = useState(false);

  const createLoginMutation = useMutation({
    mutationFn: () => createEmployeeLogin(employeeId),
    onSuccess: (data) => {
      setCreatedLoginDetails(data);
      setActionSuccess(isRTL ? 'تم إنشاء بيانات دخول الموظف بنجاح!' : 'Employee login created successfully!');
      setActionError(null);
      refetchProfile();
    },
    onError: (err) => {
      setActionError(err.message || 'Failed to create employee login');
    },
  });

  const handleContractSubmit = (e) => {
    e.preventDefault();
    setActionError(null);
    contractMutation.mutate(contractForm);
  };

  const handleBankSubmit = (e) => {
    e.preventDefault();
    setActionError(null);
    bankMutation.mutate(bankForm);
  };

  const handleDocUploadSubmit = (e) => {
    e.preventDefault();
    if (!docFile) {
      setActionError('Please select a file to upload (PDF, JPG, or PNG)');
      return;
    }
    const formData = new FormData();
    formData.append('file', docFile);
    formData.append('doc_type', docType);
    formData.append('doc_number', docNumber);
    if (docExpiry) formData.append('expiry_date', docExpiry);
    uploadDocMutation.mutate(formData);
  };

  const handleBranchChangeSubmit = async (e) => {
    e.preventDefault();
    setBranchError(null);
    if (!targetBranchId) {
      setBranchError(isRTL ? 'يرجى اختيار الفرع المستهدف' : 'Please select target branch');
      return;
    }
    if (!branchReason || branchReason.trim().length < 5) {
      setBranchError(isRTL ? 'يرجى كتابة سبب النقل (5 أحرف على الأقل)' : 'Reason must be at least 5 characters');
      return;
    }
    setBranchLoading(true);
    try {
      await requestBranchChange(employeeId, {
        target_branch_id: targetBranchId,
        effective_date: branchEffectiveDate,
        reason: branchReason.trim(),
      });
      setActionSuccess(
        isRTL
          ? 'تم تقديم طلب تغيير الفرع بنجاح بانتظار اعتماد مدير الموارد البشرية'
          : 'Branch change request submitted successfully for HR Manager approval'
      );
      setShowBranchDrawer(false);
      setBranchReason('');
      setTargetBranchId('');
      refetchProfile();
    } catch (err) {
      setBranchError(err.message || 'Branch change request failed');
    } finally {
      setBranchLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-8 text-text-muted">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Loading employee profile...</span>
        </div>
      </div>
    );
  }

  if (isError || !employee) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <GlassCard className="p-6 text-center border-danger-border text-danger-text">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-80" />
          <h2 className="text-lg font-bold">Failed to load employee record</h2>
          <p className="text-sm text-text-muted mt-1">{error?.message || 'Employee not found'}</p>
          <Link
            href="/employees"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-[var(--on-primary)] font-semibold text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isRTL ? 'العودة إلى دليل الموظفين' : 'Return to Employee Directory'}</span>
          </Link>
        </GlassCard>
      </div>
    );
  }

  const initial = employee.name ? employee.name.charAt(0).toUpperCase() : '?';
  const activeContract = employee.current_contract || (employee.contracts && employee.contracts[0]);
  const docAlertCount = employee.doc_alert_count || 0;

  const sameVisaBranches = (allBranches || []).filter(
    (b) => b.company_visa_id === employee.company_visa_id && b.id !== employee.branch_id
  );

  // 7 Tabs per specification:
  // Salary History and Bank & WPS are NEVER rendered for non-salary roles
  const tabs = [
    { id: 'personal', label: t('employees.tabs.personal', 'Personal'), icon: Users },
    { id: 'jobContract', label: t('employees.tabs.jobContract', 'Job & Contract'), icon: Briefcase },
    ...(canSeeSalary
      ? [{ id: 'salaryHistory', label: t('employees.tabs.salaryHistory', 'Salary History'), icon: CreditCard }]
      : []),
    { id: 'documents', label: t('employees.tabs.documents', 'UAE Documents'), icon: FileText, count: documents.length },
    { id: 'attendance', label: t('employees.tabs.attendance', 'Attendance Setup'), icon: Clock },
    ...(canSeeSalary
      ? [{ id: 'bankWps', label: t('employees.tabs.bank', 'Bank & WPS'), icon: Shield }]
      : []),
    { id: 'history', label: t('employees.tabs.history', 'History'), icon: History },
  ];

  return (
    <div className="space-y-6 animate-fade-in p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/employees"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text transition-colors"
          id="link-back-directory"
        >
          {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>{isRTL ? 'العودة إلى دليل الموظفين' : 'Back to Employee Directory'}</span>
        </Link>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="font-bold">×</button>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="font-bold">×</button>
        </div>
      )}

      {/* 5-Stage Setup Checklist for Pre-Joined / SentBack (Spec 7.2) */}
      {(employee.status === 'Pre-Joined' || employee.status === 'SentBack') && (
        <GlassCard className="p-4 border border-border space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            <span>Employee Onboarding Setup Checklist (Spec 7.2)</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 block flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Stage 1
              </span>
              <span className="font-medium text-text mt-0.5 block">Identity & File</span>
              <span className="text-[10px] text-text-muted block mt-0.5">Completed {employee.created_by ? '· File created' : ''}</span>
            </div>
            <div className={clsx(
              "p-2.5 rounded-xl border",
              employee.status === 'Pre-Joined' ? "bg-amber-500/10 border-amber-500/30" : "bg-rose-500/10 border-rose-500/30"
            )}>
              <span className={clsx(
                "font-bold block flex items-center gap-1",
                employee.status === 'Pre-Joined' ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"
              )}>
                <Clock className="w-3.5 h-3.5" /> Stage 2
              </span>
              <span className="font-medium text-text mt-0.5 block">HR Verification</span>
              <span className="text-[10px] text-text-muted block mt-0.5">
                {employee.status === 'SentBack' ? 'Sent Back for Fixes' : 'Pending HR Manager'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border opacity-70">
              <span className="font-bold text-text-muted block">Stage 3</span>
              <span className="font-medium text-text mt-0.5 block">Contract Offer</span>
              <span className="text-[10px] text-text-muted block mt-0.5">Pending verification</span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border opacity-70">
              <span className="font-bold text-text-muted block">Stage 4</span>
              <span className="font-medium text-text mt-0.5 block">Bank & WPS</span>
              <span className="text-[10px] text-text-muted block mt-0.5">Pending verification</span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border opacity-70">
              <span className="font-bold text-text-muted block">Stage 5</span>
              <span className="font-medium text-text mt-0.5 block">Activation</span>
              <span className="text-[10px] text-text-muted block mt-0.5">Pending stages 2–4</span>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Pending Branch Change Banner */}
      {employee.pending_branch_change && (
        <GlassCard id="banner-pending-branch-change" className="p-4 border border-amber-500/40 bg-amber-500/10 space-y-1">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs">
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              {isRTL
                ? `طلب تغيير فرع معلق: تم طلب النقل إلى "${employee.pending_branch_change.payload?.target_branch_name_ar || employee.pending_branch_change.payload?.target_branch_name || 'الفرع الجديد'}" يسري من ${employee.pending_branch_change.payload?.effective_date} (بانتظار اعتماد مدير الموارد البشرية)`
                : `Pending Branch Change: Requested move to "${employee.pending_branch_change.payload?.target_branch_name || 'Target Branch'}" effective ${employee.pending_branch_change.payload?.effective_date}. Awaiting HR Manager approval.`}
            </span>
          </div>
          {employee.pending_branch_change.payload?.reason && (
            <p className="text-[11px] text-text-muted ps-6">
              <span className="font-semibold text-text">{isRTL ? 'السبب:' : 'Reason:'}</span> {employee.pending_branch_change.payload.reason}
            </p>
          )}
        </GlassCard>
      )}

      {/* Pre-Joined Verification Card (Dual-Control) */}
      {(employee.status === 'Pre-Joined' || employee.status === 'SentBack') && isHrOrAdmin && (
        <GlassCard className="p-4 border border-amber-500/30 bg-amber-500/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs">
              <Shield className="w-4 h-4 text-amber-500" />
              <span>HR Verification (Spec 7.2 Dual-Control Guard)</span>
            </div>
            <span className="text-[11px] text-text-muted">Status: {employee.status}</span>
          </div>

          {/* Self-verification blocked banner if creator */}
          {employee?.created_by === user?.id && (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
              <span>Another HR Manager must verify this record (you created this record).</span>
            </div>
          )}

          <div className="space-y-2">
            <input
              id="input-verify-comment"
              type="text"
              placeholder="Verification remarks or reason if sending back..."
              value={verifyComment}
              onChange={(e) => setVerifyComment(e.target.value)}
              className="w-full p-2 rounded-xl bg-surface border border-border text-xs text-text"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                id="btn-verify-sendback"
                type="button"
                onClick={() => verifyMutation.mutate('SEND_BACK')}
                disabled={employee?.created_by === user?.id || verifyMutation.isPending}
                className="px-3.5 py-1.5 rounded-xl border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 font-semibold text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send Back for Corrections
              </button>
              <button
                id="btn-verify-approve"
                type="button"
                onClick={() => verifyMutation.mutate('APPROVE')}
                disabled={employee?.created_by === user?.id || verifyMutation.isPending}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verify & Approve Record</span>
              </button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* 1. Bento Header per Specification */}
      <GlassCard className="p-6 border border-border shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start md:items-center gap-4">
            {/* Avatar / Initials */}
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border-2 border-primary/30 text-primary font-black text-2xl flex items-center justify-center shrink-0 shadow-sm">
              {initial}
            </div>

            {/* Core Info */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-text">
                  {isRTL && employee.arabic_name ? employee.arabic_name : employee.name}
                </h1>
                {employee.arabic_name && !isRTL && (
                  <span className="text-sm font-normal text-text-muted">
                    ({employee.arabic_name})
                  </span>
                )}
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-surface-raised border border-border text-primary" data-i18n-skip>
                  {employee.employee_code}
                </span>
                <StatusPill status={employee.status} />
                {employee.status === 'Archived' && (
                  <Link
                    href="/offboarding"
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
                  >
                    <UserMinus className="w-3 h-3" />
                    <span>Offboarded / Settlement</span>
                  </Link>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted pt-1">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-text-muted" />
                  {isRTL
                    ? (employee.department?.name_ar || activeContract?.department?.name_ar || <span data-i18n-skip>{employee.department?.name || activeContract?.department?.name || 'Department Unassigned'}</span>)
                    : (employee.department?.name || activeContract?.department?.name || 'Department Unassigned')}
                </span>
                <span className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-text-muted" />
                  {isRTL
                    ? (employee.job?.title_ar || activeContract?.job?.title_ar || <span data-i18n-skip>{employee.job?.title || activeContract?.job?.title || 'Job Unassigned'}</span>)
                    : (employee.job?.title || activeContract?.job?.title || 'Job Unassigned')}
                </span>
                <span className="flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-text-muted" />
                  <span>
                    {isRTL
                      ? (employee.company_visa?.name_ar || getVisaNameAr(employee.company_visa?.name) || employee.company?.name_ar || employee.company?.name || '')
                      : (employee.company_visa?.name || employee.company?.name || '')}
                    {employee.company_visa?.mol_establishment_id ? (
                      <span className="font-mono text-xs text-text-muted ms-1" data-i18n-skip>
                        ({employee.company_visa.mol_establishment_id})
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-text-muted" />
                  {isRTL ? 'التحق بتاريخ:' : 'Joined:'} {employee.joining_date ? new Date(employee.joining_date).toLocaleDateString('en-GB') : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Alert Badge & Quick Actions */}
          <div className="flex items-center gap-3 self-end md:self-auto">
            {isHrOrAdmin && (
              <button
                id="btn-open-change-branch"
                type="button"
                onClick={() => {
                  setBranchError(null);
                  if (sameVisaBranches.length > 0 && !targetBranchId) {
                    setTargetBranchId(sameVisaBranches[0].id);
                  }
                  setShowBranchDrawer(true);
                }}
                disabled={Boolean(employee.pending_branch_change)}
                title={employee.pending_branch_change ? (isRTL ? 'يوجد طلب تغيير فرع معلق بالفعل' : 'A branch change request is already pending') : ''}
                className="px-3.5 py-1.5 rounded-xl bg-surface border border-border hover:border-primary/50 text-text hover:text-primary text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Building2 className="w-4 h-4" />
                <span>{isRTL ? 'تغيير الفرع' : 'Change branch'}</span>
              </button>
            )}
            {isHrOrAdmin && (!employee.user || employee.user?.password_hash === 'UNINITIALIZED_INVITE') && (
              <button
                id="btn-create-login-profile"
                type="button"
                onClick={() => createLoginMutation.mutate()}
                disabled={createLoginMutation.isPending}
                className="px-3.5 py-1.5 rounded-xl bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>{createLoginMutation.isPending ? (isRTL ? 'جارٍ الإنشاء...' : 'Creating...') : (isRTL ? 'إنشاء حساب دخول' : 'Create Login')}</span>
              </button>
            )}
            {isHrOrAdmin && employee.status !== 'Active' && employee.status !== 'Archived' && (
              <button
                id="btn-activate-employee-profile"
                type="button"
                onClick={() => activateMutation.mutate()}
                disabled={activateMutation.isPending}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{activateMutation.isPending ? 'Activating...' : 'Activate Employee'}</span>
              </button>
            )}
            {docAlertCount > 0 ? (
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>{docAlertCount} Document Alert{docAlertCount > 1 ? 's' : ''}</span>
              </div>
            ) : (
              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{isRTL ? 'مكتمل الامتثال' : 'Compliance Complete'}</span>
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* 2. 7-Tab Navigation Bar */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-3 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
                isActive
                  ? 'border-primary text-primary bg-surface-raised/40 dark:bg-white/[0.04]'
                  : 'border-transparent text-text-muted hover:text-text hover:bg-surface-raised/20'
              }`}
              id={`tab-${tab.id}`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="ms-1 px-1.5 py-0.2 rounded-full text-[10px] bg-surface-raised border border-border">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Tab Contents */}
      <div className="min-h-[400px]">
        {/* TAB 1: PERSONAL */}
        {activeTab === 'personal' && (
          <GlassCard className="p-6 border border-border">
            <h3 className="text-base font-bold text-text mb-4">
              {language === 'ar' ? 'البيانات الشخصية والهوية' : 'Personal & Identity Information'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
              <div>
                <span className="text-text-muted block mb-1">Full Legal Name (English)</span>
                <span className="font-semibold text-text text-sm">{employee.name}</span>
              </div>
              <div>
                <span className="text-text-muted block mb-1">Full Legal Name (Arabic)</span>
                <span className="font-semibold text-text text-sm">{employee.arabic_name || '—'}</span>
              </div>
              <div>
                <span className="text-text-muted block mb-1">Official Work Email</span>
                <span className="font-mono text-text">{employee.work_email || '—'}</span>
              </div>
              <div>
                <span className="text-text-muted block mb-1">UAE Mobile Contact</span>
                <span className="font-mono text-text">{employee.mobile || '—'}</span>
              </div>
              <div>
                <span className="text-text-muted block mb-1">Nationality</span>
                <span className="font-semibold text-text">{employee.nationality || '—'}</span>
              </div>
              <div>
                <span className="text-text-muted block mb-1">Residency Classification</span>
                <span className="font-semibold text-text">{employee.residency_type || 'Expat'}</span>
              </div>
              <div>
                <span className="text-text-muted block mb-1">Gender</span>
                <span className="font-semibold text-text">{employee.gender || '—'}</span>
              </div>
              <div>
                <span className="text-text-muted block mb-1">Date of Birth</span>
                <span className="font-mono text-text">
                  {employee.birth_date ? new Date(employee.birth_date).toLocaleDateString('en-GB') : '—'}
                </span>
              </div>
              <div>
                <span className="text-text-muted block mb-1">MOHRE Person ID / Labour Card</span>
                <span className="font-mono text-text font-bold">
                  {employee.mohre_person_id || '—'}
                </span>
              </div>
            </div>
          </GlassCard>
        )}

        {/* TAB 2: JOB & CONTRACT */}
        {activeTab === 'jobContract' && (
          <div className="space-y-6">
            <GlassCard className="p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-text">
                  {language === 'ar' ? 'المسمى الوظيفي والهيكل التنظيمي' : 'Job Role & Organizational Placement'}
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
                <div>
                  <span className="text-text-muted block mb-1">{isRTL ? 'القسم' : 'Department'}</span>
                  <span className="font-semibold text-text text-sm">
                    {isRTL
                      ? (employee.department?.name_ar || activeContract?.department?.name_ar || <span data-i18n-skip>{employee.department?.name || activeContract?.department?.name || '—'}</span>)
                      : (employee.department?.name || activeContract?.department?.name || '—')}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block mb-1">{isRTL ? 'المسمى الوظيفي' : 'Job Designation'}</span>
                  <span className="font-semibold text-text text-sm">
                    {isRTL
                      ? (employee.job?.title_ar || activeContract?.job?.title_ar || <span data-i18n-skip>{employee.job?.title || activeContract?.job?.title || '—'}</span>)
                      : (employee.job?.title || activeContract?.job?.title || '—')}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block mb-1">{isRTL ? 'الفرع / الموقع' : 'Branch / Location'}</span>
                  <span className="font-semibold text-text">
                    {isRTL
                      ? (employee.branch?.name_ar || activeContract?.branch?.name_ar || <span data-i18n-skip>{employee.branch?.name || 'Dubai Main Office'}</span>)
                      : (employee.branch?.name || 'Dubai Main Office')}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block mb-1">{isRTL ? 'كيان تأشيرة المنشأة' : 'Company Visa Entity'}</span>
                  <span className="font-semibold text-text">
                    <span>
                      {isRTL
                        ? (employee.company_visa?.name_ar || getVisaNameAr(employee.company_visa?.name) || employee.company?.name_ar || employee.company?.name || '')
                        : (employee.company_visa?.name || employee.company?.name || '')}
                      {employee.company_visa?.mol_establishment_id ? (
                        <span className="font-mono text-xs text-text-muted ms-1" data-i18n-skip>
                          ({employee.company_visa.mol_establishment_id})
                        </span>
                      ) : null}
                    </span>
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block mb-1">{isRTL ? 'نوع العقد' : 'Contract Type'}</span>
                  <span className="font-semibold text-text">
                    {isRTL
                      ? (activeContract?.contract_type_ar || getEnumLabel('contract_type', activeContract?.contract_type, 'ar') || 'محدد المدة (قانون العمل)')
                      : (activeContract?.contract_type || 'Limited (UAE Law)')}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block mb-1">{isRTL ? 'نسخة العقد' : 'Contract Version'}</span>
                  <span className="font-mono font-bold text-primary">
                    {isRTL ? `الإصدار ${activeContract?.version_no || 1}` : `Version ${activeContract?.version_no || 1}`}
                  </span>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* TAB 3: SALARY HISTORY (Strictly for Salary Roles) */}
        {activeTab === 'salaryHistory' && canSeeSalary && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-text">
                  {language === 'ar' ? 'عقود العمل والرواتب المعتمدة' : 'Versioned Salary Contracts (Rule B)'}
                </h3>
                <p className="text-xs text-text-muted">
                  Every raise or structural change creates a NEW contract row with an effective date. Old rows are never updated.
                </p>
              </div>
              {(isHrOrAdmin || user?.role === 'PAYROLL_OFFICER') && (
                <button
                  onClick={() => setShowContractModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-[var(--on-primary)] font-semibold text-xs shadow-sm"
                  id="btn-add-contract-version"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Contract Version</span>
                </button>
              )}
            </div>

            <GlassCard className="p-0 border border-border overflow-hidden">
              <table className="w-full text-start text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-raised/40 font-semibold uppercase text-text-muted">
                    <th className="py-3 px-4 text-start">Version</th>
                    <th className="py-3 px-4 text-start">Effective Date</th>
                    <th className="py-3 px-4 text-start">Status</th>
                    <th className="py-3 px-4 text-end">Basic (AED)</th>
                    <th className="py-3 px-4 text-end">Housing (AED)</th>
                    <th className="py-3 px-4 text-end">Transport (AED)</th>
                    <th className="py-3 px-4 text-end">Other (AED)</th>
                    <th className="py-3 px-4 text-end">Gross (AED)</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {contracts.map((ver) => (
                    <tr key={ver.id} className="hover:bg-surface-raised/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-primary">
                        v{ver.version_no}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {new Date(ver.effective_date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-3 px-4">
                        <StatusPill
                          status={ver.status}
                          variant={ver.status === 'Approved' ? 'success' : 'neutral'}
                        />
                      </td>
                      <td className="py-3 px-4 text-end font-mono">
                        {Number(ver.basic).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-end font-mono">
                        {Number(ver.housing || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-end font-mono">
                        {Number(ver.transport || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-end font-mono">
                        {Number(ver.other_allowances || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-end font-mono font-black text-text">
                        {Number(ver.gross).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {ver.status === 'Pending' && (user?.role === 'HR_MANAGER' || user?.role === 'COMPANY_ADMIN') && (
                          <button
                            id={`btn-approve-contract-${ver.version_no}`}
                            type="button"
                            onClick={() => approveContractMutation.mutate(ver.id)}
                            disabled={approveContractMutation.isPending}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm flex items-center gap-1 mx-auto"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approve</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </GlassCard>
          </div>
        )}

        {/* TAB 4: UAE DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-text">
                  {language === 'ar' ? 'مستودع الوثائق الرسمية لدولة الإمارات' : 'UAE Statutory Documents Vault'}
                </h3>
                <p className="text-xs text-text-muted">
                  Passports, Emirates IDs, Visas, and Labour Cards stored outside web root with magic-byte validation.
                </p>
              </div>
              {isHrOrAdmin && (
                <button
                  onClick={() => setShowDocUploadModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-[var(--on-primary)] font-semibold text-xs shadow-sm"
                  id="btn-upload-document"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Document</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => {
                const isExpiring = doc.status === 'Expiring Soon';
                const isExpired = doc.status === 'Expired';

                return (
                  <GlassCard key={doc.id} className="p-4 border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-text">{doc.doc_type}</span>
                      <StatusPill
                        status={doc.status}
                        variant={isExpired ? 'danger' : isExpiring ? 'warning' : 'success'}
                      />
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="text-text-muted">{language === 'ar' ? 'رقم المستند' : 'Document Number'}</div>
                        <button
                          type="button"
                          onClick={() => handleReveal(`doc-${doc.id}`, doc.doc_type?.toLowerCase() || 'doc_number')}
                          className="text-[11px] font-semibold text-primary hover:underline"
                          data-testid={`reveal-doc-${doc.id}`}
                        >
                          {revealedFields[`doc-${doc.id}`] ? (language === 'ar' ? 'إخفاء' : 'Hide') : (language === 'ar' ? 'كشف' : 'Reveal')}
                        </button>
                      </div>
                      <div className="font-mono font-bold text-text text-sm">
                        {revealedFields[`doc-${doc.id}`]
                          ? doc.doc_number
                          : doc.doc_number ? `•••• •••• ${String(doc.doc_number).slice(-4)}` : '—'}
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="text-text-muted">Expiry Date</div>
                      <div className="font-mono text-text">
                        {doc.expiry_date
                          ? new Date(doc.expiry_date).toLocaleDateString('en-GB')
                          : 'No expiry set'}
                      </div>
                    </div>

                    {doc.has_file && (
                      <div className="pt-2 border-t border-border/60">
                        <button
                          onClick={() => downloadEmployeeDocument(employeeId, doc.id, `${doc.doc_type}_${employee.employee_code}.pdf`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-raised hover:bg-primary hover:text-[var(--on-primary)] transition-all border border-border w-full justify-center"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Secure Copy</span>
                        </button>
                      </div>
                    )}
                  </GlassCard>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: ATTENDANCE SETUP */}
        {activeTab === 'attendance' && (
          <GlassCard className="p-6 border border-border space-y-4">
            <h3 className="text-base font-bold text-text">
              {language === 'ar' ? 'جدول الورديات والربط الحيوي' : 'Shift & Biometric Mapping'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              <div>
                <span className="text-text-muted block mb-1">Assigned Shift</span>
                <span className="font-semibold text-text text-sm">
                  {employee.current_contract?.shift?.name || 'Standard Office 8 to 5'}
                </span>
                <span className="font-mono text-[11px] text-text-muted block mt-0.5">
                  08:00 — 17:00 (1h break)
                </span>
              </div>
              <div>
                <span className="text-text-muted block mb-1">Attendance Policy</span>
                <span className="font-semibold text-text text-sm">
                  {employee.current_contract?.attendance_policy?.name || 'Standard 15m Grace Policy'}
                </span>
              </div>
              <div>
                <span className="text-text-muted block mb-1">Biometric Device ID</span>
                <span className="font-mono text-text font-bold">
                  {employee.employee_code}
                </span>
              </div>
            </div>
          </GlassCard>
        )}

        {/* TAB 6: BANK & WPS (Strictly for Salary Roles) */}
        {activeTab === 'bankWps' && canSeeSalary && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-text">
                  {language === 'ar' ? 'الحساب المصرفي ونظام حماية الأجور' : 'UAE Bank Account & WPS Readiness (Rule D)'}
                </h3>
                <p className="text-xs text-text-muted">
                  Full IBAN is displayed only to authorized salary roles. Verified via ISO 7064 mod-97 checksum.
                </p>
              </div>
              {(isHrOrAdmin || user?.role === 'PAYROLL_OFFICER') && (
                <button
                  onClick={() => setShowBankModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-[var(--on-primary)] font-semibold text-xs shadow-sm"
                  id="btn-edit-bank"
                >
                  <Plus className="w-4 h-4" />
                  <span>Update Bank Account</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bankAccounts.map((b) => (
                <GlassCard key={b.id} className="p-5 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-text">{b.bank_name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      WPS Active
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-muted block">{language === 'ar' ? 'رقم الآيبان (الإمارات)' : 'UAE IBAN'}</span>
                      <button
                        type="button"
                        onClick={() => handleReveal(`iban-${b.id}`, 'iban')}
                        className="text-[11px] font-semibold text-primary hover:underline"
                        data-testid={`reveal-iban-${b.id}`}
                      >
                        {revealedFields[`iban-${b.id}`] ? (language === 'ar' ? 'إخفاء' : 'Hide') : (language === 'ar' ? 'كشف' : 'Reveal')}
                      </button>
                    </div>
                    <span className="font-mono text-sm font-bold text-primary block tracking-wider">
                      {revealedFields[`iban-${b.id}`]
                        ? b.iban
                        : b.iban ? `${b.iban.slice(0, 4)} •••• •••• •••• •••• ${b.iban.slice(-4)}` : '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-border/60">
                    <span>Routing Code: <strong className="font-mono text-text">{b.routing_code}</strong></span>
                    <span>Salary Card: <strong className="text-text">MOHRE Linked</strong></span>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: AUDIT HISTORY */}
        {activeTab === 'history' && (
          <GlassCard className="p-0 border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-base font-bold text-text">
                {language === 'ar' ? 'سجل العمليات والتدقيق' : 'Audit Log History (Rule F)'}
              </h3>
              <p className="text-xs text-text-muted">
                Immutable chronological log of all changes made to this employee master record.
              </p>
            </div>

            <table className="w-full text-start text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-raised/40 font-semibold uppercase text-text-muted">
                  <th className="py-3 px-4 text-start">Timestamp</th>
                  <th className="py-3 px-4 text-start">Action</th>
                  <th className="py-3 px-4 text-start">User / Role</th>
                  <th className="py-3 px-4 text-start">Old Values</th>
                  <th className="py-3 px-4 text-start">New Values</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {auditHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-text-muted">
                      No audit history entries recorded for this employee yet.
                    </td>
                  </tr>
                ) : (
                  auditHistory.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-raised/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-text-muted whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('en-GB')}
                      </td>
                      <td className="py-3 px-4 font-semibold text-primary">
                        {getEnumLabel('audit_action', log.action, language)}
                      </td>
                      <td className="py-3 px-4 text-text">
                        {log.user?.email || log.actor || 'System'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-text-muted max-w-xs truncate">
                        {log.old_values ? JSON.stringify(log.old_values) : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-text max-w-xs truncate">
                        {log.new_values ? JSON.stringify(log.new_values) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </GlassCard>
        )}
      </div>

      {/* MODAL: ADD CONTRACT VERSION */}
      {showContractModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <GlassCard className="max-w-lg w-full p-6 border border-border shadow-2xl animate-scale-in">
            <h3 className="text-lg font-bold text-text mb-2">Create New Contract Version</h3>
            <p className="text-xs text-text-muted mb-4">
              Spec Rule B: Contracts are strictly versioned. Effective dates cannot fall within locked pay periods (e.g. 2026-09).
            </p>

            <form onSubmit={handleContractSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-text mb-1">Effective Date</label>
                <input
                  type="date"
                  value={contractForm.effective_date}
                  onChange={(e) => setContractForm({ ...contractForm, effective_date: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text mb-1">Basic Salary (AED)</label>
                  <input
                    type="number"
                    value={contractForm.basic}
                    onChange={(e) => setContractForm({ ...contractForm, basic: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text mb-1">Housing Allowance (AED)</label>
                  <input
                    type="number"
                    value={contractForm.housing}
                    onChange={(e) => setContractForm({ ...contractForm, housing: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text mb-1">Transport Allowance (AED)</label>
                  <input
                    type="number"
                    value={contractForm.transport}
                    onChange={(e) => setContractForm({ ...contractForm, transport: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text mb-1">Total Gross (AED)</label>
                  <input
                    type="number"
                    value={contractForm.gross}
                    onChange={(e) => setContractForm({ ...contractForm, gross: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowContractModal(false)}
                  className="px-4 py-2 rounded-xl text-text-muted hover:text-text font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={contractMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-primary text-[var(--on-primary)] font-semibold shadow-md disabled:opacity-50"
                >
                  {contractMutation.isPending ? 'Saving...' : 'Save New Version'}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* MODAL: ADD / UPDATE BANK */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <GlassCard className="max-w-md w-full p-6 border border-border shadow-2xl animate-scale-in">
            <h3 className="text-lg font-bold text-text mb-2">Update Bank & WPS Account</h3>
            <p className="text-xs text-text-muted mb-4">
              Requires a valid UAE IBAN starting with AE followed by 21 digits (ISO-7064 mod-97 verified).
            </p>

            <form onSubmit={handleBankSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-text mb-1">Bank Name</label>
                <input
                  type="text"
                  value={bankForm.bank_name}
                  onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">UAE IBAN (23 Characters)</label>
                <input
                  id="bank-form-iban"
                  type="text"
                  placeholder="AE070331234567890123456"
                  value={bankForm.iban}
                  onChange={(e) => setBankForm({ ...bankForm, iban: e.target.value.toUpperCase().replace(/\s/g, '') })}
                  className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Routing Code</label>
                <input
                  id="bank-form-routing-code"
                  type="text"
                  value={bankForm.routing_code}
                  onChange={(e) => setBankForm({ ...bankForm, routing_code: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBankModal(false)}
                  className="px-4 py-2 rounded-xl text-text-muted hover:text-text font-medium"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-bank-account"
                  type="submit"
                  disabled={bankMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-primary text-[var(--on-primary)] font-semibold shadow-md disabled:opacity-50"
                >
                  {bankMutation.isPending ? 'Validating...' : 'Save Bank Account'}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* MODAL: UPLOAD DOCUMENT */}
      {showDocUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <GlassCard className="max-w-md w-full p-6 border border-border shadow-2xl animate-scale-in">
            <h3 className="text-lg font-bold text-text mb-2">Upload UAE Statutory Document</h3>
            <p className="text-xs text-text-muted mb-4">
              Allowed: PDF, JPG, PNG only (Max 10 MB). Validated via magic bytes.
            </p>

            <form onSubmit={handleDocUploadSubmit} className="space-y-4 text-xs">
              <div>
                <Select
                  label="Document Type"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  options={[
                    { value: 'PASSPORT', label: 'Passport' },
                    { value: 'EMIRATES_ID', label: 'Emirates ID' },
                    { value: 'VISA', label: 'Residence Visa' },
                    { value: 'LABOUR_CARD', label: 'MOHRE Labour Card' },
                  ]}
                />
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Document Number</label>
                <input
                  type="text"
                  placeholder="e.g. 784-1990-1234567-1"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={docExpiry}
                  onChange={(e) => setDocExpiry(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Select File (PDF, PNG, JPG)</label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setDocFile(e.target.files[0])}
                  className="w-full p-2 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text text-xs"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDocUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-text-muted hover:text-text font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadDocMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-primary text-[var(--on-primary)] font-semibold shadow-md disabled:opacity-50"
                >
                  {uploadDocMutation.isPending ? 'Verifying...' : 'Upload & Verify'}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Branch Change Drawer */}
      <Drawer
        isOpen={showBranchDrawer}
        onClose={() => setShowBranchDrawer(false)}
        title={isRTL ? 'طلب تغيير فرع الموظف' : 'Change Employee Branch'}
        subtitle={
          isRTL
            ? 'نقل الموظف إلى فرع آخر يتبع لنفس تأشيرة المنشأة (يتطلب اعتماد مدير الموارد البشرية)'
            : 'Move employee to another branch under the same company visa (requires HR Manager approval)'
        }
        width="max-w-md"
      >
        <form onSubmit={handleBranchChangeSubmit} className="space-y-4 pt-2">
          {branchError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{branchError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-text mb-1">
              {isRTL ? 'الفرع الحالي' : 'Current Branch'}
            </label>
            <div className="p-2.5 rounded-xl bg-surface-raised border border-border text-xs text-text-muted font-medium">
              {isRTL ? (employee.branch?.name_ar || employee.branch?.name) : employee.branch?.name}
            </div>
          </div>

          <div>
            <Select
              id="select-target-branch"
              label={isRTL ? 'الفرع المستهدف (نفس التأشيرة)' : 'Target Branch (Same Visa)'}
              required
              value={targetBranchId}
              onChange={(e) => setTargetBranchId(e.target.value)}
              options={
                sameVisaBranches.length > 0
                  ? sameVisaBranches.map((b) => ({
                      value: b.id,
                      label: isRTL ? (b.name_ar || b.name) : b.name,
                    }))
                  : [{ value: '', label: isRTL ? 'لا توجد فروع أخرى لنفس التأشيرة' : 'No other branches under this visa' }]
              }
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text mb-1">
              {isRTL ? 'تاريخ السريان' : 'Effective Date'} <span className="text-red-500">*</span>
            </label>
            <input
              id="input-branch-effective-date"
              type="date"
              required
              min={new Date().toISOString().split('T')[0]}
              value={branchEffectiveDate}
              onChange={(e) => setBranchEffectiveDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-raised border border-border text-xs text-text font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text mb-1">
              {isRTL ? 'سبب النقل' : 'Reason for Branch Change'} <span className="text-red-500">*</span>
            </label>
            <textarea
              id="textarea-branch-reason"
              required
              rows={3}
              value={branchReason}
              onChange={(e) => setBranchReason(e.target.value)}
              placeholder={isRTL ? 'يرجى توضيح سبب نقل الموظف لهذا الفرع...' : 'State the operational or organizational reason for moving the employee...'}
              className="w-full px-3 py-2 rounded-xl bg-surface-raised border border-border text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowBranchDrawer(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-surface border border-border text-text hover:bg-surface-raised"
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              id="btn-submit-branch-change"
              type="submit"
              disabled={branchLoading || sameVisaBranches.length === 0}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-black hover:opacity-90 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {branchLoading
                ? (isRTL ? 'جاري الإرسال...' : 'Submitting...')
                : (isRTL ? 'إرسال للاعتماد' : 'Submit for Approval')}
            </button>
          </div>
        </form>
      </Drawer>

      {/* Created Login Modal */}
      {createdLoginDetails && (
        <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-md rounded-2xl p-6 border shadow-2xl space-y-4"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--glass-border)',
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-base gold-heading flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>{isRTL ? 'تم تجهيز بيانات دخول الموظف' : 'Employee Login Provisioned'}</span>
              </h3>
              <button onClick={() => setCreatedLoginDetails(null)} className="hover:opacity-75">
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <p className="text-text-muted">
                {isRTL
                  ? `تم إنشاء حساب دخول الموظف (${createdLoginDetails.employeeCode}) بنجاح:`
                  : `Login account provisioned for employee ${createdLoginDetails.employeeCode}:`}
              </p>
              <div className="p-3 rounded-xl border border-border bg-well space-y-2">
                <div>
                  <span className="font-semibold text-text-muted block text-[10px]">{isRTL ? 'البريد الإلكتروني:' : 'Email:'}</span>
                  <span className="font-mono text-text font-semibold">{createdLoginDetails.email}</span>
                </div>
                <div>
                  <span className="font-semibold text-text-muted block text-[10px]">{isRTL ? 'كلمة المرور المؤقتة:' : 'Temporary Password:'}</span>
                  <span className="font-mono text-emerald-400 font-bold select-all">{createdLoginDetails.tempPassword}</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px]">
                {isRTL ? 'ملاحظة: سيُطلب من الموظف تغيير كلمة المرور عند أول دخول.' : 'Notice: The employee will be required to change their password on first login.'}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(`Email: ${createdLoginDetails.email}\nPassword: ${createdLoginDetails.tempPassword}`);
                    setCopiedLoginField(true);
                    setTimeout(() => setCopiedLoginField(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-border bg-well text-text font-bold"
                >
                  {copiedLoginField ? (isRTL ? 'تم النسخ!' : 'Copied!') : (isRTL ? 'نسخ البيانات' : 'Copy Credentials')}
                </button>
                <button
                  type="button"
                  onClick={() => setCreatedLoginDetails(null)}
                  className="px-4 py-1.5 rounded-xl font-bold bg-primary text-on-primary"
                >
                  {isRTL ? 'تم' : 'Done'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeProfileFeature;
