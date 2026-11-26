import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, PDFName } from 'pdf-lib';
import { validatePdfBuffer } from '../src/lib/pdfValidator.js';
import { bulkDocumentService } from '../src/services/bulkDocumentService.js';

async function createTestPdf({ pages = 1, active = false, overPages = false } = {}) {
  const doc = await PDFDocument.create();
  const total = overPages ? 55 : pages;
  for (let i = 0; i < total; i++) {
    doc.addPage([100, 100]);
  }
  if (active) {
    doc.catalog.set(PDFName.of('OpenAction'), doc.context.obj({ S: 'JavaScript', JS: 'alert(1)' }));
  }
  return Buffer.from(await doc.save());
}

test('PDF Validator: accepts valid static scanned PDF', async () => {
  const validPdf = await createTestPdf({ pages: 2 });
  const check = await validatePdfBuffer(validPdf);
  assert.equal(check.valid, true);
  assert.equal(check.pageCount, 2);
});

test('PDF Validator: rejects file without %PDF- magic bytes', async () => {
  const fakePdf = Buffer.from('NOT A PDF FILE DATA 123456');
  const check = await validatePdfBuffer(fakePdf);
  assert.equal(check.valid, false);
  assert.equal(check.code, 'INVALID_PDF_HEADER');
});

test('PDF Validator: rejects encrypted / password-protected PDF', async () => {
  const encPdf = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] >>\nendobj\n' +
    'trailer\n<< /Root 1 0 R /Encrypt 4 0 R >>\n%%EOF'
  );
  const check = await validatePdfBuffer(encPdf);
  assert.equal(check.valid, false);
  assert.equal(check.code, 'PASSWORD_PROTECTED_PDF');
});

test('PDF Validator: rejects active content (JavaScript / Executables)', async () => {
  const activePdf = await createTestPdf({ active: true });
  const check = await validatePdfBuffer(activePdf);
  assert.equal(check.valid, false);
  assert.equal(check.code, 'ACTIVE_CONTENT_BLOCKED');
});

test('PDF Validator: rejects PDF exceeding 50 pages', async () => {
  const longPdf = await createTestPdf({ overPages: true });
  const check = await validatePdfBuffer(longPdf);
  assert.equal(check.valid, false);
  assert.equal(check.code, 'PAGE_COUNT_EXCEEDED');
  assert.equal(check.pageCount, 55);
});

test('BulkDocumentService: parseFilename convention', () => {
  const p1 = bulkDocumentService.parseFilename('EMP-001_EMIRATES_ID.pdf');
  assert.equal(p1.matched, true);
  assert.equal(p1.employeeCode, 'EMP-001');
  assert.equal(p1.normalizedDocType, 'EMIRATES_ID');

  const p2 = bulkDocumentService.parseFilename('EMP-042_PASSPORT_front.pdf');
  assert.equal(p2.matched, true);
  assert.equal(p2.employeeCode, 'EMP-042');
  assert.equal(p2.normalizedDocType, 'PASSPORT');

  const p3 = bulkDocumentService.parseFilename('EMP100_RESIDENCE_VISA_renewed.pdf');
  assert.equal(p3.matched, true);
  assert.equal(p3.employeeCode, 'EMP100');
  assert.equal(p3.normalizedDocType, 'RESIDENCE_VISA');

  const p4 = bulkDocumentService.parseFilename('EMP005_BANK_DETAILS.pdf');
  assert.equal(p4.matched, true);
  assert.equal(p4.employeeCode, 'EMP005');
  assert.equal(p4.normalizedDocType, 'BANK_DETAILS');

  const pInvalid = bulkDocumentService.parseFilename('random_document.pdf');
  assert.equal(pInvalid.matched, false);
});

test('BulkDocumentService: parseManifestCsv', () => {
  const csv = `file_name,employee_code,doc_type,doc_number,expiry_date
doc1.pdf,EMP-001,EMIRATES_ID,784-1990-1234567-1,2028-12-31
doc2.pdf,EMP-042,PASSPORT,N1234567,2030-05-15
`;
  const map = bulkDocumentService.parseManifestCsv(csv);
  assert.equal(map.size, 2);
  const entry1 = map.get('doc1.pdf');
  assert.equal(entry1.employeeCode, 'EMP-001');
  assert.equal(entry1.docType, 'EMIRATES_ID');
  assert.equal(entry1.docNumber, '784-1990-1234567-1');
  assert.equal(entry1.expiryDate, '2028-12-31');
});

test('BulkDocumentService: chunked upload, batch preview, and zero re-upload process', async () => {
  const mockEmployees = [
    {
      id: 'emp-uuid-1',
      company_id: 'comp-1',
      employee_code: 'EMP-001',
      name: 'Ahmed Al Mansoori',
      branch_id: 'branch-1',
      company_visa_id: 'visa-1',
      status: 'Active',
    },
    {
      id: 'emp-uuid-2',
      company_id: 'comp-1',
      employee_code: 'EMP-002',
      name: 'Fatima Al Nuaimi',
      branch_id: 'branch-1',
      company_visa_id: 'visa-1',
      status: 'Active',
    },
  ];

  const createdDocs = [];
  const mockDb = {
    employees: {
      findMany: async () => mockEmployees,
    },
    employee_documents: {
      findFirst: async () => null,
      create: async ({ data }) => {
        createdDocs.push(data);
        return { id: `doc-${createdDocs.length}`, ...data };
      },
      update: async ({ data }) => data,
    },
    settings_versions: {
      count: async () => 0,
      create: async () => ({}),
    },
  };

  const { BulkDocumentService } = await import('../src/services/bulkDocumentService.js');
  const service = new BulkDocumentService(mockDb);

  const pdf1 = await createTestPdf({ pages: 1 });
  const pdf2 = await createTestPdf({ pages: 2 });
  const invalidPdf = Buffer.from('NOT A REAL PDF');

  // Chunk 1: Upload 2 valid files
  const chunk1 = await service.uploadChunk({
    companyId: 'comp-1',
    viewer: { id: 'admin-1', role: 'COMPANY_ADMIN' },
    files: [
      { originalname: 'EMP-001_EMIRATES_ID.pdf', buffer: pdf1, size: pdf1.length },
      { originalname: 'EMP-002_PASSPORT.pdf', buffer: pdf2, size: pdf2.length },
    ],
    chunkIndex: 0,
    totalChunks: 2,
    totalFiles: 3,
  });

  assert.ok(chunk1.batch_id);
  assert.equal(chunk1.total_saved, 2);

  // Chunk 2: Upload 1 invalid file into same batch_id
  const chunk2 = await service.uploadChunk({
    companyId: 'comp-1',
    viewer: { id: 'admin-1', role: 'COMPANY_ADMIN' },
    batchId: chunk1.batch_id,
    files: [
      { originalname: 'EMP-001_BANK_DETAILS.pdf', buffer: invalidPdf, size: invalidPdf.length },
    ],
    chunkIndex: 1,
    totalChunks: 2,
    totalFiles: 3,
  });

  assert.equal(chunk2.batch_id, chunk1.batch_id);
  assert.equal(chunk2.total_saved, 3);

  // Preview batch from server-side batch state (ZERO file re-upload)
  const preview = await service.getBatchPreview({
    companyId: 'comp-1',
    viewer: { id: 'admin-1', role: 'COMPANY_ADMIN' },
    batchId: chunk1.batch_id,
  });

  assert.equal(preview.batch_id, chunk1.batch_id);
  assert.equal(preview.summary.total_files, 3);
  assert.equal(preview.summary.matched, 2);
  assert.equal(preview.summary.invalid, 1);
  assert.equal(preview.summary.can_proceed, true);

  // Process batch by batch_id alone (ZERO file re-upload)
  const processRes = await service.processBatchById({
    companyId: 'comp-1',
    viewer: { id: 'admin-1', role: 'COMPANY_ADMIN' },
    batchId: chunk1.batch_id,
  });

  assert.equal(processRes.success, true);
  assert.equal(processRes.total_ready, 2);
  assert.equal(processRes.processed, 2);
  assert.equal(createdDocs.length, 2);
  assert.equal(createdDocs[0].employee_id, 'emp-uuid-1');
  assert.equal(createdDocs[0].doc_type, 'EMIRATES_ID');
  assert.equal(createdDocs[1].employee_id, 'emp-uuid-2');
  assert.equal(createdDocs[1].doc_type, 'PASSPORT');
});
