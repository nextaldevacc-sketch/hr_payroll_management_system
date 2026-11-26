'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { IconWell } from '@/components/primitives/IconWell';
import { Button } from '@/components/primitives/form/Button';
import { Select } from '@/components/primitives/form/Select';
import { Modal } from '@/components/primitives/Modal';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { formatErrorMessage } from '@/utils/formatError';
import { createFileChunks } from '@/utils/chunkUtils';
import { getMyDocuments, uploadMyDocument, bulkUploadMyDocuments } from '@/services/meApi';
import { DOCUMENT_TYPES_LIST, getDocumentTypeConfig, getDocumentTypeLabel } from '@nextal/shared';

function getDocTypeLabel(type, lang) {
  return getDocumentTypeLabel(type, lang);
}

function getStatusLabel(status, lang) {
  if (lang !== 'ar') return status;
  switch (status) {
    case 'Valid': return 'سارية';
    case 'Expiring Soon': return 'تنتهي قريباً';
    case 'Expired': return 'منتهية الصلاحية';
    case 'Pending Verification': return 'قيد التدقيق والتحقق';
    case 'Missing Data': return 'بيانات ناقصة';
    default: return status;
  }
}

export default function MyDocumentsPage() {
  const searchParams = useSearchParams();
  const actionParam = searchParams?.get('action');
  const { language } = useLanguage();
  const { showSuccess, showError } = useToast();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(actionParam === 'upload');
  const [docType, setDocType] = useState('EMIRATES_ID');
  const [docNumber, setDocNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [multipleFiles, setMultipleFiles] = useState([]);
  const [uploadMode, setUploadMode] = useState('single'); // 'single' | 'bulk'
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (actionParam === 'upload') {
      setUploadModalOpen(true);
    }
  }, [actionParam]);

  const loadDocs = async () => {
    try {
      const list = await getMyDocuments();
      setDocs(list || []);
    } catch (err) {
      console.warn('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const maxBytes = 25 * 1024 * 1024; // 25MB
    if (file.size > maxBytes) {
      showError(language === 'ar' ? 'حجم الملف يتجاوز الحد الأقصى المسموح به (25 ميجابايت)' : 'File size exceeds maximum allowed limit of 25MB');
      e.target.value = '';
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (uploadMode === 'bulk') {
      if (multipleFiles.length === 0) {
        showError(language === 'ar' ? 'يرجى اختيار ملفات PDF للرفع' : 'Please select PDF files to upload');
        return;
      }
      setSubmitting(true);
      try {
        // Chunk files: max 5 files and max 20MB per request
        const chunks = createFileChunks(multipleFiles, 5, 20 * 1024 * 1024);
        let totalProcessed = 0;
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const formData = new FormData();
          for (const f of chunk) {
            formData.append('files', f);
          }
          const res = await bulkUploadMyDocuments(formData);
          const data = res?.data || res;
          totalProcessed += data.processed || chunk.length;
        }

        showSuccess(
          language === 'ar'
            ? `تم رفع ${totalProcessed} مستندات بنجاح للمراجعة`
            : `Successfully uploaded ${totalProcessed} documents for HR verification`
        );
        setUploadModalOpen(false);
        setMultipleFiles([]);
        loadDocs();
      } catch (err) {
        showError(formatErrorMessage(err, language));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!selectedFile) {
      showError(language === 'ar' ? 'يرجى اختيار ملف المستند للرفع' : 'Please select a document file to upload');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('doc_type', docType);
      formData.append('doc_number', docNumber);
      formData.append('expiry_date', expiryDate);

      await uploadMyDocument(formData);
      showSuccess(language === 'ar' ? 'تم رفع المستند بنجاح وهو الآن قيد مراجعة الموارد البشرية' : 'Document uploaded successfully and routed to HR for verification');
      setUploadModalOpen(false);
      setSelectedFile(null);
      setDocNumber('');
      setExpiryDate('');
      loadDocs();
    } catch (err) {
      showError(formatErrorMessage(err, language));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="my-documents-container" className="space-y-6 animate-fadeIn pb-12 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text">
            {language === 'ar' ? 'وثائقي الرسمية والإقامات' : 'My Official Documents'}
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            {language === 'ar'
              ? 'متابعة تواريخ انتهاء الهوية الإماراتية وجواز السفر وتأشيرة العمل، مع إمكانية رفع المستندات المجددة للاعتماد'
              : 'Track expiry dates of identity and residency records, and upload renewed copies for HR verification'}
          </p>
        </div>

        <Button
          id="btn-open-upload-modal"
          size="sm"
          variant="primary"
          icon={<Upload className="w-3.5 h-3.5" />}
          onClick={() => setUploadModalOpen(true)}
        >
          {language === 'ar' ? 'رفع مستند مجدد' : 'Upload Renewed Document'}
        </Button>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {docs.map((doc) => {
          const isExpired = doc.status === 'Expired';
          const isExpiring = doc.status === 'Expiring Soon';
          const isPending = doc.status === 'Pending Verification';

          return (
            <div
              key={doc.id}
              className="glass-panel p-5 rounded-2xl border border-border flex flex-col justify-between hover:border-primary/40 transition-colors space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider">{getDocTypeLabel(doc.doc_type, language)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isExpired ? 'bg-rose-500/10 text-rose-600' :
                    isExpiring ? 'bg-amber-500/10 text-amber-600' :
                    isPending ? 'bg-blue-500/10 text-blue-600' :
                    'bg-emerald-500/10 text-emerald-600'
                  }`}>
                    {getStatusLabel(doc.status, language)}
                  </span>
                </div>

                <div className="mt-3">
                  <span className="text-xs text-text-muted block">{language === 'ar' ? 'رقم المستند (مشفر جزئياً)' : 'Document Number (Masked)'}</span>
                  <span className="font-mono font-bold text-text text-sm block mt-0.5">
                    {doc.doc_number_masked || '—'}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-border/40 text-xs space-y-2">
                <div className="flex justify-between items-center text-text-muted">
                  <span>{language === 'ar' ? 'تاريخ الانتهاء:' : 'Expiry Date:'}</span>
                  <span className="font-bold text-text tabular-nums">
                    {String(doc.expiry_date).slice(0, 10)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-text-muted">
                  <span>{language === 'ar' ? 'الأيام المتبقية:' : 'Days Left:'}</span>
                  <span className={`font-bold tabular-nums ${doc.days_left <= 30 ? 'text-danger' : 'text-text'}`}>
                    {doc.days_left} {language === 'ar' ? 'يوم' : 'days'}
                  </span>
                </div>
                {doc.file_url && (
                  <div className="pt-1 flex justify-end">
                    <a
                      href={`/api/v1/me/documents/${doc.id}/download`}
                      download
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'تحميل المستند' : 'Download Document'}</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload Renewed Document Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title={language === 'ar' ? 'رفع وثائق الموظف' : 'Upload Employee Documents'}
        subtitle={language === 'ar' ? 'تقديم وثائق رسمية جديدة أو مجددة لمراجعة واعتماد الموارد البشرية' : 'Submit updated documents for HR Manager verification'}
        maxWidth="max-w-md"
      >
        <div className="flex rounded-lg border border-border p-1 bg-surface mb-4 text-xs">
          <button
            type="button"
            onClick={() => setUploadMode('single')}
            className={`flex-1 py-1.5 rounded-md font-semibold transition-colors ${uploadMode === 'single' ? 'bg-primary text-on-primary' : 'text-text-muted hover:text-text'}`}
          >
            {language === 'ar' ? 'مستند فردي' : 'Single Document'}
          </button>
          <button
            type="button"
            onClick={() => setUploadMode('bulk')}
            className={`flex-1 py-1.5 rounded-md font-semibold transition-colors ${uploadMode === 'bulk' ? 'bg-primary text-on-primary' : 'text-text-muted hover:text-text'}`}
          >
            {language === 'ar' ? 'رفع متعدد (PDF)' : 'Multiple PDFs'}
          </button>
        </div>

        <form id="my-doc-upload-form" onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
          {uploadMode === 'single' ? (
            <>
              <div>
                <Select
                  id="my-doc-type-select"
                  label={language === 'ar' ? 'نوع المستند' : 'Document Type'}
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  options={DOCUMENT_TYPES_LIST.map((dt) => ({
                    value: dt.type,
                    label: language === 'ar' ? dt.labelAr : dt.labelEn,
                  }))}
                />
              </div>

              <div>
                <label className="font-bold text-text block mb-1">
                  {language === 'ar' ? 'رقم المستند' : 'Document Number'}
                  {getDocumentTypeConfig(docType)?.requiresNumber === false && (
                    <span className="text-text-muted font-normal text-[10px] ml-1">
                      ({language === 'ar' ? 'اختياري' : 'Optional'})
                    </span>
                  )}
                </label>
                <input
                  id="my-doc-number-input"
                  type="text"
                  required={getDocumentTypeConfig(docType)?.requiresNumber !== false}
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="e.g. 784-1990-1234567-1"
                  className="topbar-field w-full px-3 py-2 rounded-lg border border-border"
                />
              </div>

              <div>
                <label className="font-bold text-text block mb-1">
                  {language === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}
                  {getDocumentTypeConfig(docType)?.requiresExpiry === false && (
                    <span className="text-text-muted font-normal text-[10px] ml-1">
                      ({language === 'ar' ? 'اختياري' : 'Optional'})
                    </span>
                  )}
                </label>
                <input
                  id="my-doc-expiry-input"
                  type="date"
                  required={getDocumentTypeConfig(docType)?.requiresExpiry !== false}
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="topbar-field w-full px-3 py-2 rounded-lg border border-border"
                />
              </div>

              <div className="border-2 border-dashed border-border rounded-xl p-4 text-center bg-black/[0.01] dark:bg-white/[0.01] relative hover:border-primary/50 transition-colors">
                <input
                  id="my-doc-file-input"
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-6 h-6 mx-auto text-primary mb-1.5" />
                {selectedFile ? (
                  <div>
                    <p className="font-semibold text-text text-xs">{selectedFile.name}</p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB — {language === 'ar' ? 'انقر للتغيير' : 'Click to change file'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-text text-xs">
                      {language === 'ar' ? 'انقر لاختيار ملف (PDF أو صورة)' : 'Click or drop PDF / image here'}
                    </p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {language === 'ar' ? 'الحد الأقصى 25 ميجابايت (PDF, PNG, JPG)' : 'Maximum 25MB (PDF, PNG, JPG)'}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 text-[11px] text-text-muted space-y-1">
                <p className="font-semibold text-text">{language === 'ar' ? 'تسمية الملفات للمطابقة التلقائية:' : 'Filename convention for auto-matching:'}</p>
                <p className="font-mono text-text">EMIRATES_ID.pdf, PASSPORT.pdf, BANK_DETAILS.pdf, RESIDENCE_VISA.pdf</p>
                <p>{language === 'ar' ? 'يمكنك رفع حتى ١٠ ملفات PDF ممسوحة ضوئياً دفعة واحدة.' : 'You can upload up to 10 scanned PDF documents in one batch.'}</p>
              </div>

              <div className="border-2 border-dashed border-border rounded-xl p-5 text-center bg-black/[0.01] dark:bg-white/[0.01] relative hover:border-primary/50 transition-colors">
                <input
                  id="my-doc-bulk-input"
                  type="file"
                  multiple
                  required
                  accept=".pdf"
                  onChange={(e) => setMultipleFiles(Array.from(e.target.files || []))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-6 h-6 mx-auto text-primary mb-1.5" />
                {multipleFiles.length > 0 ? (
                  <div>
                    <p className="font-semibold text-text text-xs">
                      {language === 'ar' ? `تم اختيار ${multipleFiles.length} ملفات جاهزة للرفع` : `${multipleFiles.length} PDF files selected`}
                    </p>
                    <p className="text-[10px] text-text-muted mt-1 max-w-[280px] mx-auto truncate">
                      {multipleFiles.map((f) => f.name).join(', ')}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-text text-xs">
                      {language === 'ar' ? 'انقر أو اسحب ملفات PDF هنا' : 'Click or drop multiple PDF files here'}
                    </p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {language === 'ar' ? 'الحد الأقصى ١٠ ملفات PDF (حتى ٢٥ ميجابايت لكل ملف)' : 'Up to 10 scanned PDFs (max 25MB each)'}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="pt-2 flex justify-end gap-2 border-t border-border/40">
            <Button type="button" variant="outline" size="sm" onClick={() => setUploadModalOpen(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button id="btn-submit-upload-doc" type="submit" variant="primary" size="sm" loading={submitting}>
              {language === 'ar' ? 'إرسال للاعتماد' : 'Upload for Verification'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
