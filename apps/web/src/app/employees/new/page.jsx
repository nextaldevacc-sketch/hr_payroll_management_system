'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
  Clock,
  Shield,
  Send,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Lock,
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import {
  createEmployee,
  fetchEmployeeMetaOptions,
  verifyEmployee,
  createContractVersion,
  saveBankAccount,
  uploadEmployeeDocument,
  fetchActivationCheck,
  activateEmployee,
} from '../../../lib/employeeApi';
import { GlassCard } from '../../../components/primitives/GlassCard';
import { Stepper } from '../../../components/primitives/Stepper';

export default function NewEmployeeWizardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isRTL, language, t } = useLanguage();

  // Wizard Steps: 1..5
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [createdEmpId, setCreatedEmpId] = useState(null);
  const [createdEmpCode, setCreatedEmpCode] = useState('');
  const [creatorUserId, setCreatorUserId] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('Pending');
  const [activationResult, setActivationResult] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Form states
  const [personalForm, setPersonalForm] = useState({
    employee_code: `EMP-DXB-${Math.floor(100 + Math.random() * 900)}`,
    name: '',
    arabic_name: '',
    work_email: '',
    mobile: '+971501234567',
    nationality: 'Emirati',
    residency_type: 'UAENational',
    gender: 'Male',
    birth_date: '1995-04-12',
    joining_date: new Date().toISOString().split('T')[0],
    mohre_person_id: '12345678901234',
    branch_id: '',
    company_visa_id: '',
  });

  const [verifyComment, setVerifyComment] = useState('Approved initial profile and identity records.');

  const [contractForm, setContractForm] = useState({
    effective_date: new Date().toISOString().split('T')[0],
    start_date: new Date().toISOString().split('T')[0],
    department_id: '',
    job_id: '',
    shift_id: '',
    attendance_policy_id: '',
    basic: 7000,
    housing: 3500,
    transport: 1000,
    other_allowances: 0,
    gross: 11500,
  });

  const [bankForm, setBankForm] = useState({
    bank_name: 'Emirates NBD',
    iban: 'AE070331234567890123456',
    routing_code: 'ENBD001',
  });

  // Fetch Meta Options for dropdowns
  const { data: metaOptions } = useQuery({
    queryKey: ['employee-meta-options'],
    queryFn: fetchEmployeeMetaOptions,
    staleTime: 5 * 60 * 1000,
  });

  // Pre-fill default branch & visa when meta loaded
  React.useEffect(() => {
    if (metaOptions) {
      if (!personalForm.branch_id && metaOptions.branches?.length > 0) {
        setPersonalForm((f) => ({ ...f, branch_id: metaOptions.branches[0].id }));
      }
      if (!personalForm.company_visa_id && metaOptions.visas?.length > 0) {
        setPersonalForm((f) => ({ ...f, company_visa_id: metaOptions.visas[0].id }));
      }
      if (!contractForm.department_id && metaOptions.departments?.length > 0) {
        setContractForm((f) => ({ ...f, department_id: metaOptions.departments[0].id }));
      }
      if (!contractForm.job_id && metaOptions.jobs?.length > 0) {
        setContractForm((f) => ({ ...f, job_id: metaOptions.jobs[0].id }));
      }
      if (!contractForm.shift_id && metaOptions.shifts?.length > 0) {
        setContractForm((f) => ({ ...f, shift_id: metaOptions.shifts[0].id }));
      }
      if (!contractForm.attendance_policy_id && metaOptions.policies?.length > 0) {
        setContractForm((f) => ({ ...f, attendance_policy_id: metaOptions.policies[0].id }));
      }
    }
  }, [metaOptions]);

  // Live Activation Check Query for Step 5
  const {
    data: activationCheck,
    refetch: refetchCheck,
    isLoading: loadingCheck,
  } = useQuery({
    queryKey: ['activation-check', createdEmpId],
    queryFn: () => fetchActivationCheck(createdEmpId),
    enabled: Boolean(createdEmpId && currentStepIndex === 4),
  });

  // Step 1: Create Pre-Joined mutation
  const createMutation = useMutation({
    mutationFn: (data) => createEmployee(data),
    onSuccess: (data) => {
      setCreatedEmpId(data.id);
      setCreatedEmpCode(data.employee_code);
      setCreatorUserId(user?.id);
      setActionSuccess(`Employee created in 'Pre-Joined' status with code ${data.employee_code}`);
      setActionError(null);
      setCurrentStepIndex(1);
    },
    onError: (err) => {
      setActionError(err.message || 'Failed to create employee');
    },
  });

  // Step 2: Verification mutation
  const verifyMutation = useMutation({
    mutationFn: (action) => verifyEmployee(createdEmpId, { action, comment: verifyComment }),
    onSuccess: (data) => {
      setVerificationStatus('Approved');
      setActionSuccess("HR Verification completed! Status moved to 'New Joined'.");
      setActionError(null);
      setCurrentStepIndex(2);
    },
    onError: (err) => {
      setActionError(err.message || 'Verification rejected');
    },
  });

  // Step 3: Contract mutation
  const contractMutation = useMutation({
    mutationFn: (data) => createContractVersion(createdEmpId, data),
    onSuccess: () => {
      setActionSuccess('Version 1 contract saved successfully!');
      setActionError(null);
      setCurrentStepIndex(3);
    },
    onError: (err) => {
      setActionError(err.message || 'Failed to save contract');
    },
  });

  // Step 4: Bank mutation
  const bankMutation = useMutation({
    mutationFn: (data) => saveBankAccount(createdEmpId, data),
    onSuccess: () => {
      setActionSuccess('Bank account with valid UAE IBAN saved successfully!');
      setActionError(null);
      setCurrentStepIndex(4);
    },
    onError: (err) => {
      setActionError(err.message || 'Failed to save bank account');
    },
  });

  // Step 5: Activate mutation
  const activateMutation = useMutation({
    mutationFn: () => activateEmployee(createdEmpId),
    onSuccess: (data) => {
      setActivationResult(data);
      setActionSuccess('Employee successfully Activated! Opening leave balance allocated & invite sent.');
      setActionError(null);
    },
    onError: (err) => {
      setActionError(err.message || 'Activation requirements not met');
    },
  });

  const stepsList = [
    'Pre-Joined',
    'HR Verification',
    'Contract & Docs',
    'Schedule & Bank',
    'Activation Check',
  ];

  return (
    <div className="space-y-6 animate-fade-in p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/employees"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text transition-colors mb-2"
          >
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>Back to Employee Directory</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-text">
            {t('employees.wizard.title', 'New Employee Onboarding')}
          </h1>
          <p className="text-xs text-text-muted">
            {t('employees.wizard.subtitle', 'Spec 7.2 Compliant 5-Step Verification & Activation Stepper')}
          </p>
        </div>

        {createdEmpCode && (
          <div className="font-mono text-xs font-bold px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
            {createdEmpCode}
          </div>
        )}
      </div>

      {/* 5-Step Stepper Component */}
      <GlassCard className="p-4 border border-border">
        <Stepper steps={stepsList} currentStep={stepsList[currentStepIndex]} />
      </GlassCard>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="font-bold">×</button>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="font-bold">×</button>
        </div>
      )}

      {/* STEP 1: CREATE PRE-JOINED */}
      {currentStepIndex === 0 && (
        <GlassCard className="p-6 border border-border space-y-5">
          <div className="border-b border-border pb-3">
            <h2 className="text-lg font-bold text-text">Step 1: Personal & Identity Details</h2>
            <p className="text-xs text-text-muted">
              Creates employee in &apos;Pre-Joined&apos; state. Status will be locked pending HR verification.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setActionError(null);
              createMutation.mutate(personalForm);
            }}
            className="space-y-4 text-xs"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-text mb-1">Employee Code</label>
                <input
                  type="text"
                  value={personalForm.employee_code}
                  onChange={(e) => setPersonalForm({ ...personalForm, employee_code: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Full Legal Name (English)</label>
                <input
                  type="text"
                  placeholder="e.g. Salem Al-Suwaidi"
                  value={personalForm.name}
                  onChange={(e) => setPersonalForm({ ...personalForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Full Legal Name (Arabic)</label>
                <input
                  type="text"
                  placeholder="سالم السويدي"
                  value={personalForm.arabic_name}
                  onChange={(e) => setPersonalForm({ ...personalForm, arabic_name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text"
                />
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Official Work Email</label>
                <input
                  type="email"
                  placeholder="salem@gulftech.ae"
                  value={personalForm.work_email}
                  onChange={(e) => setPersonalForm({ ...personalForm, work_email: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Nationality</label>
                <select
                  value={personalForm.nationality}
                  onChange={(e) => {
                    const nat = e.target.value;
                    setPersonalForm({
                      ...personalForm,
                      nationality: nat,
                      residency_type: nat === 'Emirati' ? 'UAENational' : 'Expat',
                    });
                  }}
                  className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text"
                >
                  <option value="Emirati">Emirati (UAE National — GPSSA)</option>
                  <option value="Indian">Indian</option>
                  <option value="Filipino">Filipino</option>
                  <option value="Egyptian">Egyptian</option>
                  <option value="British">British</option>
                  <option value="Pakistani">Pakistani</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">MOHRE Person ID / Labour Card</label>
                <input
                  type="text"
                  placeholder="12345678901234"
                  value={personalForm.mohre_person_id}
                  onChange={(e) => setPersonalForm({ ...personalForm, mohre_person_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Branch / Location</label>
                <select
                  value={personalForm.branch_id}
                  onChange={(e) => setPersonalForm({ ...personalForm, branch_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text"
                  required
                >
                  {metaOptions?.branches?.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Company Visa Entity</label>
                <select
                  value={personalForm.company_visa_id}
                  onChange={(e) => setPersonalForm({ ...personalForm, company_visa_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text"
                  required
                >
                  {metaOptions?.visas?.map((v) => (
                    <option key={v.id} value={v.id}>{v.visa_entity_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-border">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-[var(--on-primary)] font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50"
                id="btn-step1-submit"
              >
                <span>Save as Pre-Joined & Continue</span>
                {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* STEP 2: HR MANAGER VERIFICATION */}
      {currentStepIndex === 1 && (
        <GlassCard className="p-6 border border-border space-y-5">
          <div className="border-b border-border pb-3">
            <h2 className="text-lg font-bold text-text">Step 2: HR Manager Verification (Spec 7.2)</h2>
            <p className="text-xs text-text-muted">
              HR Manager reviews and verifies the pre-joined employee before contract issuance.
            </p>
          </div>

          {/* Rule G Notice: Self-Verification Prevention */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold block">Spec Rule G: Self-Verification Prevention</span>
              <span>
                Nobody may verify or approve an employee record they created. If logged in as the creator, the system strictly enforces verification by a different HR Manager or Admin.
              </span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <label className="block font-semibold text-text">Verification Remarks / Audit Comment</label>
            <textarea
              rows={3}
              value={verifyComment}
              onChange={(e) => setVerifyComment(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text"
              required
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setCurrentStepIndex(0)}
              className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-text"
            >
              Back
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => verifyMutation.mutate('SEND_BACK')}
                disabled={verifyMutation.isPending}
                className="px-4 py-2 rounded-xl border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 font-semibold text-xs"
              >
                Send Back with Comment
              </button>
              <button
                type="button"
                onClick={() => verifyMutation.mutate('APPROVE')}
                disabled={verifyMutation.isPending}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md"
                id="btn-verify-approve"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve & Advance to New Joined</span>
              </button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* STEP 3: CONTRACT & DOCUMENTS */}
      {currentStepIndex === 2 && (
        <GlassCard className="p-6 border border-border space-y-5">
          <div className="border-b border-border pb-3">
            <h2 className="text-lg font-bold text-text">Step 3: Version 1 Contract & Initial Documents</h2>
            <p className="text-xs text-text-muted">
              Spec Rule B: Establishes initial version 1 contract with statutory salary breakdown.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setActionError(null);
              contractMutation.mutate(contractForm);
            }}
            className="space-y-4 text-xs"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-text mb-1">Department</label>
                <select
                  value={contractForm.department_id}
                  onChange={(e) => setContractForm({ ...contractForm, department_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text"
                  required
                >
                  {metaOptions?.departments?.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Job Designation</label>
                <select
                  value={contractForm.job_id}
                  onChange={(e) => setContractForm({ ...contractForm, job_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text"
                  required
                >
                  {metaOptions?.jobs?.map((j) => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Contract Start Date</label>
                <input
                  type="date"
                  value={contractForm.start_date}
                  onChange={(e) => setContractForm({ ...contractForm, start_date: e.target.value, effective_date: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Basic Salary (AED)</label>
                <input
                  type="number"
                  value={contractForm.basic}
                  onChange={(e) => setContractForm({ ...contractForm, basic: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text font-mono font-bold"
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
                <label className="block font-semibold text-text mb-1">Total Contract Gross (AED)</label>
                <input
                  type="number"
                  value={contractForm.gross}
                  onChange={(e) => setContractForm({ ...contractForm, gross: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text font-mono font-black text-sm text-primary"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setCurrentStepIndex(1)}
                className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-text"
              >
                Back
              </button>

              <button
                type="submit"
                disabled={contractMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-[var(--on-primary)] font-semibold shadow-md active:scale-95 disabled:opacity-50"
                id="btn-step3-submit"
              >
                <span>Save Contract v1 & Continue</span>
                {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* STEP 4: SCHEDULE & BANK */}
      {currentStepIndex === 3 && (
        <GlassCard className="p-6 border border-border space-y-5">
          <div className="border-b border-border pb-3">
            <h2 className="text-lg font-bold text-text">Step 4: Shift Schedule & WPS Bank Account</h2>
            <p className="text-xs text-text-muted">
              Rule D: Validates UAE IBAN with ISO-7064 mod-97 checksum for WPS file compliance.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setActionError(null);
              bankMutation.mutate(bankForm);
            }}
            className="space-y-4 text-xs"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-text mb-1">Shift Policy</label>
                <select
                  value={contractForm.shift_id}
                  onChange={(e) => setContractForm({ ...contractForm, shift_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text"
                >
                  {metaOptions?.shifts?.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.start_time} - {s.end_time})</option>
                  ))}
                </select>
              </div>

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

              <div className="md:col-span-2">
                <label className="block font-semibold text-text mb-1">
                  UAE IBAN (Must start with AE + 21 digits)
                </label>
                <input
                  type="text"
                  placeholder="AE070331234567890123456"
                  value={bankForm.iban}
                  onChange={(e) => setBankForm({ ...bankForm, iban: e.target.value.toUpperCase().replace(/\s/g, '') })}
                  className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text font-mono font-bold text-sm tracking-wider"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Central Bank Routing Code</label>
                <input
                  type="text"
                  value={bankForm.routing_code}
                  onChange={(e) => setBankForm({ ...bankForm, routing_code: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text font-mono"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setCurrentStepIndex(2)}
                className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-text"
              >
                Back
              </button>

              <button
                type="submit"
                disabled={bankMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-[var(--on-primary)] font-semibold shadow-md active:scale-95 disabled:opacity-50"
                id="btn-step4-submit"
              >
                <span>Save Bank & Proceed to Activation</span>
                {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* STEP 5: ACTIVATION CHECK */}
      {currentStepIndex === 4 && (
        <GlassCard className="p-6 border border-border space-y-6">
          <div className="border-b border-border pb-3">
            <h2 className="text-lg font-bold text-text">Step 5: Statutory Activation Check (Rule A)</h2>
            <p className="text-xs text-text-muted">
              Live inspection of the 4 statutory requirements needed for Active status.
            </p>
          </div>

          {/* Checklist Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              activationCheck?.checklist?.has_contract
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
            }`}>
              <div className="flex items-center gap-3">
                {activationCheck?.checklist?.has_contract ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-500" />
                )}
                <div>
                  <span className="font-bold text-xs block">Active Contract Version</span>
                  <span className="text-[11px] opacity-80">Salary structure defined</span>
                </div>
              </div>
              <span className="font-mono text-xs font-bold">
                {activationCheck?.checklist?.has_contract ? 'PASS' : 'MISSING'}
              </span>
            </div>

            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              activationCheck?.checklist?.has_shift
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
            }`}>
              <div className="flex items-center gap-3">
                {activationCheck?.checklist?.has_shift ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-500" />
                )}
                <div>
                  <span className="font-bold text-xs block">Assigned Shift Schedule</span>
                  <span className="text-[11px] opacity-80">Biometric roster mapped</span>
                </div>
              </div>
              <span className="font-mono text-xs font-bold">
                {activationCheck?.checklist?.has_shift ? 'PASS' : 'MISSING'}
              </span>
            </div>

            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              activationCheck?.checklist?.has_bank_account
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
            }`}>
              <div className="flex items-center gap-3">
                {activationCheck?.checklist?.has_bank_account ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-500" />
                )}
                <div>
                  <span className="font-bold text-xs block">UAE WPS Bank Account</span>
                  <span className="text-[11px] opacity-80">ISO mod-97 validated</span>
                </div>
              </div>
              <span className="font-mono text-xs font-bold">
                {activationCheck?.checklist?.has_bank_account ? 'PASS' : 'MISSING'}
              </span>
            </div>

            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              activationCheck?.checklist?.has_labour_card
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
            }`}>
              <div className="flex items-center gap-3">
                {activationCheck?.checklist?.has_labour_card ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-500" />
                )}
                <div>
                  <span className="font-bold text-xs block">MOHRE Labour Card / Person ID</span>
                  <span className="text-[11px] opacity-80">Government regulatory ID</span>
                </div>
              </div>
              <span className="font-mono text-xs font-bold">
                {activationCheck?.checklist?.has_labour_card ? 'PASS' : 'MISSING'}
              </span>
            </div>
          </div>

          {/* Activation Success Result Screen */}
          {activationResult ? (
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
              <Sparkles className="w-10 h-10 text-emerald-500 mx-auto animate-bounce" />
              <h3 className="text-lg font-bold text-text">Employee Record Successfully Activated!</h3>
              <p className="text-xs text-text-muted max-w-md mx-auto">
                Opening leave balance of <strong>30 days</strong> has been automatically allocated. A self-service portal invite token has been issued.
              </p>

              {activationResult.invite_token && (
                <div className="mt-3 p-3 rounded-xl bg-surface-raised border border-border inline-block max-w-md w-full text-start">
                  <span className="text-[11px] text-text-muted block mb-1">Self-Service Invite Token:</span>
                  <span className="font-mono font-bold text-xs text-primary break-all">
                    {activationResult.invite_token}
                  </span>
                </div>
              )}

              <div className="pt-4 flex items-center justify-center gap-3">
                <Link
                  href={`/employees/${createdEmpId}`}
                  className="px-5 py-2.5 rounded-xl bg-primary text-[var(--on-primary)] font-semibold text-xs shadow-md"
                >
                  View Completed Profile
                </Link>
                <Link
                  href="/employees"
                  className="px-4 py-2.5 rounded-xl border border-border text-text font-semibold text-xs hover:bg-surface-raised"
                >
                  Return to Directory
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setCurrentStepIndex(3)}
                className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-text"
              >
                Back
              </button>

              <button
                type="button"
                onClick={() => activateMutation.mutate()}
                disabled={!activationCheck?.passes || activateMutation.isPending}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                id="btn-activate-employee"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{activateMutation.isPending ? 'Activating...' : 'Activate Employee'}</span>
              </button>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}
