import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePdfBuffer } from '../src/lib/pdfValidator.js';
import { bulkDocumentService } from '../src/services/bulkDocumentService.js';

function createMockPdf({
  header = '%PDF-1.4\n',
  pages = 1,
  encrypted = false,
  activeScript = false,
  size = 100,
} = {}) {
  let content = header;
  if (encrypted) {
    content += '/Filter /Standard /V 2 /R 3 /Length 128 /P -1052 /Encrypt 5 0 R\n';
  }
  if (activeScript) {
    content += '/Names << /JavaScript 6 0 R >>\n/JavaScript << /S /JavaScript /JS (app.alert(1);) >>\n';
  }
  for (let i = 0; i < pages; i++) {
    content += `3 ${i} obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\n`;
  }
  content += '%%EOF\n';
  const buf = Buffer.from(content, 'latin1');
  if (buf.length < size) {
    return Buffer.concat([buf, Buffer.alloc(size - buf.length, 0x20)]);
  }
  return buf;
}

test('PDF Validator: accepts valid static scanned PDF', () => {
  const validPdf = createMockPdf({ pages: 2 });
  const check = validatePdfBuffer(validPdf);
  assert.equal(check.valid, true);
  assert.equal(check.pageCount, 2);
});

test('PDF Validator: rejects file without %PDF- magic bytes', () => {
  const fakePdf = Buffer.from('NOT A PDF FILE DATA 123456');
  const check = validatePdfBuffer(fakePdf);
  assert.equal(check.valid, false);
  assert.equal(check.code, 'INVALID_PDF_HEADER');
});

test('PDF Validator: rejects encrypted / password-protected PDF', () => {
  const encPdf = createMockPdf({ encrypted: true });
  const check = validatePdfBuffer(encPdf);
  assert.equal(check.valid, false);
  assert.equal(check.code, 'PASSWORD_PROTECTED_PDF');
});

test('PDF Validator: rejects active content (JavaScript / Executables)', () => {
  const activePdf = createMockPdf({ activeScript: true });
  const check = validatePdfBuffer(activePdf);
  assert.equal(check.valid, false);
  assert.equal(check.code, 'ACTIVE_CONTENT_BLOCKED');
});

test('PDF Validator: rejects PDF exceeding 50 pages', () => {
  const longPdf = createMockPdf({ pages: 55 });
  const check = validatePdfBuffer(longPdf);
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
  const csv = `file_name,employee_code,doc_type,doc_number,issue_date,expiry_date
scan1.pdf,EMP-001,EMIRATES_ID,784-1990-1234567-1,2024-01-01,2028-01-01
scan2.pdf,EMP-002,BANK_DETAILS,AE070331234567890123456,2026-01-01,
`;
  const map = bulkDocumentService.parseManifestCsv(csv);
  assert.equal(map.size, 2);

  const entry1 = map.get('scan1.pdf');
  assert.equal(entry1.employeeCode, 'EMP-001');
  assert.equal(entry1.docType, 'EMIRATES_ID');
  assert.equal(entry1.docNumber, '784-1990-1234567-1');

  const entry2 = map.get('scan2.pdf');
  assert.equal(entry2.employeeCode, 'EMP-002');
  assert.equal(entry2.docType, 'BANK_DETAILS');
  assert.equal(entry2.docNumber, 'AE070331234567890123456');
});
