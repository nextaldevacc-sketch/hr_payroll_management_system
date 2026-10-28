'use client';

import React, { useState, useRef } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Download,
  Calendar,
  Clock,
  Layers,
  FileText,
} from 'lucide-react';
import { GlassCard } from '../../primitives/GlassCard';
import { StatNumber } from '../../primitives/StatNumber';
import { importBiometric } from '../../../services/attendanceApi';

export default function BiometricImportFeature({ onImportSuccess }) {
  const { user, language } = useAuth();
  const isAr = language === 'ar';

  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [periodFrom, setPeriodFrom] = useState('2026-10-01');
  const [periodTo, setPeriodTo] = useState('2026-10-31');

  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
      setImportResult(null);
      setErrorMessage(null);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setImportResult(null);
      setErrorMessage(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setErrorMessage(null);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (periodFrom) formData.append('periodFrom', periodFrom);
      if (periodTo) formData.append('periodTo', periodTo);

      const result = await importBiometric(formData);
      setImportResult(result);
      if (onImportSuccess) onImportSuccess(result);
    } catch (err) {
      console.error('Import error:', err);
      setErrorMessage(err.message || (isAr ? 'فشل استيراد ملف البصمة' : 'Failed to import biometric file'));
    } finally {
      setUploading(false);
    }
  };

  const downloadErrorsCsv = () => {
    if (!importResult?.errors || importResult.errors.length === 0) return;
    const header = 'Row,Code,Error\n';
    const lines = importResult.errors.map((e) => `"${e.row || ''}","${e.code || ''}","${(e.error || '').replace(/"/g, '""')}"`).join('\n');
    const blob = new Blob([header + lines], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `biometric_import_errors_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" data-testid="biometric-import-container">
      {/* Upload Box */}
      <GlassCard className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-text">
                {isAr ? 'استيراد سجلات البصمة الحيوية' : 'Biometric Machine Punch Import'}
              </h3>
              <p className="text-xs text-text-muted">
                {isAr
                  ? 'يدعم ملفات CSV أو Excel من أجهزة ZKTeco، Suprema، Hikvision، وغيرها'
                  : 'Supports CSV and Excel punch logs with automatic SHA-256 deduplication and device mapping.'}
              </p>
            </div>

            {/* Target Period */}
            <div className="flex items-center gap-2 bg-surface/60 border border-border px-3 py-1.5 rounded-xl">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs text-text-muted">{isAr ? 'فترة الحضور:' : 'Attendance Period:'}</span>
              <input
                type="date"
                id="import-from-date"
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
                className="bg-transparent text-xs text-text font-mono border-none focus:outline-none"
              />
              <span className="text-xs text-text-muted">→</span>
              <input
                type="date"
                id="import-to-date"
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
                className="bg-transparent text-xs text-text font-mono border-none focus:outline-none"
              />
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-primary bg-primary/10 scale-[1.01]'
                : selectedFile
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : 'border-border/80 hover:border-border hover:bg-surface/30'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              id="biometric-file-input"
              data-testid="biometric-file-input"
              accept=".csv,.txt,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            {selectedFile ? (
              <div className="flex flex-col items-center gap-2">
                <FileSpreadsheet className="w-10 h-10 text-emerald-400" />
                <span className="text-sm font-bold text-text font-mono">{selectedFile.name}</span>
                <span className="text-xs text-text-muted">
                  {(selectedFile.size / 1024).toFixed(1)} KB • {isAr ? 'جاهز للاستيراد' : 'Ready for import'}
                </span>
                <span className="text-[11px] text-primary underline mt-1">
                  {isAr ? 'انقر لتغيير الملف' : 'Click to change file'}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <UploadCloud className="w-10 h-10 text-primary/70" />
                <span className="text-sm font-bold text-text">
                  {isAr ? 'اسحب ملف البصمات وأفلته هنا أو انقر للتصفح' : 'Drag and drop biometric punch file here, or click to browse'}
                </span>
                <span className="text-xs text-text-muted">
                  {isAr ? 'صيغ مدعومة: CSV، XLSX، TXT (الأعمدة: رمز الجهاز، وقت البصمة، الاتجاه)' : 'Formats: CSV, XLSX, TXT (Columns: device_code, punch_time, direction)'}
                </span>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-text-muted flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {isAr ? 'يتم حفظ البصمات بتوقيت آسيا/دبي (UTC+4) مع كشف الملفات المكررة تلقائياً' : 'Punches stored in UTC with Asia/Dubai day bounds and SHA-256 deduplication.'}
            </span>

            <button
              type="submit"
              id="start-import-btn"
              data-testid="start-import-btn"
              disabled={!selectedFile || uploading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-on-primary hover:opacity-90 transition-opacity shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>{isAr ? 'جاري استيراد ومعالجة البصمات...' : 'Processing biometric file...'}</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>{isAr ? 'بدء استيراد البصمات' : 'Start Biometric Import'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </GlassCard>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2.5">
          <XCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Import Results Summary */}
      {importResult && (
        <div className="space-y-4" data-testid="import-results-summary">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GlassCard className="p-4 text-center">
              <span className="text-xs font-semibold text-text-muted block mb-1">
                {isAr ? 'إجمالي السجلات' : 'Total Punch Rows'}
              </span>
              <span className="text-2xl font-mono font-bold text-text">
                {importResult.rows_total ?? 0}
              </span>
            </GlassCard>

            <GlassCard className="p-4 text-center border-emerald-500/30 bg-emerald-500/5">
              <span className="text-xs font-semibold text-emerald-400 block mb-1">
                {isAr ? 'تم استيرادها بنجاح' : 'Imported Successfully'}
              </span>
              <span className="text-2xl font-mono font-bold text-emerald-400">
                {importResult.rows_imported ?? 0}
              </span>
            </GlassCard>

            <GlassCard className="p-4 text-center border-amber-500/30 bg-amber-500/5">
              <span className="text-xs font-semibold text-amber-400 block mb-1">
                {isAr ? 'بصمات مكررة تم إسقاطها' : 'Duplicates Dropped'}
              </span>
              <span className="text-2xl font-mono font-bold text-amber-400">
                {importResult.rows_duplicate ?? 0}
              </span>
            </GlassCard>

            <GlassCard className="p-4 text-center border-rose-500/30 bg-rose-500/5">
              <span className="text-xs font-semibold text-rose-400 block mb-1">
                {isAr ? 'أجهزة غير معرّفة' : 'Unmapped Device Codes'}
              </span>
              <span className="text-2xl font-mono font-bold text-rose-400">
                {importResult.rows_unmapped ?? 0}
              </span>
            </GlassCard>
          </div>

          {/* Unmapped or Parsing Errors Table */}
          {importResult.errors && importResult.errors.length > 0 && (
            <GlassCard className="p-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    {isAr
                      ? `تم العثور على ${importResult.errors.length} استثناء أو خطأ في الملف`
                      : `Found ${importResult.errors.length} unmapped device or row exception(s)`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={downloadErrorsCsv}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-surface border border-border text-text hover:bg-surface-hover flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تنزيل تقرير الأخطاء (CSV)' : 'Download Errors (CSV)'}</span>
                </button>
              </div>

              <div className="overflow-x-auto max-h-60 mt-3">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-text-muted border-b border-border/40">
                      <th className="py-2 px-3">{isAr ? 'رقم السطر' : 'Row #'}</th>
                      <th className="py-2 px-3">{isAr ? 'رمز الجهاز / الموظف' : 'Device / Emp Code'}</th>
                      <th className="py-2 px-3">{isAr ? 'سبب الاستثناء' : 'Exception Error'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 font-mono">
                    {importResult.errors.map((err, idx) => (
                      <tr key={idx} className="hover:bg-surface/30">
                        <td className="py-2 px-3">{err.row || idx + 1}</td>
                        <td className="py-2 px-3 text-text-muted">{err.code || '-'}</td>
                        <td className="py-2 px-3 text-rose-400 font-sans">{err.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}
        </div>
      )}
    </div>
  );
}
