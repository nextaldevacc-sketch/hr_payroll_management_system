'use client';

import React, { useState } from 'react';
import { Drawer } from '../../../primitives/Drawer';
import { CheckSquare, ArrowRight, ArrowLeft, Shield, Plus, Trash2, Check, Sparkles } from 'lucide-react';
import { useLanguage } from '../../../../context/LanguageContext';

const REQUEST_TYPES = [
  { key: 'Leave', labelEn: 'Leave Requests', labelAr: 'طلبات الإجازات' },
  { key: 'Overtime', labelEn: 'Overtime Requests', labelAr: 'طلبات العمل الإضافي' },
  { key: 'Salary Adjustment', labelEn: 'Salary Adjustments', labelAr: 'تسويات وتعديل الرواتب' },
  { key: 'Pay Run', labelEn: 'Pay Run Lifecycle', labelAr: 'مسار اعتماد مسير الرواتب' },
  { key: 'Separation', labelEn: 'Separations & Resignations', labelAr: 'إنهاء الخدمة والاستقالات' },
  { key: 'Final Settlement', labelEn: 'Final Settlement (EOSB)', labelAr: 'مستحقات نهاية الخدمة والمخالصة' },
];

const AVAILABLE_ROLES = [
  { code: 'DEPT_MANAGER', nameEn: 'Department Manager', nameAr: 'مدير القسم' },
  { code: 'HR_OFFICER', nameEn: 'HR Officer', nameAr: 'مسؤول الموارد البشرية' },
  { code: 'HR_MANAGER', nameEn: 'HR Manager', nameAr: 'مدير الموارد البشرية' },
  { code: 'PAYROLL_OFFICER', nameEn: 'Payroll Officer', nameAr: 'مسؤول الرواتب' },
  { code: 'GM', nameEn: 'General Manager (Executive)', nameAr: 'المدير العام' },
  { code: 'FINANCE', nameEn: 'Finance / Accounts', nameAr: 'المالية والحسابات' },
];

export function ApprovalSettingsDrawer({
  isOpen,
  onClose,
  approvalFlows = [],
  canEdit = true,
  onSave,
}) {
  const { isRTL, language } = useLanguage();
  const [flows, setFlows] = useState(approvalFlows);
  const [selectedType, setSelectedType] = useState('Leave');

  React.useEffect(() => {
    if (approvalFlows && approvalFlows.length > 0) {
      setFlows(approvalFlows);
    }
  }, [approvalFlows]);

  const currentFlow = flows.find((f) => f.request_type === selectedType) || flows[0];

  const handleUpdateStepRole = (stepIndex, newRoleCode) => {
    if (!currentFlow || !canEdit) return;
    const targetRole = AVAILABLE_ROLES.find((r) => r.code === newRoleCode);
    const updatedSteps = [...currentFlow.steps];
    updatedSteps[stepIndex] = {
      ...updatedSteps[stepIndex],
      role: newRoleCode,
      roleNameEn: targetRole?.nameEn || newRoleCode,
      roleNameAr: targetRole?.nameAr || newRoleCode,
    };
    const updatedFlow = { ...currentFlow, steps: updatedSteps };
    setFlows(flows.map((f) => (f.request_type === currentFlow.request_type ? updatedFlow : f)));
  };

  const handleAddConditionalStep = () => {
    if (!currentFlow || !canEdit) return;
    const nextStepNum = currentFlow.steps.length + 1;
    const newStep = {
      step: nextStepNum,
      role: 'GM',
      roleNameEn: 'General Manager (Executive)',
      roleNameAr: 'المدير العام',
      is_conditional: true,
      condition: selectedType === 'Leave' ? 'Leave Duration > 5 Days' : 'Amount > AED 2,000',
    };
    const updatedFlow = { ...currentFlow, steps: [...currentFlow.steps, newStep] };
    setFlows(flows.map((f) => (f.request_type === currentFlow.request_type ? updatedFlow : f)));
  };

  const handleSave = () => {
    if (onSave) onSave(flows);
    onClose();
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'ar' ? 'مسارات وخطوات الاعتماد والموافقة' : 'Multi-Tier Approval Workflows'}
      subtitle={
        language === 'ar'
          ? 'تحديد الخطوات المتسلسلة لكل طلب والخطوات المشروطة (مثل موافقة المدير العام إذا زادت الإجازة عن 5 أيام)'
          : 'Ordered approval stages, roles, and conditional rules per workflow type'
      }
      width="max-w-2xl"
    >
      <div className="space-y-4 pb-6">
        {/* Horizontal Request Type Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-border/60">
          {REQUEST_TYPES.map((rt) => {
            const isSelected = selectedType === rt.key;
            return (
              <button
                key={rt.key}
                type="button"
                onClick={() => setSelectedType(rt.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'border-primary bg-primary text-on-primary shadow-sm'
                    : 'border-border bg-surface text-text-muted hover:text-text'
                }`}
              >
                {language === 'ar' ? rt.labelAr : rt.labelEn}
              </button>
            );
          })}
        </div>

        {currentFlow && (
          <div className="space-y-4">
            {/* Header info */}
            <div className="p-3.5 rounded-xl border border-border/70 bg-surface/50 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-text block">
                  {language === 'ar' ? `مسار: ${currentFlow.request_type_ar || currentFlow.request_type}` : `Workflow: ${currentFlow.request_type}`}
                </span>
                <span className="text-[11px] text-text-muted">
                  {currentFlow.steps.length} {language === 'ar' ? 'خطوات متسلسلة للموافقة' : 'sequential stages configured'}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary border border-primary/30">
                ACTIVE PIPELINE
              </span>
            </div>

            {/* Steps Timeline */}
            <div className="space-y-3">
              {currentFlow.steps.map((st, idx) => (
                <div
                  key={st.step || idx}
                  className={`p-3.5 rounded-xl border transition-colors space-y-2 ${
                    st.is_conditional
                      ? 'border-amber-500/40 bg-amber-500/5'
                      : 'border-border/70 bg-surface/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary font-mono font-bold flex items-center justify-center text-xs shrink-0">
                        {st.step}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-text block">
                          {language === 'ar' ? `الخطوة ${st.step}: ${st.roleNameAr || st.role}` : `Step ${st.step}: ${st.roleNameEn || st.role}`}
                        </span>
                        {st.is_conditional && (
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-amber-300 font-semibold mt-0.5">
                            <div className="flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              <span>{language === 'ar' ? `شرط التفعيل: ${st.condition}` : `Conditional Extra Step: ${st.condition}`}</span>
                            </div>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {language === 'ar' ? 'الافتراضي التجريبي، حدد سياسة الشركة' : 'Demo default, set your company policy'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {canEdit && (
                      <select
                        value={st.role}
                        onChange={(e) => handleUpdateStepRole(idx, e.target.value)}
                        className="px-2.5 py-1 rounded-lg text-xs bg-surface border border-border text-text focus:ring-1 focus:ring-primary"
                      >
                        {AVAILABLE_ROLES.map((r) => (
                          <option key={r.code} value={r.code}>
                            {language === 'ar' ? r.nameAr : r.nameEn}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Conditional Step Button */}
            {canEdit && (
              <button
                type="button"
                onClick={handleAddConditionalStep}
                className="w-full py-2.5 rounded-xl border border-dashed border-border hover:border-primary/50 text-xs font-bold text-text-muted hover:text-primary transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'ar' ? 'إضافة خطوة اعتماد مشروطة (مثل GM > 5 أيام)' : 'Add Conditional Extra Step (e.g. GM if > 5 days)'}</span>
              </button>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-border/60 flex items-center justify-between">
          <span className="text-[11px] text-text-muted">
            {flows.length} {language === 'ar' ? 'مسارات موافقة معرفة بالكامل' : 'approval pipelines configured'}
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
                <span>{language === 'ar' ? 'حفظ مسارات الموافقة' : 'Save Workflows'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
