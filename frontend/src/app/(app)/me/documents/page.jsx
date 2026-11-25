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
import { getMyDocuments, uploadMyDocument } from '@/services/meApi';

function getDocTypeLabel(type, lang) {
  if (lang !== 'ar') {
    switch (type) {
      case 'EMIRATES_ID': return 'Emirates ID';
      case 'PASSPORT': return 'Passport';
      case 'RESIDENCE_VISA': return 'Residence Visa';
      case 'LABOUR_CARD': return 'Labour Card';
      case 'INSURANCE': return 'Health Insurance';
      default: return type?.replace(/_/g, ' ');
    }
  }
  switch (type) {
    case 'EMIRATES_ID': return 'الهوية الإماراتية';
    case 'PASSPORT': return 'جواز السفر';
    case 'RESIDENCE_VISA': return 'تأشيرة الإقامة';
    case 'LABOUR_CARD': return 'بطاقة العمل';
    case 'INSURANCE': return 'التأمين الصحي';
    default: return type;
  }
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
        title={language === 'ar' ? 'رفع مستند مجدد' : 'Upload Renewed Document'}
        subtitle={language === 'ar' ? 'تقديم نسخة المستند المجدد لمراجعة واعتماد الموارد البشرية' : 'Submit updated document for HR Manager verification'}
        maxWidth="max-w-md"
      >
        <form id="my-doc-upload-form" onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
          <div>
            <Select
              id="my-doc-type-select"
              label={language === 'ar' ? 'نوع المستند' : 'Document Type'}
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              options={[
                { value: 'EMIRATES_ID', label: language === 'ar' ? 'الهوية الإماراتية' : 'Emirates ID' },
                { value: 'PASSPORT', label: language === 'ar' ? 'جواز السفر' : 'Passport' },
                { value: 'LABOUR_CARD', label: language === 'ar' ? 'بطاقة العمل / وزارة الموارد البشرية' : 'Labour Card / MOHRE' },
                { value: 'RESIDENCE_VISA', label: language === 'ar' ? 'تأشيرة الإقامة' : 'Residence Visa' },
              ]}
            />
          </div>

          <div>
            <label className="font-bold text-text block mb-1">{language === 'ar' ? 'رقم المستند' : 'Document Number'}</label>
            <input
              id="my-doc-number-input"
              type="text"
              required
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              placeholder="e.g. 784-1990-1234567-1"
              className="topbar-field w-full px-3 py-2 rounded-lg border border-border"
            />
          </div>

          <div>
            <label className="font-bold text-text block mb-1">{language === 'ar' ? 'تاريخ الانتهاء الجديد' : 'New Expiry Date'}</label>
            <input
              id="my-doc-expiry-input"
              type="date"
              required
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
