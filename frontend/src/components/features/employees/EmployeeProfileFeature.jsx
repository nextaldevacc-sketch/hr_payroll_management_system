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
  Eye,
  EyeOff,
  AlertCircle,
  FileCheck,
  UserMinus,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
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
  verifyEmployee,
  approveContractVersion,
} from '../../../services/employeesApi';
import { GlassCard } from '../../primitives/GlassCard';
import { StatusPill } from '../../primitives/StatusPill';

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
            <span>Return to Employee Directory</span>
          </Link>
        </GlassCard>
      </div>
    );
  }

  const initial = employee.name ? employee.name.charAt(0).toUpperCase() : '?';
  const activeContract = employee.current_contract || (employee.contracts && employee.contracts[0]);
  const docAlertCount = employee.doc_alert_count || 0;

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
          <span>Back to Employee Directory</span>
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
                disabled={verifyMutation.isPending}
                className="px-3.5 py-1.5 rounded-xl border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 font-semibold text-xs"
              >
                Send Back with Comment
              </button>
              <button
                id="btn-verify-approve"
                type="button"
                onClick={() => verifyMutation.mutate('APPROVE')}
                disabled={verifyMutation.isPending}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verify & Approve</span>
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
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-surface-raised border border-border text-primary">
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
                  {employee.department?.name || activeContract?.department?.name || 'Department Unassigned'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-text-muted" />
                  {employee.job?.title || activeContract?.job?.title || 'Job Unassigned'}
                </span>
                <span className="flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-text-muted" />
                  {employee.company_visa?.visa_entity_name || 'Gulf Tech Logistics LLC'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-text-muted" />
                  Joined: {employee.joining_date ? new Date(employee.joining_date).toLocaleDateString('en-GB') : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Alert Badge & Quick Actions */}
          <div className="flex items-center gap-3 self-end md:self-auto">
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
                <span>Compliance Complete</span>
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
            <h3 className="text-base font-bold text-text mb-4">Personal & Identity Information</h3>
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
                <h3 className="text-base font-bold text-text">Job Role & Organizational Placement</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
                <div>
                  <span className="text-text-muted block mb-1">Department</span>
                  <span className="font-semibold text-text text-sm">
                    {employee.department?.name || activeContract?.department?.name || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block mb-1">Job Designation</span>
                  <span className="font-semibold text-text text-sm">
                    {employee.job?.title || activeContract?.job?.title || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block mb-1">Branch / Location</span>
                  <span className="font-semibold text-text">
                    {employee.branch?.name || 'Dubai Main Office'}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block mb-1">Company Visa Entity</span>
                  <span className="font-semibold text-text">
                    {employee.company_visa?.visa_entity_name || 'Gulf Tech Logistics LLC'}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block mb-1">Contract Type</span>
                  <span className="font-semibold text-text">{activeContract?.contract_type || 'Limited (UAE Law)'}</span>
                </div>
                <div>
                  <span className="text-text-muted block mb-1">Contract Version</span>
                  <span className="font-mono font-bold text-primary">
                    Version {activeContract?.version_no || 1}
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
                <h3 className="text-base font-bold text-text">Versioned Salary Contracts (Rule B)</h3>
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
                <h3 className="text-base font-bold text-text">UAE Statutory Documents Vault</h3>
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
                      <div className="text-text-muted">Document Number</div>
                      <div className="font-mono font-bold text-text text-sm">
                        {doc.doc_number}
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
            <h3 className="text-base font-bold text-text">Shift & Biometric Mapping</h3>
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
                <h3 className="text-base font-bold text-text">UAE Bank Account & WPS Readiness (Rule D)</h3>
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
                    <span className="text-xs text-text-muted block">UAE IBAN (Unmasked)</span>
                    <span className="font-mono text-sm font-bold text-primary block tracking-wider">
                      {b.iban}
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
              <h3 className="text-base font-bold text-text">Audit Log History (Rule F)</h3>
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
                        {log.action}
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
                <label className="block font-semibold text-text mb-1">Document Type</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text"
                >
                  <option value="PASSPORT">Passport</option>
                  <option value="EMIRATES_ID">Emirates ID</option>
                  <option value="VISA">Residence Visa</option>
                  <option value="LABOUR_CARD">MOHRE Labour Card</option>
                </select>
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
    </div>
  );
}

export default EmployeeProfileFeature;
