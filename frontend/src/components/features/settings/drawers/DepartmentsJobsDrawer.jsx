'use client';

import React, { useState } from 'react';
import { Drawer } from '../../../primitives/Drawer';
import { Select } from '../../../primitives/form/Select';
import { Network, Briefcase, UserCheck, ChevronRight, Plus, Check } from 'lucide-react';
import { useLanguage } from '../../../../context/LanguageContext';

export function DepartmentsJobsDrawer({
  isOpen,
  onClose,
  departments = [],
  jobs = [],
  canEdit = true,
  onSave,
}) {
  const { isRTL, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('departments'); // 'departments' | 'jobs'
  const toArray = (val) => {
    if (Array.isArray(val)) return val;
    if (val?.flat && Array.isArray(val.flat)) return val.flat;
    if (val?.departments && Array.isArray(val.departments)) return val.departments;
    if (val?.jobs && Array.isArray(val.jobs)) return val.jobs;
    return [];
  };

  const [deptList, setDeptList] = useState(() => toArray(departments));
  const [jobList, setJobList] = useState(() => toArray(jobs));
  React.useEffect(() => {
    setDeptList(toArray(departments));
  }, [departments]);
  React.useEffect(() => {
    setJobList(toArray(jobs));
  }, [jobs]);

  const [isAddingJob, setIsAddingJob] = useState(false);
  const [newJob, setNewJob] = useState({
    code: '',
    title: '',
    title_ar: '',
    grade: 'Mid',
    department: departments[0]?.name || 'Operations',
  });

  const handleAddJob = (e) => {
    e.preventDefault();
    if (!newJob.title || !newJob.code) return;
    const selectedDept = deptList.find((d) => d.name === newJob.department) || deptList[0];
    const created = {
      id: `j-custom-${Date.now()}`,
      job_code: newJob.code.toUpperCase(),
      code: newJob.code.toUpperCase(),
      title: newJob.title,
      title_ar: newJob.title_ar || newJob.title,
      grade: newJob.grade || 'Standard',
      department: selectedDept?.name || 'Operations',
      department_id: selectedDept?.id || undefined,
    };
    setJobList([...jobList, created]);
    setNewJob({ code: '', title: '', title_ar: '', grade: 'Mid', department: deptList[0]?.name || 'Operations' });
    setIsAddingJob(false);
  };

  const handleSave = () => {
    if (onSave) onSave({ departments: deptList, jobs: jobList });
    onClose();
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'ar' ? 'الأقسام الإدارية والوظائف' : 'Departments & Job Positions'}
      subtitle={
        language === 'ar'
          ? 'الهيكل الهرمي للأقسام، مدير القسم (المعتمد الأول للإجازات)، والرتب الوظيفية'
          : 'Department tree (parent/child), manager (first leave approver), titles & grades'
      }
      width="max-w-2xl"
    >
      <div className="space-y-4 pb-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-border/60">
          <button
            type="button"
            onClick={() => setActiveTab('departments')}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'departments'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'الهيكل التنظيمي للأقسام' : 'Department Hierarchy Tree'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-surface border border-border">
              {deptList.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('jobs')}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'jobs'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'المسميات والرتب الوظيفية' : 'Job Titles & Grades'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-surface border border-border">
              {jobList.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Departments Hierarchy Tree */}
        {activeTab === 'departments' && (
          <div className="space-y-4">
            <div
              className="p-3 rounded-xl border text-xs flex items-center gap-2.5"
              style={{ background: 'var(--primary-wash)', borderColor: 'var(--glass-border)' }}
            >
              <UserCheck className="w-4 h-4 text-primary shrink-0" />
              <span className="text-text-muted">
                {language === 'ar'
                  ? 'قاعدة النظام 9: مدير القسم المعين هو المعتمد التلقائي للخطوة الأولى في طلبات الإجازات والعمل الإضافي لموظفي قسمه.'
                  : 'Section 9 Rule: The Department Manager acts as the automatic 1st-tier approver for team leaves and overtime requests.'}
              </span>
            </div>

            <div className="space-y-2.5">
              {deptList.map((dept) => {
                const isChild = Boolean(dept.parent_id);
                return (
                  <div
                    key={dept.id}
                    className={`p-3 rounded-xl border border-border/70 bg-surface/50 hover:border-border transition-colors ${
                      isChild ? (isRTL ? 'mr-6' : 'ml-6') : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isChild ? (
                          <div className="w-2 h-2 rounded-full bg-primary/60 shrink-0" />
                        ) : (
                          <div
                            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: 'var(--primary-wash)', color: 'var(--primary)' }}
                          >
                            <Network className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div>
                          <span className="text-xs font-bold text-text block">
                            {language === 'ar' ? dept.name_ar || dept.name : dept.name}
                          </span>
                          <span className="text-[11px] text-text-muted flex items-center gap-1 mt-0.5">
                            <span className="text-primary font-semibold">
                              {language === 'ar' ? 'مدير القسم (المعتمد الأول):' : 'Approver 1 (Manager):'}
                            </span>
                            <span>{dept.manager?.name || dept.manager_name || (language === 'ar' ? 'غير معين' : 'Unassigned')}</span>
                          </span>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-surface border border-border text-text">
                        {dept._count?.contracts ?? dept.employee_count ?? 0} {language === 'ar' ? 'موظف' : 'staff'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Job Titles & Grades */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            <div className="space-y-2">
              {jobList.map((job) => (
                <div
                  key={job.id}
                  className="p-3 rounded-xl border border-border/70 bg-surface/50 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
                      {job.job_code || job.code || 'JOB'}
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-text block truncate">
                        {language === 'ar' ? job.title_ar || job.title : job.title}
                      </span>
                      <span className="text-[11px] text-text-muted block truncate">
                        {typeof job.department === 'string' ? job.department : (job.department?.name || 'Operations')}
                      </span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface border border-border text-text shrink-0">
                    {job.grade || 'Standard'}
                  </span>
                </div>
              ))}
            </div>

            {canEdit && !isAddingJob && (
              <button
                type="button"
                onClick={() => setIsAddingJob(true)}
                className="w-full py-2.5 rounded-xl border border-dashed border-border hover:border-primary/50 text-xs font-bold text-text-muted hover:text-primary transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'ar' ? 'إضافة مسمى وظيفي جديد' : 'Add Job Title & Grade'}</span>
              </button>
            )}

            {isAddingJob && (
              <form onSubmit={handleAddJob} className="p-4 rounded-xl border border-primary/40 bg-surface space-y-3">
                <span className="text-xs font-bold text-text block">
                  {language === 'ar' ? 'بيانات المسمى الوظيفي الجديد' : 'New Job Position'}
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Job Code (e.g. OPS-MGR-07)"
                    required
                    value={newJob.code}
                    onChange={(e) => setNewJob({ ...newJob, code: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg text-xs font-mono bg-surface border border-border text-text focus:ring-1 focus:ring-primary uppercase"
                  />
                  <Select
                    value={newJob.grade}
                    onChange={(e) => setNewJob({ ...newJob, grade: e.target.value })}
                    options={[
                      { value: 'Executive', label: 'Executive' },
                      { value: 'Senior', label: 'Senior' },
                      { value: 'Mid', label: 'Mid' },
                      { value: 'Junior', label: 'Junior' },
                      { value: 'Blue-collar', label: 'Blue-collar' },
                    ]}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Title (English)"
                    required
                    value={newJob.title}
                    onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-text focus:ring-1 focus:ring-primary"
                  />
                  <input
                    type="text"
                    dir="rtl"
                    placeholder="المسمى بالعربية"
                    value={newJob.title_ar}
                    onChange={(e) => setNewJob({ ...newJob, title_ar: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-text focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingJob(false)}
                    className="px-3 py-1 rounded-lg text-xs text-text-muted hover:text-text"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-primary text-on-primary"
                  >
                    {language === 'ar' ? 'حفظ المسمى' : 'Save Job'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-border/60 flex items-center justify-between">
          <span className="text-[11px] text-text-muted">
            {deptList.length} {language === 'ar' ? 'أقسام' : 'departments'} · {jobList.length} {language === 'ar' ? 'وظائف' : 'jobs'}
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
