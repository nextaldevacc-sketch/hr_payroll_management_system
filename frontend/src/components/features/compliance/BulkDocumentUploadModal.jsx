'use client';

import React, { useState } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  RefreshCw,
  X,
  FileCheck,
  Shield,
  RotateCcw,
} from 'lucide-react';
import { Modal } from '../../primitives/Modal';
import { Button } from '../../primitives/form/Button';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../../../context/ToastContext';
import { request } from '../../../services/apiClient';
import { createFileChunks } from '../../../utils/chunkUtils';

export function BulkDocumentUploadModal({ isOpen, onClose, onSuccess }) {
  const { language } = useLanguage();
  const { showSuccess, showError } = useToast();
  const isAr = language === 'ar';

  const [files, setFiles] = useState([]);
  const [manifestFile, setManifestFile] = useState(null);
  const [step, setStep] = useState('select'); // 'select' | 'uploading' | 'preview' | 'processing' | 'done'
  const [loading, setLoading] = useState(false);
  const [batchId, setBatchId] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [processResult, setProcessResult] = useState(null);

  // Chunking and progress states
  const [uploadProgress, setUploadProgress] = useState({
    currentChunk: 0,
    totalChunks: 0,
    percent: 0,
    uploadedCount: 0,
    totalCount: 0,
  });
  const [failedChunkIndex, setFailedChunkIndex] = useState(null);

  const resetState = () => {
    setFiles([]);
    setManifestFile(null);
    setStep('select');
    setLoading(false);
    setBatchId(null);
    setPreviewData(null);
    setProcessResult(null);
    setUploadProgress({
      currentChunk: 0,
      totalChunks: 0,
      percent: 0,
      uploadedCount: 0,
      totalCount: 0,
    });
    setFailedChunkIndex(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 100) {
      showError(isAr ? 'الحد الأقصى هو ١٠٠ ملف في الدفعة الواحدة' : 'Maximum 100 files allowed per batch');
      return;
    }
    setFiles(selected);
  };

  const handleManifestChange = (e) => {
    const file = e.target.files?.[0];
    setManifestFile(file || null);
  };

  /**
   * Uploads chunks sequentially with retry/resume capability
   */
  const executeChunkedUpload = async (startFromChunk = 0, existingBatchId = null) => {
    const chunks = createFileChunks(files, 5, 20 * 1024 * 1024);
    if (chunks.length === 0) {
      showError(isAr ? 'يرجى اختيار ملفات PDF للرفع' : 'Please select PDF files to upload');
      return;
    }

    setStep('uploading');
    setLoading(true);
    setFailedChunkIndex(null);

    let currentBatchId = existingBatchId || batchId;
    let accumulatedCount = 0;
    for (let c = 0; c < startFromChunk; c++) {
      accumulatedCount += chunks[c].length;
    }

    try {
      for (let i = startFromChunk; i < chunks.length; i++) {
        const chunkFiles = chunks[i];
        setUploadProgress({
          currentChunk: i + 1,
          totalChunks: chunks.length,
          percent: Math.round((i / chunks.length) * 100),
          uploadedCount: accumulatedCount,
          totalCount: files.length,
        });

        // Retry loop for transient failures
        let attempts = 0;
        let chunkSuccess = false;
        let lastError = null;

        while (attempts < 3 && !chunkSuccess) {
          attempts++;
          try {
            const formData = new FormData();
            for (const f of chunkFiles) {
              formData.append('files', f);
            }
            if (currentBatchId) {
              formData.append('batch_id', currentBatchId);
            }
            if (manifestFile && i === 0) {
              formData.append('manifest', manifestFile);
            }
            formData.append('chunk_index', String(i));
            formData.append('total_chunks', String(chunks.length));
            formData.append('total_files', String(files.length));

            const res = await request('/employees/documents/bulk-upload/chunk', {
              method: 'POST',
              body: formData,
            });

            const data = res?.data || res;
            if (data?.batch_id) {
              currentBatchId = data.batch_id;
              setBatchId(currentBatchId);
            }
            chunkSuccess = true;
          } catch (err) {
            lastError = err;
            if (attempts < 3) {
              // Wait 1 second before retry
              await new Promise((r) => setTimeout(r, 1000));
            }
          }
        }

        if (!chunkSuccess) {
          setFailedChunkIndex(i);
          throw lastError || new Error(`Upload failed on chunk ${i + 1}`);
        }

        accumulatedCount += chunkFiles.length;
      }

      // All chunks successfully uploaded! Fetch preview from server batch state
      setUploadProgress({
        currentChunk: chunks.length,
        totalChunks: chunks.length,
        percent: 100,
        uploadedCount: files.length,
        totalCount: files.length,
      });

      const previewRes = await request(`/employees/documents/bulk-upload/batch/${currentBatchId}`, {
        method: 'GET',
      });

      const previewData = previewRes?.data || previewRes;
      setPreviewData(previewData);
      setStep('preview');
    } catch (err) {
      showError(
        err.message ||
          (isAr
            ? `فشل رفع الحزمة في المقطع ${(failedChunkIndex || 0) + 1}`
            : `Upload chunk ${(failedChunkIndex || 0) + 1} failed`)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePreview = async () => {
    await executeChunkedUpload(0, null);
  };

  const handleResumeChunk = async () => {
    if (failedChunkIndex !== null) {
      await executeChunkedUpload(failedChunkIndex, batchId);
    }
  };

  /**
   * Confirms and processes the batch by batch_id without re-uploading files
   */
  const handleConfirmProcess = async () => {
    if (!batchId) {
      showError(isAr ? 'معرف الدفعة غير صالح' : 'Invalid batch identifier');
      return;
    }

    setLoading(true);
    setStep('processing');
    try {
      const res = await request('/employees/documents/bulk-upload/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ batch_id: batchId }),
      });

      const data = res?.data || res;
      setProcessResult(data);
      setStep('done');
      showSuccess(
        isAr
          ? `تمت معالجة ${data.processed} مستند بنجاح وتحويلها لانتظار التحقق`
          : `Successfully processed ${data.processed} documents for verification`
      );
      if (onSuccess) onSuccess();
    } catch (err) {
      showError(err.message || (isAr ? 'فشلت معالجة الرفع المجمع' : 'Bulk processing failed'));
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = () => {
    if (!processResult?.reportCsv) return;
    const blob = new Blob([processResult.reportCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk-upload-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isAr ? 'الرفع المجمع للوثائق والمستندات الرسمية' : 'Bulk Upload Statutory Documents'}
      subtitle={
        isAr
          ? 'رفع ملفات PDF الممسوحة ضوئياً بحزم مجزأة وتوزيعها تلقائياً بحسب كود الموظف ونوع الوثيقة'
          : 'Chunked upload of scanned PDFs automatically matched by employee code and document type'
      }
      maxWidth="max-w-4xl"
    >
      <div className="space-y-5 text-xs">
        {/* Step 1: Select Files */}
        {step === 'select' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-text">
                <FileCheck className="w-4 h-4 text-primary" />
                <span>{isAr ? 'قواعد تسمية الملفات للتطابق التلقائي:' : 'Filename convention for automatic matching:'}</span>
              </div>
              <p className="text-text-muted leading-relaxed font-mono">
                [EMPLOYEE_CODE]_[DOC_TYPE].pdf &nbsp;&rarr;&nbsp; e.g. <span className="text-text font-bold">EMP-001_EMIRATES_ID.pdf</span>, <span className="text-text font-bold">EMP-042_PASSPORT.pdf</span>, <span className="text-text font-bold">EMP-100_BANK_DETAILS.pdf</span>
              </p>
              <p className="text-[11px] text-text-muted">
                {isAr
                  ? 'أو يمكنك إرفاق ملف جدول مطابقة اختياري (CSV) يتضمن أسماء الملفات وتواريخ الانتهاء والأرقام.'
                  : 'Or attach an optional CSV manifest matching file names with custom expiry dates and doc numbers.'}
              </p>
            </div>

            {/* Dropzone */}
            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors relative bg-surface/30">
              <input
                id="bulk-pdf-input"
                type="file"
                multiple
                accept=".pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-8 h-8 mx-auto text-primary mb-2" />
              <p className="font-semibold text-text text-sm">
                {isAr ? 'اسحب ملفات PDF أو انقر لاختيارها' : 'Drag & drop scanned PDF files or click to browse'}
              </p>
              <p className="text-text-muted mt-1 text-[11px]">
                {files.length > 0
                  ? isAr ? `تم تحديد ${files.length} ملف جاهز للمعاينة والتجزئة الآلية` : `${files.length} PDF files selected (auto-chunked, max 5 files / 20MB per request)`
                  : isAr ? 'الحد الأقصى ١٠٠ ملف (حجم كل ملف حتى ٢٥ ميجابايت، تشفير فوري AES-256-GCM)' : 'Up to 100 PDFs (max 25MB & 50 pages per file, AES-256 encrypted)'}
              </p>
            </div>

            {/* Optional Manifest CSV */}
            <div className="p-3 rounded-lg border border-border bg-surface/50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-text-muted" />
                <span className="font-medium text-text">
                  {manifestFile ? manifestFile.name : (isAr ? 'ملف المطابقة الاختياري (manifest.csv):' : 'Optional Manifest CSV:')}
                </span>
              </div>
              <label className="px-2.5 py-1 rounded-md border border-border hover:bg-surface text-text cursor-pointer font-semibold text-[11px]">
                {manifestFile ? (isAr ? 'تغيير' : 'Change') : (isAr ? 'اختيار ملف' : 'Choose CSV')}
                <input type="file" accept=".csv" onChange={handleManifestChange} className="hidden" />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="secondary" onClick={handleClose}>
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                id="btn-preview-bulk-upload"
                variant="primary"
                disabled={files.length === 0 || loading}
                onClick={handleGeneratePreview}
                icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
              >
                {loading ? (isAr ? 'جاري الفحص...' : 'Uploading Chunks...') : (isAr ? 'بدء الرفع المجزأ والمعاينة' : 'Upload Chunks & Preview')}
              </Button>
            </div>
          </div>
        )}

        {/* Step 1.5: Uploading Chunks Progress */}
        {step === 'uploading' && (
          <div className="space-y-5 py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Upload className={`w-6 h-6 ${loading ? 'animate-bounce' : ''}`} />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-sm font-bold text-text">
                {isAr
                  ? `جاري رفع الحزمة المجزأة (${uploadProgress.currentChunk} من ${uploadProgress.totalChunks})`
                  : `Uploading Batch in Chunks (${uploadProgress.currentChunk} of ${uploadProgress.totalChunks})`}
              </h3>
              <p className="text-text-muted text-[11px]">
                {isAr
                  ? `تم نقل وتشفير ${uploadProgress.uploadedCount} من ${uploadProgress.totalCount} ملف بأمان على الخادم.`
                  : `Validated & encrypted ${uploadProgress.uploadedCount} of ${uploadProgress.totalCount} files on server.`}
              </p>

              {/* Progress bar */}
              <div className="w-full bg-surface-raised rounded-full h-2.5 overflow-hidden border border-border mt-3">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress.percent}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-text-muted block text-end">
                {uploadProgress.percent}%
              </span>
            </div>

            {failedChunkIndex !== null && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl max-w-md mx-auto flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-rose-500 text-[11px]">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{isAr ? `توقف الرفع عند المقطع ${failedChunkIndex + 1}` : `Upload paused at chunk ${failedChunkIndex + 1}`}</span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleResumeChunk}
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                  {isAr ? 'إعادة المحاولة' : 'Resume / Retry'}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Preview Results */}
        {step === 'preview' && previewData && (
          <div className="space-y-4">
            {/* Bento Summary */}
            <div className="grid grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl border border-border bg-surface">
                <span className="text-text-muted block text-[11px]">{isAr ? 'إجمالي الملفات' : 'Total Files'}</span>
                <span className="text-lg font-bold text-text mt-0.5 block">{previewData.summary.total_files}</span>
              </div>
              <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <span className="text-emerald-600 dark:text-emerald-400 block text-[11px] font-semibold">{isAr ? 'جاهزة للمطابقة' : 'Matched / Ready'}</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">{previewData.summary.matched}</span>
              </div>
              <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <span className="text-amber-600 dark:text-amber-400 block text-[11px] font-semibold">{isAr ? 'غير متطابقة' : 'Unmatched'}</span>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">{previewData.summary.unmatched}</span>
              </div>
              <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5">
                <span className="text-rose-600 dark:text-rose-400 block text-[11px] font-semibold">{isAr ? 'ملفات غير صالحة' : 'Invalid / Blocked'}</span>
                <span className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5 block">{previewData.summary.invalid}</span>
              </div>
            </div>

            {/* Preview Table */}
            <div className="border border-border rounded-xl max-h-72 overflow-y-auto">
              <table className="w-full text-start text-xs border-collapse">
                <thead className="bg-surface sticky top-0 border-b border-border text-text-muted font-semibold">
                  <tr>
                    <th className="p-2.5 text-start">{isAr ? 'الملف' : 'File'}</th>
                    <th className="p-2.5 text-start">{isAr ? 'الموظف' : 'Employee'}</th>
                    <th className="p-2.5 text-start">{isAr ? 'نوع الوثيقة' : 'Doc Type'}</th>
                    <th className="p-2.5 text-start">{isAr ? 'الحالة والملاحظات' : 'Status / Notes'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {previewData.items.map((item, idx) => (
                    <tr key={idx} className={item.valid ? 'hover:bg-surface/50' : 'bg-rose-500/5'}>
                      <td className="p-2.5 font-mono text-[11px] max-w-[180px] truncate" title={item.file_name}>
                        {item.file_name}
                      </td>
                      <td className="p-2.5">
                        {item.employee_code ? (
                          <div>
                            <span className="font-semibold text-text">{item.employee_name || item.employee_code}</span>
                            <span className="block text-[10px] text-text-muted font-mono">{item.employee_code}</span>
                          </div>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="p-2.5 font-semibold text-text">
                        {item.doc_type || '—'}
                      </td>
                      <td className="p-2.5">
                        {item.valid ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {isAr ? 'جاهز للاعتماد' : 'Ready to Process'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-500 text-[11px]" title={item.reason}>
                            <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate max-w-[200px]">{item.reason || item.status}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-border">
              <Button variant="secondary" onClick={() => setStep('select')}>
                {isAr ? 'رجوع لتعديل الملفات' : 'Back to Selection'}
              </Button>
              <Button
                id="btn-confirm-bulk-process"
                variant="primary"
                disabled={previewData.summary.matched === 0 || loading}
                onClick={handleConfirmProcess}
                icon={<Shield className="w-3.5 h-3.5" />}
              >
                {loading
                  ? (isAr ? 'جاري الاعتماد...' : 'Processing...')
                  : (isAr
                      ? `تأكيد واعتماد ${previewData.summary.matched} مستند مشفر (دون إعادة رفع)`
                      : `Confirm & Process ${previewData.summary.matched} Documents (No Re-upload)`)}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Processing Step */}
        {step === 'processing' && (
          <div className="space-y-4 text-center py-8">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Shield className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text">
                {isAr ? 'جاري اعتماد المستندات المشفرة...' : 'Processing Encrypted Documents...'}
              </h3>
              <p className="text-text-muted mt-1 text-xs">
                {isAr
                  ? 'يتم ربط الملفات المحفوظة مشفرة بسجلات الموظفين وأرشفة الإصدارات السابقة.'
                  : 'Assigning pre-encrypted files to employee profiles and generating audit trails.'}
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 'done' && processResult && (
          <div className="space-y-4 text-center py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text">
                {isAr ? 'اكتملت معالجة الرفع المجمع بنجاح' : 'Bulk Document Upload Completed'}
              </h3>
              <p className="text-text-muted mt-1 text-xs">
                {isAr
                  ? `تم تخزين ${processResult.processed} مستند مشفراً برمز AES-256-GCM وتحويل حالتها إلى "قيد التدقيق والتحقق".`
                  : `Encrypted and stored ${processResult.processed} documents at rest under "Pending Verification" status.`}
              </p>
            </div>

            <div className="flex justify-center gap-3 pt-3">
              <Button
                id="btn-download-upload-report"
                variant="secondary"
                icon={<Download className="w-3.5 h-3.5" />}
                onClick={handleDownloadReport}
              >
                {isAr ? 'تحميل تقرير المعالجة (CSV)' : 'Download Result Report (CSV)'}
              </Button>
              <Button variant="primary" onClick={handleClose}>
                {isAr ? 'إغلاق ومتابعة الامتثال' : 'Done & Review Compliance'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default BulkDocumentUploadModal;
