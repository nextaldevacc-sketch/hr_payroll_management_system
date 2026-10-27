'use client';

import React, { useState } from 'react';
import { Drawer } from '../../primitives/Drawer';
import { MapPin, Building, Plus, Trash2, PowerOff, Check } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

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
  const { isRTL, language } = useLanguage();
  const [branchList, setBranchList] = useState(branches);
  const [isAdding, setIsAdding] = useState(false);
  const [newBranch, setNewBranch] = useState({
    name: '',
    name_ar: '',
    emirate: 'Dubai',
    company_visa_id: visas[0]?.id || '',
  });

  const handleAddBranch = (e) => {
    e.preventDefault();
    if (!newBranch.name) return;
    const selectedVisa = visas.find((v) => v.id === newBranch.company_visa_id) || visas[0];
    const created = {
      id: `b-custom-${Date.now()}`,
      name: newBranch.name,
      name_ar: newBranch.name_ar || newBranch.name,
      emirate: newBranch.emirate,
      company_visa_id: selectedVisa?.id || '',
      company_visa_name: selectedVisa?.name || 'Visa 01',
      employee_count: 0,
      is_active: true,
      last_changed_by: 'Current User',
      last_changed_at: new Date().toISOString(),
    };
    setBranchList([...branchList, created]);
    setNewBranch({ name: '', name_ar: '', emirate: 'Dubai', company_visa_id: visas[0]?.id || '' });
    setIsAdding(false);
  };

  const handleDelete = (branch) => {
    if (branch.employee_count > 0) {
      if (onDeleteBranch) {
        onDeleteBranch(branch, `Cannot delete branch '${branch.name}': Assigned to ${branch.employee_count} active employees. Deactivate instead.`);
      }
      return;
    }
    setBranchList(branchList.filter((b) => b.id !== branch.id));
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
                      {branch.emirate} · {branch.company_visa_name || 'Visa 01'}
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

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Branch Name (English)"
                required
                value={newBranch.name}
                onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-text focus:ring-1 focus:ring-primary"
              />
              <input
                type="text"
                dir="rtl"
                placeholder="اسم الفرع بالعربية"
                value={newBranch.name_ar}
                onChange={(e) => setNewBranch({ ...newBranch, name_ar: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-text focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-text-muted mb-1">{language === 'ar' ? 'الإمارة' : 'Emirate'}</label>
                <select
                  value={newBranch.emirate}
                  onChange={(e) => setNewBranch({ ...newBranch, emirate: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-text focus:ring-1 focus:ring-primary"
                >
                  {UAE_EMIRATES.map((em) => (
                    <option key={em} value={em}>{em}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-text-muted mb-1">{language === 'ar' ? 'التأشيرة التابعة' : 'Associated Visa'}</label>
                <select
                  value={newBranch.company_visa_id}
                  onChange={(e) => setNewBranch({ ...newBranch, company_visa_id: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-text focus:ring-1 focus:ring-primary"
                >
                  {visas.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
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
