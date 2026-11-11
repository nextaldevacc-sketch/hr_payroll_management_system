'use client';

import React, { useState } from 'react';
import { Drawer } from '../../../primitives/Drawer';
import { Select } from '../../../primitives/form/Select';
import { MapPin, Building, Plus, Trash2, PowerOff, Check } from 'lucide-react';
import { useLanguage } from '../../../../context/LanguageContext';
import { useToast } from '../../../../context/ToastContext';
import { formatErrorMessage } from '../../../../utils/formatError';
import { createBranch, deleteBranch } from '../../../../services/settingsApi';

const UAE_EMIRATES = [
  'Abu Dhabi',
  'Dubai',
  'Sharjah',
  'Ajman',
  'Umm Al Quwain',
  'Ras Al Khaimah',
  'Fujairah',
];

export function BranchesDrawer({
  isOpen,
  onClose,
  branches = [],
  visas = [],
  canEdit = true,
  onSave,
  onDeleteBranch,
}) {
  const { isRTL, language, t } = useLanguage();
  const { showError, showSuccess } = useToast();
  const [branchList, setBranchList] = useState(branches);
  React.useEffect(() => {
    setBranchList(branches || []);
  }, [branches]);
  const [isAdding, setIsAdding] = useState(false);
  const [newBranch, setNewBranch] = useState({
    name: '',
    name_ar: '',
    emirate: 'Dubai',
    company_visa_id: visas[0]?.id || '',
  });

  const handleAddBranch = async (e) => {
    e.preventDefault();
    if (!newBranch.name || !newBranch.name_ar) return;
    const selectedVisa = visas.find((v) => v.id === newBranch.company_visa_id) || visas[0];
    try {
      const created = await createBranch({
        name: newBranch.name,
        name_ar: newBranch.name_ar,
        emirate: newBranch.emirate,
        company_visa_id: selectedVisa?.id || '',
      });
      setBranchList([
        ...branchList,
        {
          ...created,
          company_visa_name: selectedVisa?.name,
          company_visa_name_ar: selectedVisa?.name_ar,
        },
      ]);
      setNewBranch({ name: '', name_ar: '', emirate: 'Dubai', company_visa_id: visas[0]?.id || '' });
      setIsAdding(false);
      showSuccess(language === 'ar' ? 'تمت إضافة الفرع بنجاح' : 'Branch added successfully');
    } catch (err) {
      showError(formatErrorMessage(err, language) || (language === 'ar' ? 'فشل إضافة الفرع' : 'Failed to add branch'));
    }
  };

  const handleDelete = async (branch) => {
    if (branch.employee_count > 0) {
      if (onDeleteBranch) {
        onDeleteBranch(branch, `Cannot delete branch '${branch.name}': Assigned to ${branch.employee_count} active employees. Deactivate instead.`);
      }
      return;
    }
    try {
      await deleteBranch(branch.id);
      setBranchList(branchList.filter((b) => b.id !== branch.id));
      showSuccess(language === 'ar' ? 'تم حذف الفرع' : 'Branch deleted successfully');
    } catch (err) {
      if (onDeleteBranch) {
        onDeleteBranch(branch, formatErrorMessage(err, language));
      } else {
        showError(formatErrorMessage(err, language) || (language === 'ar' ? 'فشل حذف الفرع' : 'Failed to delete branch'));
      }
    }
  };

  const handleSave = () => {
    if (onSave) onSave(branchList);
    onClose();
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'ar' ? 'فروع الشركة ومواقع العمل' : 'Branches & Locations'}
      subtitle={
        language === 'ar'
          ? 'إدارة الفروع حسب الإمارة وربط كل فرع بالتأشيرة التابعة لها'
          : 'Geographic hubs across the 7 UAE Emirates and company visa linkages'
      }
      width="max-w-xl"
    >
      <div className="space-y-4 pb-6">
        <div className="space-y-3">
          {branchList.map((branch) => (
            <div
              key={branch.id}
              className="p-3.5 rounded-xl border border-border/70 bg-surface/50 hover:border-border transition-colors space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'var(--primary-wash)', color: 'var(--primary)' }}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-text block">
                      {language === 'ar' ? branch.name_ar || branch.name : branch.name}
                    </span>
                    <span className="text-[11px] text-text-muted">
                      {language === 'ar' ? t(`settings.branches.emirates.${branch.emirate}`, branch.emirate) : branch.emirate} · {
                        (() => {
                          const vName = language === 'ar'
                            ? (branch.company_visa_name_ar || branch.company_visa?.name_ar || branch.company_visa_name || branch.company_visa?.name || 'Visa 01')
                            : (branch.company_visa_name || branch.company_visa?.name || 'Visa 01');
                          const est = branch.mol_establishment_id || branch.company_visa?.mol_establishment_id;
                          return est ? `${vName} (${est})` : vName;
                        })()
                      }
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-surface border border-border text-text">
                    {branch.employee_count} {language === 'ar' ? 'موظف' : 'employees'}
                  </span>
                  {canEdit && (
                    <button
                      type="button"
                      id={`btn-delete-branch-${branch.id}`}
                      onClick={() => handleDelete(branch)}
                      title={language === 'ar' ? 'حذف / إلغاء تفعيل' : 'Delete / Deactivate'}
                      className="p-1 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {canEdit && !isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="w-full py-2.5 rounded-xl border border-dashed border-border hover:border-primary/50 text-xs font-bold text-text-muted hover:text-primary transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'ar' ? 'إضافة فرع تشغيلي جديد' : 'Add Operating Branch'}</span>
          </button>
        )}

        {isAdding && (
          <form onSubmit={handleAddBranch} className="p-4 rounded-xl border border-primary/40 bg-surface space-y-3">
            <span className="text-xs font-bold text-text block">
              {language === 'ar' ? 'بيانات الفرع الجديد' : 'New Branch Details'}
            </span>

            {/* Spec: Visa chosen FIRST */}
            <div>
              <Select
                id="new-branch-visa"
                label={language === 'ar' ? 'التأشيرة التابعة (اختر أولاً)' : 'Associated Company Visa (Choose First)'}
                value={newBranch.company_visa_id}
                onChange={(e) => setNewBranch({ ...newBranch, company_visa_id: e.target.value })}
                options={visas.map((v) => ({ value: v.id, label: v.name }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-text-muted block mb-1">
                  {language === 'ar' ? 'اسم الفرع (بالإنجليزية)' : 'Branch Name (English)'}
                </label>
                <input
                  type="text"
                  id="new-branch-name"
                  placeholder="Branch Name"
                  required
                  value={newBranch.name}
                  onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-text focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-[11px] text-text-muted block mb-1">
                  {language === 'ar' ? 'اسم الفرع (بالعربية)' : 'Branch Name (Arabic)'}
                </label>
                <input
                  type="text"
                  id="new-branch-name-ar"
                  dir="rtl"
                  placeholder="اسم الفرع بالعربية"
                  required
                  value={newBranch.name_ar}
                  onChange={(e) => setNewBranch({ ...newBranch, name_ar: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-text focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <Select
                id="new-branch-emirate"
                label={language === 'ar' ? 'الإمارة' : 'Emirate'}
                value={newBranch.emirate}
                onChange={(e) => setNewBranch({ ...newBranch, emirate: e.target.value })}
                options={UAE_EMIRATES.map((em) => ({ value: em, label: em }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1 rounded-lg text-xs text-text-muted hover:text-text"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                id="btn-submit-branch"
                className="px-3 py-1 rounded-lg text-xs font-bold bg-primary text-on-primary"
              >
                {language === 'ar' ? 'حفظ الفرع' : 'Save Branch'}
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-border/60 flex items-center justify-between">
          <span className="text-[11px] text-text-muted">
            {branchList.length} {language === 'ar' ? 'فروع نشطة' : 'active branches'}
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
                <span>{language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
