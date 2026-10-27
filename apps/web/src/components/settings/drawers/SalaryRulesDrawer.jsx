'use client';

import React, { useState, useMemo } from 'react';
import { Drawer } from '../../primitives/Drawer';
import {
  Calculator,
  Play,
  RotateCcw,
  History,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Check,
  DollarSign,
  ArrowRight,
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { DEMO_PRESETS_DATA } from '../settingsData';
import {
  validateFormula,
  evaluateFormula,
  executeRuleEngine,
} from '@nextal/shared';

export function SalaryRulesDrawer({
  isOpen,
  onClose,
  rules = [],
  companySettings,
  userRole = 'COMPANY_ADMIN',
  canEdit = true,
  onSave,
  onViewHistory,
  onResetDefaults,
}) {
  const { isRTL, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('rules'); // 'rules' | 'simulator' | 'statutory'
  const [structureType, setStructureType] = useState('MONTHLY'); // 'MONTHLY' | 'FINAL_SETTLEMENT'
  const [ruleList, setRuleList] = useState(rules);
  const [selectedRule, setSelectedRule] = useState(rules[0] || null);

  React.useEffect(() => {
    if (rules && rules.length > 0) {
      setRuleList(rules);
      if (!selectedRule || !rules.some((r) => r.id === selectedRule.id)) {
        setSelectedRule(rules[0]);
      }
    }
  }, [rules]);

  // Settings
  const [absenceDivisor, setAbsenceDivisor] = useState(companySettings?.absence_divisor || 'DAYS_30');
  const [effectiveFrom, setEffectiveFrom] = useState('2026-11-01');

  // Simulator State (Rule B)
  const [selectedPresetKey, setSelectedPresetKey] = useState('AHMED');
  const [customParams, setCustomParams] = useState({
    basic: 5000,
    hra: 2000,
    tra: 1000,
    paid_days: 30,
    month_days: 30,
    absent_days: 2,
    ot_hours_normal: 3,
    ot_hours_night: 0,
    ot_hours_rest: 0,
    loan_instalment: 500,
  });

  // Role permissions (Section 5.3 & Rule D)
  const isFinance = userRole === 'FINANCE';
  const isPayrollOfficer = userRole === 'PAYROLL_OFFICER';
  const isHrOrAdmin = userRole === 'HR_MANAGER' || userRole === 'COMPANY_ADMIN';

  // Live Rule B Simulator Evaluation
  const simulationResult = useMemo(() => {
    const preset = DEMO_PRESETS_DATA[selectedPresetKey];
    let employeeContext;

    if (selectedPresetKey === 'CUSTOM') {
      employeeContext = {
        name: 'Custom Simulator Case',
        contract: {
          basic: Number(customParams.basic) || 0,
          hra: Number(customParams.hra) || 0,
          tra: Number(customParams.tra) || 0,
          oth: 0,
        },
        paid_days: Number(customParams.paid_days) || 30,
        month_days: Number(customParams.month_days) || 30,
        absent_days: Number(customParams.absent_days) || 0,
        ot_hours_normal: Number(customParams.ot_hours_normal) || 0,
        ot_hours_night: Number(customParams.ot_hours_night) || 0,
        ot_hours_rest: Number(customParams.ot_hours_rest) || 0,
        late_units: 0,
        loan_instalment: Number(customParams.loan_instalment) || 0,
        adv_instalment: 0,
        gpssa_salary: 0,
        absence_divisor: absenceDivisor,
      };
    } else {
      employeeContext = {
        ...preset,
        absence_divisor: absenceDivisor,
      };
    }

    try {
      return executeRuleEngine(ruleList, employeeContext);
    } catch (err) {
      return {
        gross: 0,
        net: 0,
        formattedNet: 'Error',
        steps: [],
        error: err.message,
      };
    }
  }, [selectedPresetKey, customParams, ruleList, absenceDivisor]);

  // Live Formula Safety Validation for Selected Rule (Rule A)
  const formulaValidation = useMemo(() => {
    if (!selectedRule || !selectedRule.formula) return { valid: true };
    const earlierCodes = ruleList
      .filter((r) => r.sequence < selectedRule.sequence)
      .map((r) => r.code);
    const laterCodes = ruleList
      .filter((r) => r.sequence > selectedRule.sequence)
      .map((r) => r.code);

    return validateFormula(selectedRule.formula, {
      currentRuleCode: selectedRule.code,
      earlierRuleCodes: earlierCodes,
      laterRuleCodes: laterCodes,
    });
  }, [selectedRule, ruleList]);

  const handleUpdateSelectedRule = (field, val) => {
    if (!selectedRule) return;
    // Section 5.3 & Rule D: Finance may ONLY update debit_account and credit_account
    if (isFinance && field !== 'debit_account' && field !== 'credit_account') {
      return;
    }

    const updated = { ...selectedRule, [field]: val };
    setSelectedRule(updated);
    setRuleList(ruleList.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        rules: ruleList,
        absence_divisor: absenceDivisor,
        effective_from: effectiveFrom,
      });
    }
    onClose();
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'ar' ? 'قواعد وهياكل الرواتب ومحاكي الاحتساب' : 'Salary Rules & Calculation Engine'}
      subtitle={
        language === 'ar'
          ? 'المادة 8: قواعد الاحتساب الآمنة، مقسوم الغياب، ونسب التقاعد، ومحاكي الرواتب (أحمد 7,044.80 درهم)'
          : 'Section 8: Safe AST formulas, absence divisor, GPSSA rates & Rule B demo simulator'
      }
      width="max-w-4xl"
    >
      <div className="space-y-4 pb-6">
        {/* Effective Dating & Permission Context Callout */}
        <div
          className="p-3 rounded-xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          style={{ background: 'var(--primary-wash)', borderColor: 'var(--glass-border)' }}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            <span className="text-text-muted">
              {isFinance
                ? (language === 'ar' ? 'صلاحيات المالية (Section 5.3): مسموح بتعديل الحسابات المدينة والدائنة فقط' : 'Finance Role Restriction (Section 5.3): You may only edit debit/credit GL accounts.')
                : (language === 'ar' ? 'القاعدة A و C: جميع الصيغ آمنة بدون eval، ومؤرخة بالتاريخ الفعّال' : 'Rules A & C: Strict AST safety (zero eval) with immutable effective dating.')}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-text-muted">{language === 'ar' ? 'يسري من:' : 'Effective:'}</span>
            <input
              type="date"
              value={effectiveFrom}
              disabled={isFinance}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-surface border border-border text-text"
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-border/60">
          <div className="flex">
            <button
              type="button"
              onClick={() => setActiveTab('rules')}
              className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'rules'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'قواعد الراتب وحسابات الأستاذ' : 'Rules & GL Accounts'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-surface border border-border">
                {ruleList.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('simulator')}
              className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'simulator'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              <Play className="w-3.5 h-3.5 text-primary" />
              <span>{language === 'ar' ? 'محاكي احتساب الراتب (Rule B)' : 'Test This Rule Simulator'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400">
                AED 7,044.80
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('statutory')}
              className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'statutory'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'معايير القانون ومقسوم الغياب' : 'Divisors & OT Rates'}</span>
            </button>
          </div>

          {canEdit && onResetDefaults && (
            <button
              type="button"
              onClick={onResetDefaults}
              className="mb-2 px-2.5 py-1 rounded-lg text-xs font-semibold text-text-muted hover:text-primary bg-surface border border-border transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{language === 'ar' ? 'استعادة القواعد' : 'Reset Defaults'}</span>
            </button>
          )}
        </div>

        {/* =========================================================================
            Tab 1: Rules Table & Detail Form
           ========================================================================= */}
        {activeTab === 'rules' && (
          <div className="grid grid-cols-12 gap-4">
            {/* Rules List Sidebar */}
            <div className="col-span-5 border border-border/70 rounded-xl overflow-hidden bg-surface/40 flex flex-col h-[520px]">
              <div className="p-2.5 bg-surface border-b border-border/60 flex items-center justify-between text-xs font-bold">
                <span className="text-text">{language === 'ar' ? 'تسلسل القواعد' : 'Execution Sequence'}</span>
                <span className="text-[10px] text-text-muted">{ruleList.length} Rules Active</span>
              </div>

              <div className="overflow-y-auto flex-1 divide-y divide-border/40">
                {ruleList.map((r) => {
                  const isSelected = selectedRule?.id === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRule(r)}
                      className={`w-full text-start p-2.5 transition-colors flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-primary/10 border-s-2 border-primary'
                          : 'hover:bg-surface-hover/60'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-surface border border-border text-text">
                            #{r.sequence}
                          </span>
                          <span className="text-xs font-bold font-mono text-primary truncate">{r.code}</span>
                        </div>
                        <span className="text-[11px] text-text-muted block truncate mt-0.5">
                          {language === 'ar' ? r.name_ar || r.name : r.name}
                        </span>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        r.category === 'Gross' || r.category === 'Net'
                          ? 'bg-primary/20 text-primary'
                          : r.category === 'Deduction'
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {r.category}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Rule Detail Editor */}
            {selectedRule && (
              <div className="col-span-7 space-y-3.5 p-4 rounded-xl border border-border/70 bg-surface/50">
                <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold font-mono text-primary">{selectedRule.code}</span>
                      <span className="text-xs font-semibold text-text">
                        {language === 'ar' ? selectedRule.name_ar || selectedRule.name : selectedRule.name}
                      </span>
                    </div>
                    <span className="text-[11px] text-text-muted">
                      Sequence: <span className="font-mono font-bold">{selectedRule.sequence}</span> · Category: {selectedRule.category}
                    </span>
                  </div>

                  {onViewHistory && (
                    <button
                      type="button"
                      onClick={() => onViewHistory('salary_rule', selectedRule.name)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-text-muted hover:text-primary bg-surface border border-border flex items-center gap-1.5 transition-colors"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'سجل النسخ' : 'History'}</span>
                    </button>
                  )}
                </div>

                {['GPSSA_EE', 'GPSSA_ER'].includes(selectedRule.code) && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span className="font-semibold">
                      {language === 'ar'
                        ? 'يرجى تأكيد النسب الحالية مع العميل قبل الإطلاق الفعلي'
                        : 'Confirm current rates with the client before go-live'}
                    </span>
                  </div>
                )}

                {/* Safe Formula Box (Rule A) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-text">
                      {language === 'ar' ? 'صيغة الاحتساب الرياضية الآمنة (Rule A Formula)' : 'Safe Calculation Formula (Rule A)'}
                    </label>
                    <span className="text-[10px] font-mono text-text-muted">Decimal.js AST</span>
                  </div>
                  <textarea
                    rows={2}
                    disabled={isFinance || !canEdit}
                    value={selectedRule.formula || ''}
                    onChange={(e) => handleUpdateSelectedRule('formula', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-surface border border-border text-text focus:ring-1 focus:ring-primary disabled:opacity-60"
                  />

                  {/* Formula Live Safety Indicator */}
                  <div className="mt-1 flex items-center gap-2">
                    {formulaValidation.valid ? (
                      <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'صيغة صحيحة وآمنة (Whitelisted)' : 'Formula verified safe & whitelisted'}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[11px] text-rose-400 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{formulaValidation.error}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Condition & Amount Type */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-text mb-1">
                      {language === 'ar' ? 'شرط التطبيق' : 'Application Condition'}
                    </label>
                    <input
                      type="text"
                      disabled={isFinance || !canEdit}
                      value={selectedRule.condition || '1 == 1'}
                      onChange={(e) => handleUpdateSelectedRule('condition', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg text-xs font-mono bg-surface border border-border text-text disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-text mb-1">
                      {language === 'ar' ? 'نوع القيمة' : 'Amount Type'}
                    </label>
                    <select
                      disabled={isFinance || !canEdit}
                      value={selectedRule.amount_type}
                      onChange={(e) => handleUpdateSelectedRule('amount_type', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-text disabled:opacity-60"
                    >
                      <option value="Formula">Formula</option>
                      <option value="Fixed">Fixed Amount</option>
                      <option value="Percentage">Percentage</option>
                      <option value="Input">Manual Input</option>
                    </select>
                  </div>
                </div>

                {/* Accounting GL Accounts (Section 5.3: Finance role editable!) */}
                <div className="p-3 rounded-xl border border-border/70 bg-surface/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text">
                      {language === 'ar' ? 'حسابات دفتر الأستاذ العام (General Ledger Accounts)' : 'Accounting Ledger Accounts (Debit / Credit)'}
                    </span>
                    {isFinance && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                        FINANCE EDITABLE
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] text-text-muted mb-1">
                        {language === 'ar' ? 'الحساب المدين (Debit GL)' : 'Debit Account Code'}
                      </label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={selectedRule.debit_account || ''}
                        onChange={(e) => handleUpdateSelectedRule('debit_account', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg text-xs font-mono bg-surface border border-border text-text focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-text-muted mb-1">
                        {language === 'ar' ? 'الحساب الدائن (Credit GL)' : 'Credit Account Code'}
                      </label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={selectedRule.credit_account || ''}
                        onChange={(e) => handleUpdateSelectedRule('credit_account', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg text-xs font-mono bg-surface border border-border text-text focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Shown on Payslip Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="shownPayslip"
                    disabled={isFinance || !canEdit}
                    checked={selectedRule.is_shown_on_payslip}
                    onChange={(e) => handleUpdateSelectedRule('is_shown_on_payslip', e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <label htmlFor="shownPayslip" className="text-xs text-text">
                    {language === 'ar' ? 'إظهار بند الراتب في قسيمة الراتب الرسمية للموظف' : 'Display this rule item on employee official payslip'}
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            Tab 2: Rule B "Test This Rule" Simulator Panel
           ========================================================================= */}
        {activeTab === 'simulator' && (
          <div className="space-y-4">
            {/* Persona Preset Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-text me-1">
                {language === 'ar' ? 'اختر موظفاً تجريبياً:' : 'Select Demo Preset:'}
              </span>
              {['AHMED', 'SARA', 'OMAR', 'CUSTOM'].map((key) => {
                const isSelected = selectedPresetKey === key;
                const label = key === 'AHMED'
                  ? 'Ahmed (Worked Example 8)'
                  : key === 'SARA'
                  ? 'Sara (Full Month)'
                  : key === 'OMAR'
                  ? 'Omar (UAE National)'
                  : 'Custom Test';

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedPresetKey(key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      isSelected
                        ? 'border-primary bg-primary text-on-primary shadow-md'
                        : 'border-border bg-surface text-text-muted hover:text-text'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Presets Description Callout */}
            <div
              className="p-3 rounded-xl border text-xs flex items-center justify-between gap-3"
              style={{ background: 'var(--primary-wash)', borderColor: 'var(--glass-border)' }}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary shrink-0" />
                <span className="text-text-muted">
                  {selectedPresetKey === 'AHMED' && DEMO_PRESETS_DATA.AHMED.notes}
                  {selectedPresetKey === 'SARA' && DEMO_PRESETS_DATA.SARA.notes}
                  {selectedPresetKey === 'OMAR' && DEMO_PRESETS_DATA.OMAR.notes}
                  {selectedPresetKey === 'CUSTOM' && 'Adjust custom inputs below to test any wage formula combination.'}
                </span>
              </div>

              <div className="text-end shrink-0">
                <span className="text-[10px] text-text-muted block">{language === 'ar' ? 'الصافي المتوقع:' : 'Target Net:'}</span>
                <span className="text-sm font-extrabold font-mono text-primary">
                  AED {selectedPresetKey === 'AHMED' ? '7,044.80' : selectedPresetKey === 'SARA' ? '8,000.00' : selectedPresetKey === 'OMAR' ? '9,500.00' : simulationResult.formattedNet}
                </span>
              </div>
            </div>

            {/* Custom Inputs Panel (if CUSTOM) */}
            {selectedPresetKey === 'CUSTOM' && (
              <div className="p-3.5 rounded-xl border border-border/70 bg-surface/50 grid grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-text-muted block">Basic Pay (AED)</label>
                  <input
                    type="number"
                    value={customParams.basic}
                    onChange={(e) => setCustomParams({ ...customParams, basic: Number(e.target.value) })}
                    className="w-full px-2 py-1 rounded text-xs font-mono bg-surface border border-border text-text"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block">HRA (AED)</label>
                  <input
                    type="number"
                    value={customParams.hra}
                    onChange={(e) => setCustomParams({ ...customParams, hra: Number(e.target.value) })}
                    className="w-full px-2 py-1 rounded text-xs font-mono bg-surface border border-border text-text"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block">Absent Days</label>
                  <input
                    type="number"
                    value={customParams.absent_days}
                    onChange={(e) => setCustomParams({ ...customParams, absent_days: Number(e.target.value) })}
                    className="w-full px-2 py-1 rounded text-xs font-mono bg-surface border border-border text-text"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block">Normal OT Hours</label>
                  <input
                    type="number"
                    value={customParams.ot_hours_normal}
                    onChange={(e) => setCustomParams({ ...customParams, ot_hours_normal: Number(e.target.value) })}
                    className="w-full px-2 py-1 rounded text-xs font-mono bg-surface border border-border text-text"
                  />
                </div>
              </div>
            )}

            {/* Step-by-Step Execution Results Table */}
            <div className="border border-border/70 rounded-xl overflow-hidden bg-surface/40">
              <div className="p-2.5 bg-surface border-b border-border/60 flex items-center justify-between text-xs font-bold">
                <span className="text-text">{language === 'ar' ? 'خطوات تنفيذ المحرك (Step-by-Step Rule Engine Evaluation)' : 'Rule Execution Steps & Evaluated Amounts'}</span>
                <span className="text-emerald-400 font-mono text-[11px] font-extrabold">
                  NET PAY: {simulationResult.formattedNet}
                </span>
              </div>

              <div className="divide-y divide-border/40 max-h-72 overflow-y-auto">
                {simulationResult.steps?.map((step) => (
                  <div key={step.code} className="grid grid-cols-12 p-2.5 text-xs hover:bg-surface-hover/50 items-center">
                    <div className="col-span-1 text-[11px] font-mono text-text-muted">#{step.sequence}</div>
                    <div className="col-span-3">
                      <span className="font-mono font-bold text-primary block">{step.code}</span>
                      <span className="text-[10px] text-text-muted truncate block">{step.name}</span>
                    </div>
                    <div className="col-span-5 text-[11px] font-mono text-text-muted truncate">
                      {step.formula || 'Base Input'}
                    </div>
                    <div className="col-span-3 text-end">
                      <span className={`font-mono font-bold ${
                        step.category === 'Deduction'
                          ? 'text-rose-400'
                          : step.category === 'Net'
                          ? 'text-primary font-extrabold text-sm'
                          : 'text-text'
                      }`}>
                        {step.category === 'Deduction' ? `-${step.amount.toFixed(2)}` : step.amount.toFixed(2)} AED
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            Tab 3: Statutory Absence Divisor, OT Multipliers & GPSSA Rates
           ========================================================================= */}
        {activeTab === 'statutory' && (
          <div className="space-y-4">
            {/* Absence Divisor (Section 8.1 & 8.4) */}
            <div className="p-4 rounded-xl border border-border/70 bg-surface/50 space-y-3">
              <span className="text-xs font-bold text-text block">
                {language === 'ar' ? 'مقسوم استقطاع الغياب (Absence Divisor)' : 'Absence Deduction Divisor Method (Section 8.1)'}
              </span>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className={`p-3 rounded-xl border cursor-pointer flex items-start gap-3 transition-colors ${
                  absenceDivisor === 'DAYS_30'
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-surface'
                }`}>
                  <input
                    type="radio"
                    name="absenceDiv"
                    disabled={isFinance || !canEdit}
                    checked={absenceDivisor === 'DAYS_30'}
                    onChange={() => setAbsenceDivisor('DAYS_30')}
                    className="mt-0.5 text-primary"
                  />
                  <div>
                    <span className="font-bold text-text block">÷30 (Standard 30-Day Month)</span>
                    <span className="text-[11px] text-text-muted mt-0.5 block">
                      Formula: (Gross / 30) * absent_days. Ahmed 2 days = AED 533.33.
                    </span>
                  </div>
                </label>

                <label className={`p-3 rounded-xl border cursor-pointer flex items-start gap-3 transition-colors ${
                  absenceDivisor === 'DAYS_365'
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-surface'
                }`}>
                  <input
                    type="radio"
                    name="absenceDiv"
                    disabled={isFinance || !canEdit}
                    checked={absenceDivisor === 'DAYS_365'}
                    onChange={() => setAbsenceDivisor('DAYS_365')}
                    className="mt-0.5 text-primary"
                  />
                  <div>
                    <span className="font-bold text-text block">×12 ÷ 365 (Actual Calendar Divisor)</span>
                    <span className="text-[11px] text-text-muted mt-0.5 block">
                      Formula: (Gross * 12 / 365) * absent_days. Ahmed 2 days = AED 526.03.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Overtime Multipliers & Night Window */}
            <div className="p-4 rounded-xl border border-border/70 bg-surface/50 space-y-3">
              <span className="text-xs font-bold text-text block">
                {language === 'ar' ? 'معاملات العمل الإضافي ونافذة الليل' : 'Overtime Multipliers & Night Window'}
              </span>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-border/60 bg-surface">
                  <span className="text-text-muted block text-[11px]">{language === 'ar' ? 'إضافي عادي' : 'Normal Overtime'}</span>
                  <span className="text-base font-extrabold font-mono text-text mt-1 block">1.25x</span>
                  <span className="text-[10px] text-text-muted">(Basic / 30 / 8) * 1.25</span>
                </div>
                <div className="p-3 rounded-lg border border-border/60 bg-surface">
                  <span className="text-text-muted block text-[11px]">{language === 'ar' ? 'إضافي ليلي' : 'Night Window OT'}</span>
                  <span className="text-base font-extrabold font-mono text-text mt-1 block">1.50x</span>
                  <span className="text-[10px] text-text-muted">Between 22:00 and 04:00</span>
                </div>
                <div className="p-3 rounded-lg border border-border/60 bg-surface">
                  <span className="text-text-muted block text-[11px]">{language === 'ar' ? 'إضافي عطلات' : 'Rest / Holiday OT'}</span>
                  <span className="text-base font-extrabold font-mono text-text mt-1 block">1.50x</span>
                  <span className="text-[10px] text-text-muted">Fridays / Weekends / Holidays</span>
                </div>
              </div>
            </div>

            {/* GPSSA Pension Rates */}
            <div className="p-4 rounded-xl border border-border/70 bg-surface/50 space-y-3">
              <span className="text-xs font-bold text-text block">
                {language === 'ar' ? 'نسب الهيئة العامة للمعاشات والتأمينات (GPSSA)' : 'GPSSA Statutory Pension Contribution Rates'}
              </span>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-border/60 bg-surface">
                  <span className="text-text-muted block text-[11px]">Employee Share</span>
                  <span className="text-base font-extrabold font-mono text-primary mt-1 block">5.0%</span>
                  <span className="text-[10px] text-text-muted">Deducted from gross</span>
                </div>
                <div className="p-3 rounded-lg border border-border/60 bg-surface">
                  <span className="text-text-muted block text-[11px]">Employer Share</span>
                  <span className="text-base font-extrabold font-mono text-text mt-1 block">12.5%</span>
                  <span className="text-[10px] text-text-muted">Company contribution</span>
                </div>
                <div className="p-3 rounded-lg border border-border/60 bg-surface">
                  <span className="text-text-muted block text-[11px]">Salary Cap</span>
                  <span className="text-base font-extrabold font-mono text-text mt-1 block">50,000 AED</span>
                  <span className="text-[10px] text-text-muted">Maximum contributory base</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-border/60 flex items-center justify-between">
          <span className="text-[11px] text-text-muted">
            {language === 'ar' ? '13 قاعدة رواتب نشطة متوافقة مع قانون العمل الإماراتي' : '13 active statutory salary rules loaded'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-surface border border-border text-text hover:bg-surface-hover transition-colors"
            >
              {language === 'ar' ? 'إغلاق' : 'Close'}
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-transform active:scale-95"
                style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'حفظ إعدادات الرواتب' : 'Save Rules'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
