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
  ClipboardList,
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
} from '../../../services/employeesApi';
import { GlassCard } from '../../primitives/GlassCard';
import { Stepper } from '../../primitives/Stepper';
import { Select } from '../../primitives/form/Select';

export function EmployeeWizardFeature() {
  const router = useRouter();
  const { user } = useAuth();
  const { isRTL, language, t } = useLanguage();

  // Wizard Steps: 1..5
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [createdEmpId, setCreatedEmpId] = useState(null);
  const [createdEmpCode, setCreatedEmpCode] = useState('');
  const [creatorUserId, setCreatorUserId] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [verificationStatus, setVerificationStatus] = useState('Pending');
  const [activationResult, setActivationResult] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Form states
  const [personalForm, setPersonalForm] = useState({
    employee_code: '',
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

  // Fetch Meta Options for dropdowns (scoped by company_id, fresh on switch)
  const { data: metaOptions } = useQuery({
    queryKey: ['employee-meta-options', user?.company_id],
    queryFn: fetchEmployeeMetaOptions,
    staleTime: 0,
  });

  // Scoped branches filtered to the selected Company Visa (Spec 7.2)
  const selectedVisaId = personalForm.company_visa_id || metaOptions?.visas?.[0]?.id || '';
  const filteredBranches = (metaOptions?.branches || []).filter(
    (b) => !selectedVisaId || b.company_visa_id === selectedVisaId
  );

  const handleVisaChange = (newVisaId) => {
    const matching = (metaOptions?.branches || []).filter((b) => b.company_visa_id === newVisaId);
    let newBranchId = personalForm.branch_id;
    if (matching.length === 1) {
      newBranchId = matching[0].id;
    } else if (!matching.some((b) => b.id === personalForm.branch_id)) {
      newBranchId = matching[0]?.id || '';
    }
    setPersonalForm((prev) => ({
      ...prev,
      company_visa_id: newVisaId,
      branch_id: newBranchId,
    }));
  };

  // Pre-fill default branch & visa when meta loaded
  React.useEffect(() => {
    if (metaOptions) {
      if (metaOptions.next_employee_code && !personalForm.employee_code) {
        setPersonalForm((f) => ({ ...f, employee_code: metaOptions.next_employee_code }));
      }
      const initialVisaId = personalForm.company_visa_id || metaOptions.visas?.[0]?.id || '';
      if (!personalForm.company_visa_id && initialVisaId) {
        setPersonalForm((f) => ({ ...f, company_visa_id: initialVisaId }));
      }
      const matchingBranches = (metaOptions.branches || []).filter((b) => b.company_visa_id === initialVisaId);
      if (!personalForm.branch_id && matchingBranches.length > 0) {
        setPersonalForm((f) => ({ ...f, branch_id: matchingBranches[0].id }));
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
      setIsSubmitted(true);
      setActionSuccess(
        language === 'ar'
          ? 'تم الإرسال لمدير الموارد البشرية للتحقق والاعتماد'
          : 'Submitted to HR Manager for verification'
      );
      setActionError(null);
      setFieldErrors({});
    },
    onError: (err) => {
      if (err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
      }
      setActionError(
        language === 'ar'
          ? 'يرجى تصحيح الحقول المحددة للمتابعة'
          : 'Please fix the highlighted fields to continue'
      );
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
            <span>{isRTL ? 'العودة إلى دليل الموظفين' : 'Back to Employee Directory'}</span>
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
      {!isSubmitted && currentStepIndex === 0 && (
        <GlassCard className="p-6 border border-border space-y-5">
          <div className="border-b border-border pb-3">
            <h2 className="text-lg font-bold text-text">
              {language === 'ar' ? 'الخطوة 1: البيانات الشخصية والهوية' : 'Step 1: Personal & Identity Details'}
            </h2>
            <p className="text-xs text-text-muted">
              Creates employee in &apos;Pre-Joined&apos; state. Status will be locked pending HR verification.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setActionError(null);
              setFieldErrors({});
              const branchId = personalForm.branch_id || (filteredBranches.length > 0 ? filteredBranches[0].id : '');
              const visaId = personalForm.company_visa_id || (metaOptions?.visas?.length > 0 ? metaOptions.visas[0].id : '');
              createMutation.mutate({
                ...personalForm,
                branch_id: branchId,
                company_visa_id: visaId,
              });
            }}
            className="space-y-4 text-xs"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-text mb-1">
                  {language === 'ar' ? 'كود الموظف' : 'Employee Code'}{' '}
                  <span className="text-text-muted font-normal text-[11px]">
                    ({language === 'ar' ? 'معرف تسلسلي' : 'Sequential ID'})
                  </span>
                </label>
                <input
                  id="wizard-input-emp-code"
                  type="text"
                  value={personalForm.employee_code}
                  onChange={(e) => setPersonalForm({ ...personalForm, employee_code: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text font-mono font-bold"
                  required
                />
                {fieldErrors.employee_code && (
                  <span className="text-xs text-danger-text font-medium mt-1 block">{fieldErrors.employee_code}</span>
                )}
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">
                  {language === 'ar' ? 'الاسم القانوني الكامل (بالإنجليزية)' : 'Full Legal Name (English)'}
                </label>
                <input
                  id="wizard-input-name"
                  type="text"
                  placeholder="e.g. Salem Al-Suwaidi"
                  value={personalForm.name}
                  onChange={(e) => setPersonalForm({ ...personalForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text"
                  required
                />
                {fieldErrors.name && (
                  <span className="text-xs text-danger-text font-medium mt-1 block">{fieldErrors.name}</span>
                )}
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">
                  {language === 'ar' ? 'الاسم القانوني الكامل (بالعربية)' : 'Full Legal Name (Arabic)'}
                </label>
                <input
                  id="wizard-input-arabic-name"
                  type="text"
                  placeholder="سالم السويدي"
                  value={personalForm.arabic_name}
                  onChange={(e) => setPersonalForm({ ...personalForm, arabic_name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text"
                />
                {fieldErrors.arabic_name && (
                  <span className="text-xs text-danger-text font-medium mt-1 block">{fieldErrors.arabic_name}</span>
                )}
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">
                  {language === 'ar' ? 'البريد الإلكتروني للعمل' : 'Official Work Email'}
                </label>
                <input
                  id="wizard-input-work-email"
                  type="email"
                  placeholder="salem@gulftech.ae"
                  value={personalForm.work_email}
                  onChange={(e) => setPersonalForm({ ...personalForm, work_email: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text font-mono"
                  required
                />
                {fieldErrors.work_email && (
                  <span className="text-xs text-danger-text font-medium mt-1 block">{fieldErrors.work_email}</span>
                )}
              </div>

              <div>
                <Select
                  id="wizard-select-nationality"
                  data-i18n-skip="true"
                  label={language === 'ar' ? 'الجنسية' : 'Nationality'}
                  value={personalForm.nationality}
                  onChange={(e) => {
                    const nat = e.target.value;
                    setPersonalForm({
                      ...personalForm,
                      nationality: nat,
                      residency_type: nat === 'Emirati' ? 'UAENational' : 'Expat',
                    });
                  }}
                  error={fieldErrors.nationality}
                  options={[
                    { value: 'Emirati', label: language === 'ar' ? 'إماراتي (مواطن الدولة — GPSSA)' : 'Emirati (UAE National — GPSSA)' },
                    { value: 'Indian', label: language === 'ar' ? 'هندي' : 'Indian' },
                    { value: 'Filipino', label: language === 'ar' ? 'فلبيني' : 'Filipino' },
                    { value: 'Egyptian', label: language === 'ar' ? 'مصري' : 'Egyptian' },
                    { value: 'British', label: language === 'ar' ? 'بريطاني' : 'British' },
                    { value: 'Pakistani', label: language === 'ar' ? 'باكستاني' : 'Pakistani' },
                  ]}
                />
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">
                  {language === 'ar' ? 'بطاقة العمل / رقم المنشأة (MOHRE)' : 'MOHRE Person ID / Labour Card'}
                </label>
                <input
                  id="wizard-input-mohre-id"
                  type="text"
                  placeholder="12345678901234"
                  value={personalForm.mohre_person_id}
                  onChange={(e) => setPersonalForm({ ...personalForm, mohre_person_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-surface-raised dark:bg-inset border border-border text-text font-mono"
                  required
                />
                {fieldErrors.mohre_person_id && (
                  <span className="text-xs text-danger-text font-medium mt-1 block">{fieldErrors.mohre_person_id}</span>
                )}
              </div>

              {/* 1. Company Visa Entity FIRST (Spec 7.2) */}
              <div>
                <Select
                  id="wizard-select-visa"
                  name="company_visa_id"
                  label={language === 'ar' ? 'جهة التأشيرة للشركة' : 'Company Visa Entity'}
                  required
                  value={personalForm.company_visa_id || (metaOptions?.visas?.[0]?.id ?? '')}
                  onChange={(e) => handleVisaChange(e.target.value)}
                  error={fieldErrors.company_visa_id}
                  helper={
                    language === 'ar'
                      ? 'تأشيرة الكيان = الرخصة المسجل عليها إقامة الموظف وملف حماية الأجور (WPS)'
                      : "Company visa = the licence the employee's visa and WPS salary file are under"
                  }
                  options={(metaOptions?.visas || []).map((v) => {
                    const molId = v.mol_establishment_id || '';
                    const vName = language === 'ar' && (v.name_ar || v.visa_entity_name_ar)
                      ? (v.name_ar || v.visa_entity_name_ar)
                      : (v.visa_entity_name || v.name || 'Visa');
                    return {
                      value: v.id,
                      label: molId ? `${vName} · ${molId}` : vName,
                      meta: molId || undefined,
                    };
                  })}
                />
              </div>

              {/* 2. Branch / Location SECOND (Filtered to selected visa) */}
              <div>
                <Select
                  id="wizard-select-branch"
                  name="branch_id"
                  label={language === 'ar' ? 'الفرع / الموقع' : 'Branch / Location'}
                  required
                  value={personalForm.branch_id || (filteredBranches?.[0]?.id ?? '')}
                  onChange={(e) => setPersonalForm({ ...personalForm, branch_id: e.target.value })}
                  error={fieldErrors.branch_id}
                  helper={
                    language === 'ar'
                      ? 'الفرع = موقع عمل الموظف (يتبع لتأشيرة الكيان المختارة)'
                      : 'Branch = where the employee works (belongs to the chosen visa)'
                  }
                  emptyText="No branches assigned to selected visa entity"
                  options={filteredBranches.map((b) => ({
                    value: b.id,
                    label: language === 'ar' && b.name_ar ? b.name_ar : b.name,
                    chip: language === 'ar' ? (t(`settings.branches.emirates.${b.emirate}`, b.emirate) || b.emirate) : (b.emirate || b.city || undefined),
                  }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-border">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-[var(--on-primary)] font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50"
                id="btn-step1-submit"
              >
                <span>{language === 'ar' ? 'حفظ كمعين مسبقاً والمتابعة' : 'Save as Pre-Joined & Continue'}</span>
                {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Submitted to HR Manager Screen (Spec 7.2) */}
      {isSubmitted && (
        <GlassCard className="p-6 border border-emerald-500/30 bg-emerald-500/5 space-y-6 animate-scale-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-emerald-500 text-white shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text">
                {language === 'ar'
                  ? 'تم الإرسال لمدير الموارد البشرية للتحقق والاعتماد'
                  : 'Submitted to HR Manager for verification'}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                {language === 'ar'
                  ? `تم إنشاء ملف الموظف بنجاح برمز ${createdEmpCode} وبحالة ما قبل الانضمام (Pre-Joined).`
                  : `Employee file created successfully with code ${createdEmpCode} in Pre-Joined status.`}
              </p>
            </div>
          </div>

          {/* 5-Stage Checklist */}
          <div className="p-4 rounded-xl border border-border bg-surface-raised dark:bg-inset space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              <span>{language === 'ar' ? 'مراحل الإعداد الخمس (Spec 7.2)' : '5-Stage Onboarding Setup (Spec 7.2)'}</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 block flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Stage 1
                </span>
                <span className="font-medium text-text mt-0.5 block">Identity & File</span>
                <span className="text-[10px] text-text-muted block mt-0.5">Completed · File created</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <span className="font-bold text-amber-600 dark:text-amber-400 block flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Stage 2
                </span>
                <span className="font-medium text-text mt-0.5 block">HR Verification</span>
                <span className="text-[10px] text-text-muted block mt-0.5">Pending HR Manager</span>
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
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="button"
              id="btn-create-another-employee"
              onClick={() => {
                setIsSubmitted(false);
                setCreatedEmpId(null);
                setCreatedEmpCode('');
                setCurrentStepIndex(0);
                setPersonalForm((prev) => ({
                  ...prev,
                  name: '',
                  arabic_name: '',
                  work_email: '',
                  employee_code: '',
                }));
              }}
              className="px-4 py-2 rounded-xl border border-border hover:bg-surface-raised text-text font-semibold text-xs"
            >
              {language === 'ar' ? 'إضافة موظف آخر' : 'Create Another Employee'}
            </button>
            <Link
              id="btn-go-to-profile"
              href={`/employees/${createdEmpId}`}
              className="px-5 py-2 rounded-xl bg-primary text-[var(--on-primary)] font-semibold text-xs shadow-md flex items-center gap-2"
            >
              <span>{language === 'ar' ? 'عرض ملف الموظف' : 'Go to Employee Profile'}</span>
              {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </Link>
          </div>
        </GlassCard>
      )}

      {/* STEP 2: HR MANAGER VERIFICATION */}
      {currentStepIndex === 1 && (
        <GlassCard className="p-6 border border-border space-y-5">
          <div className="border-b border-border pb-3">
            <h2 className="text-lg font-bold text-text">
              {language === 'ar' ? 'الخطوة 2: تدقيق مسؤول الموارد البشرية' : 'Step 2: HR Manager Verification (Spec 7.2)'}
            </h2>
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
            <h2 className="text-lg font-bold text-text">
              {language === 'ar' ? 'الخطوة 3: عقد العمل والمستندات الأولية' : 'Step 3: Version 1 Contract & Initial Documents'}
            </h2>
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
                <Select
                  label="Department"
                  required
                  value={contractForm.department_id}
                  onChange={(e) => setContractForm({ ...contractForm, department_id: e.target.value })}
                  options={metaOptions?.departments?.map((d) => ({ value: d.id, label: d.name })) || []}
                />
              </div>

              <div>
                <Select
                  label="Job Designation"
                  required
                  value={contractForm.job_id}
                  onChange={(e) => setContractForm({ ...contractForm, job_id: e.target.value })}
                  options={metaOptions?.jobs?.map((j) => ({ value: j.id, label: j.title })) || []}
                />
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
            <h2 className="text-lg font-bold text-text">
              {language === 'ar' ? 'الخطوة 4: جدول الورديات وحساب حماية الأجور' : 'Step 4: Shift Schedule & WPS Bank Account'}
            </h2>
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
                <Select
                  label="Shift Policy"
                  value={contractForm.shift_id}
                  onChange={(e) => setContractForm({ ...contractForm, shift_id: e.target.value })}
                  options={metaOptions?.shifts?.map((s) => ({
                    value: s.id,
                    label: s.name,
                    meta: `${s.start_time} - ${s.end_time}`,
                  })) || []}
                />
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
            <h2 className="text-lg font-bold text-text">
              {language === 'ar' ? 'الخطوة 5: التحقق من التفعيل القانوني' : 'Step 5: Statutory Activation Check (Rule A)'}
            </h2>
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

export default EmployeeWizardFeature;
