'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  AlertTriangle,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';
import { useLanguage } from '../../../context/LanguageContext';
import {
  downloadImportTemplate,
  validateEmployeeImport,
  executeEmployeeImport,
} from '../../../services/employeesApi';

export function EmployeeImportModal({ isOpen, onClose, onSuccess }) {
  const { isRTL, language, t } = useLanguage();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [generalError, setGeneralError] = useState('');

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      selectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      selectFile(e.target.files[0]);
    }
  };

  const selectFile = (selected) => {
    setGeneralError('');
    setValidationResult(null);
    setImportResult(null);

    const ext = selected.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      setGeneralError(
        isRTL
          ? 'نوع الملف غير مدعوم. يرجى تحميل ملف CSV أو XLSX.'
          : 'Unsupported file type. Please upload a CSV or XLSX file.'
      );
      return;
    }

    if (selected.size > 5 * 1024 * 1024) {
      setGeneralError(
        isRTL
          ? 'حجم الملف يتجاوز الحد الأقصى المسموح به (5 ميجابايت).'
          : 'File size exceeds maximum allowed limit (5MB).'
      );
      return;
    }

    setFile(selected);
  };

  const handleDownloadTemplate = async (format) => {
    try {
      await downloadImportTemplate(format);
    } catch (err) {
      setGeneralError(err.message || 'Failed to download template');
    }
  };

  const handleValidate = async () => {
    if (!file) return;
    setIsValidating(true);
    setGeneralError('');
    try {
      const res = await validateEmployeeImport(file);
      setValidationResult(res);
    } catch (err) {
      if (err.errors) {
        setValidationResult({
          dryRun: true,
          totalRows: err.totalRows || 0,
          validRows: err.validRows || 0,
          invalidRows: err.invalidRows || err.errors.length,
          errors: err.errors,
        });
      } else {
        setGeneralError(err.message || 'Validation request failed');
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!file) return;
    setIsImporting(true);
    setGeneralError('');
    try {
      const res = await executeEmployeeImport(file);
      setImportResult(res);
      if (onSuccess) onSuccess();
    } catch (err) {
      if (err.errors) {
        setValidationResult({
          dryRun: true,
          totalRows: err.totalRows || 0,
          validRows: err.validRows || 0,
          invalidRows: err.invalidRows || err.errors.length,
          errors: err.errors,
        });
      } else {
        setGeneralError(err.message || 'Import request failed');
      }
    } finally {
      setIsImporting(false);
    }
  };

  const downloadCredentialsCsv = () => {
    if (!importResult || !importResult.credentials || importResult.credentials.length === 0) return;
    const header = 'Employee Code,Name,Email,Temporary Password\n';
    const rows = importResult.credentials
      .map(
        (c) =>
          `"${c.employee_code || ''}","${c.name || ''}","${c.email || ''}","${c.tempPassword || ''}"`
      )
      .join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `imported-credentials-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    setFile(null);
    setValidationResult(null);
    setImportResult(null);
    setGeneralError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className={clsx(
          'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden transition-all',
          isRTL ? 'text-right' : 'text-left'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--surface-muted)]/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">
                {isRTL ? 'استيراد الموظفين المجمع' : 'Bulk Employee Import'}
              </h2>
              <p className="text-xs text-[var(--foreground-muted)]">
                {isRTL
                  ? 'تحميل بيانات الموظفين عبر ملف CSV أو Excel مع التحقق الفوري'
                  : 'Upload employee data via CSV or Excel with instant validation'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--foreground-muted)] hover:bg-[var(--surface-muted)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* General Error Banner */}
          {generalError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>{generalError}</div>
            </div>
          )}

          {/* Success State */}
          {importResult && importResult.success ? (
            <div className="text-center py-8 space-y-5 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[var(--foreground)]">
                  {isRTL ? 'تم استيراد الموظفين بنجاح!' : 'Import Completed Successfully!'}
                </h3>
                <p className="text-sm text-[var(--foreground-muted)] mt-1">
                  {isRTL
                    ? `تم إضافة ${importResult.importedCount} موظفاً بنجاح إلى قاعدة البيانات وإنشاء عقودهم وتعيين صلاحياتهم.`
                    : `Successfully imported ${importResult.importedCount} employees, initialized contracts, and provisioned user accounts.`}
                </p>
              </div>

              {importResult.credentials && importResult.credentials.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-start max-w-md mx-auto space-y-3">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-sm">
                    <KeyRound className="w-4 h-4" />
                    <span>{isRTL ? 'بيانات تسجيل الدخول المؤقتة' : 'Temporary Login Credentials'}</span>
                  </div>
                  <p className="text-xs text-[var(--foreground-muted)]">
                    {isRTL
                      ? 'تم إنشاء كلمات مرور مؤقتة للموظفين الجدد تتطلب التغيير عند أول تسجيل دخول. قم بتحميل الملف الآن لحفظها بأمان.'
                      : 'Temporary passwords were generated for new employees requiring password change on first login. Download the file now.'}
                  </p>
                  <button
                    onClick={downloadCredentialsCsv}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isRTL ? 'تحميل بيانات الدخول (CSV)' : 'Download Credentials (CSV)'}</span>
                  </button>
                </div>
              )}

              <div className="pt-4 flex justify-center gap-3">
                <button
                  onClick={resetAll}
                  className="px-4 py-2 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-muted)] text-sm font-medium transition-colors"
                >
                  {isRTL ? 'استيراد ملف آخر' : 'Import Another File'}
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-primary text-[var(--on-primary)] hover:bg-primary-hover text-sm font-semibold shadow transition-colors"
                >
                  {isRTL ? 'إغلاق ومتابعة' : 'Close and View Directory'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: Download Templates */}
              <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                    {isRTL ? 'الخطوة 1: تحميل النموذج' : 'Step 1: Download Official Template'}
                  </span>
                  <span className="text-[11px] text-[var(--foreground-muted)]">
                    {isRTL ? 'يحتوي على الحقول الإلزامية والقوائم المنسدلة' : 'Pre-configured with dropdown validations'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate('xlsx')}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>{isRTL ? 'تحميل نموذج إكسل (.xlsx)' : 'Download Excel (.xlsx)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate('csv')}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-[var(--foreground)] text-xs font-semibold transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span>{isRTL ? 'تحميل نموذج CSV (.csv)' : 'Download CSV (.csv)'}</span>
                  </button>
                </div>
              </div>

              {/* Step 2: Dropzone */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                  {isRTL ? 'الخطوة 2: اختيار أو سحب الملف' : 'Step 2: Upload or Drop File'}
                </span>
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={clsx(
                    'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3',
                    dragActive
                      ? 'border-primary bg-primary/5 scale-[1.01]'
                      : file
                      ? 'border-emerald-500/50 bg-emerald-500/5'
                      : 'border-[var(--border)] hover:border-primary/50 bg-[var(--surface-muted)]/20'
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div
                    className={clsx(
                      'w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm',
                      file
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-primary/10 text-primary border border-primary/20'
                    )}
                  >
                    {file ? <CheckCircle2 className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                  </div>
                  <div>
                    {file ? (
                      <div>
                        <div className="font-semibold text-sm text-[var(--foreground)]">{file.name}</div>
                        <div className="text-xs text-[var(--foreground-muted)] mt-0.5">
                          {(file.size / 1024).toFixed(1)} KB — {isRTL ? 'جاهز للفحص' : 'Ready to validate'}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-semibold text-sm text-[var(--foreground)]">
                          {isRTL ? 'اسحب الملف هنا أو انقر للتصفح' : 'Drop your file here, or click to browse'}
                        </div>
                        <div className="text-xs text-[var(--foreground-muted)] mt-0.5">
                          CSV, XLSX (max 5MB, up to 1000 rows)
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 3: Validation Preview Table */}
              {validationResult && (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                      {isRTL ? 'نتيجة الفحص والمعاينة' : 'Validation Preview'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--surface-muted)] font-medium">
                        {isRTL ? `الإجمالي: ${validationResult.totalRows}` : `Total: ${validationResult.totalRows}`}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                        {isRTL ? `سليم: ${validationResult.validRows}` : `Valid: ${validationResult.validRows}`}
                      </span>
                      {validationResult.invalidRows > 0 && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold border border-rose-500/20">
                          {isRTL ? `أخطاء: ${validationResult.invalidRows}` : `Errors: ${validationResult.invalidRows}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {validationResult.errors && validationResult.errors.length > 0 ? (
                    <div className="border border-rose-500/20 rounded-xl overflow-hidden bg-rose-500/5">
                      <div className="p-3 bg-rose-500/10 border-b border-rose-500/20 flex items-center gap-2 text-rose-700 dark:text-rose-300 font-semibold text-xs">
                        <AlertTriangle className="w-4 h-4" />
                        <span>
                          {isRTL
                            ? `تم اكتشاف ${validationResult.errors.length} خطأ في الملف. يجب تصحيح الأخطاء قبل المتابعة:`
                            : `Found ${validationResult.errors.length} issue(s). All rows must be valid before import:`}
                        </span>
                      </div>
                      <div className="max-h-52 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-[var(--surface-muted)] text-[var(--foreground-muted)] text-[11px] sticky top-0">
                            <tr>
                              <th className="p-2 text-start">{isRTL ? 'الصف' : 'Row'}</th>
                              <th className="p-2 text-start">{isRTL ? 'الحقل' : 'Field'}</th>
                              <th className="p-2 text-start">{isRTL ? 'رسالة الخطأ' : 'Issue'}</th>
                              <th className="p-2 text-start">{isRTL ? 'القيمة المدخلة' : 'Provided Value'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)]">
                            {validationResult.errors.map((err, idx) => (
                              <tr key={idx} className="hover:bg-rose-500/10 transition-colors">
                                <td className="p-2 font-mono font-bold text-rose-600">{err.row}</td>
                                <td className="p-2 font-mono font-medium">{err.field}</td>
                                <td className="p-2 text-rose-600 dark:text-rose-400">{err.message}</td>
                                <td className="p-2 font-mono text-[var(--foreground-muted)] truncate max-w-[150px]">
                                  {String(err.value || '-')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                      <div>
                        {isRTL
                          ? `جميع السجلات (${validationResult.validRows} صف) تم التحقق منها بنجاح وجاهزة للاستيراد النهائي.`
                          : `All ${validationResult.validRows} row(s) passed validation and are ready to be imported into the database.`}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {(!importResult || !importResult.success) && (
          <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-muted)]/40 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isValidating || isImporting}
              className="px-4 py-2 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-muted)] text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleValidate}
                disabled={!file || isValidating || isImporting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-all disabled:opacity-50"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isRTL ? 'جارٍ الفحص...' : 'Validating...'}</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>{isRTL ? 'فحص ومعاينة' : 'Validate (Dry Run)'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                id="btn-confirm-import"
                onClick={handleExecuteImport}
                disabled={
                  !file ||
                  isValidating ||
                  isImporting ||
                  !validationResult ||
                  validationResult.invalidRows > 0
                }
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-[var(--on-primary)] hover:bg-primary-hover text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isRTL ? 'جارٍ الاستيراد...' : 'Importing...'}</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>{isRTL ? 'تأكيد الاستيراد' : 'Confirm Import'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
