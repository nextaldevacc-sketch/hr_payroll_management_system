'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { IconWell } from '@/components/primitives/IconWell';
import { Button } from '@/components/primitives/form/Button';
import { Modal } from '@/components/primitives/Modal';
import { useLanguage } from '@/context/LanguageContext';
import { getMyDocuments, uploadMyDocument } from '@/services/meApi';

export default function MyDocumentsPage() {
  const { language } = useLanguage();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [docType, setDocType] = useState('EMIRATES_ID');
  const [docNumber, setDocNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await uploadMyDocument({
        doc_type: docType,
        doc_number: docNumber,
        expiry_date: expiryDate,
      });
      alert(language === 'ar' ? 'تم رفع المستند بنجاح وهو الآن قيد مراجعة الموارد البشرية' : 'Document uploaded successfully and routed to HR for verification');
      setUploadModalOpen(false);
      loadDocs();
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="my-documents-container" className="space-y-6 animate-fadeIn pb-12 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text gold-page-title">
            {language === 'ar' ? 'وثائقي الرسمية والإقامات' : 'My Official Documents'}
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            {language === 'ar'
              ? 'متابعة تواريخ انتهاء الهوية الإماراتية وجواز السفر وتأشيرة العمل، مع إمكانية رفع المستندات المجددة للاعتماد'
              : 'Track expiry dates of identity and residency records, and upload renewed copies for HR verification'}
          </p>
        </div>

        <Button
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
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider">{doc.doc_type}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isExpired ? 'bg-rose-500/10 text-rose-600' :
                    isExpiring ? 'bg-amber-500/10 text-amber-600' :
                    isPending ? 'bg-blue-500/10 text-blue-600' :
                    'bg-emerald-500/10 text-emerald-600'
                  }`}>
                    {doc.status}
                  </span>
                </div>

                <div className="mt-3">
                  <span className="text-xs text-text-muted block">Document Number (Masked)</span>
                  <span className="font-mono font-bold text-text text-sm block mt-0.5">
                    {doc.doc_number_masked || '—'}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-border/40 text-xs space-y-1">
                <div className="flex justify-between items-center text-text-muted">
                  <span>Expiry Date:</span>
                  <span className="font-bold text-text tabular-nums">
                    {String(doc.expiry_date).slice(0, 10)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-text-muted">
                  <span>Days Left:</span>
                  <span className={`font-bold tabular-nums ${doc.days_left <= 30 ? 'text-danger' : 'text-text'}`}>
                    {doc.days_left} days
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload Renewed Document Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Renewed Document"
        subtitle="Submit updated document for HR Manager verification"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-text block mb-1">Document Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="topbar-field w-full px-3 py-2 rounded-lg border border-border"
            >
              <option value="EMIRATES_ID">Emirates ID</option>
              <option value="PASSPORT">Passport</option>
              <option value="LABOUR_CARD">Labour Card / MOHRE</option>
              <option value="RESIDENCE_VISA">Residence Visa</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-text block mb-1">Document Number</label>
            <input
              type="text"
              required
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              placeholder="e.g. 784-1990-1234567-1"
              className="topbar-field w-full px-3 py-2 rounded-lg border border-border"
            />
          </div>

          <div>
            <label className="font-bold text-text block mb-1">New Expiry Date</label>
            <input
              type="date"
              required
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="topbar-field w-full px-3 py-2 rounded-lg border border-border"
            />
          </div>

          <div className="border-2 border-dashed border-border rounded-xl p-4 text-center bg-black/[0.01] dark:bg-white/[0.01]">
            <Upload className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-[11px] text-text-muted">PDF or scanned image copy will be attached</p>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-border/40">
            <Button type="button" variant="outline" size="sm" onClick={() => setUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submitting}>
              Upload for Verification
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
