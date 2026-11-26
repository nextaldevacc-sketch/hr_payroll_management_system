import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFString } from 'pdf-lib';
import { validatePdfBuffer, MAX_PDF_SIZE_BYTES, MAX_PDF_PAGES } from '../src/lib/pdfValidator.js';

/**
 * Helper to generate a realistic scanned PDF containing image streams with random binary data
 */
async function generateScannedImagePdf({ pages = 1, totalSizeMb = 1, injectPatterns = [] } = {}) {
  const doc = await PDFDocument.create();
  const perPageBytes = Math.floor((totalSizeMb * 1024 * 1024) / pages);

  for (let p = 0; p < pages; p++) {
    const rawData = crypto.randomBytes(Math.max(1024, perPageBytes));

    // Optionally inject byte sequences that would fool raw regex validators
    for (const pat of injectPatterns) {
      const offset = Math.floor(Math.random() * (rawData.length - pat.length - 100));
      rawData.write(pat, offset, 'latin1');
    }

    const imgStream = doc.context.stream(rawData, {
      Type: 'XObject',
      Subtype: 'Image',
      Width: 600,
      Height: 800,
      BitsPerComponent: 8,
      ColorSpace: 'DeviceRGB',
    });
    const imgRef = doc.context.register(imgStream);

    const page = doc.addPage([595, 842]); // A4
    page.node.set(
      PDFName.of('Resources'),
      doc.context.obj({
        XObject: { [`ScanImg${p}`]: imgRef },
      })
    );
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

describe('Real Scanned-PDF AST Validator Suite', () => {
  it('accepts real scanned-style PDFs (image-only, multi-page, 5MB and 15MB) with byte noise', async () => {
    // Inject patterns that old regex validator rejected by chance
    const fakeHits = ['/JS', '/JavaScript', '/Launch', '/Encrypt', '/AA'];
    
    console.log('Generating 5MB 3-page scanned PDF...');
    const pdf5Mb = await generateScannedImagePdf({ pages: 3, totalSizeMb: 5, injectPatterns: fakeHits });
    const check5 = await validatePdfBuffer(pdf5Mb);
    assert.strictEqual(check5.valid, true, `5MB scan should pass: ${check5.error}`);
    assert.strictEqual(check5.pageCount, 3);

    console.log('Generating 15MB 5-page scanned PDF...');
    const pdf15Mb = await generateScannedImagePdf({ pages: 5, totalSizeMb: 15, injectPatterns: fakeHits });
    const check15 = await validatePdfBuffer(pdf15Mb);
    assert.strictEqual(check15.valid, true, `15MB scan should pass: ${check15.error}`);
    assert.strictEqual(check15.pageCount, 5);
  });

  it('rejects malicious PDF: JavaScript in OpenAction', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([200, 200]);
    doc.catalog.set(
      PDFName.of('OpenAction'),
      doc.context.obj({
        Type: 'Action',
        S: 'JavaScript',
        JS: 'app.alert("Pwned");',
      })
    );
    const bytes = Buffer.from(await doc.save());
    const res = await validatePdfBuffer(bytes);
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.code, 'ACTIVE_CONTENT_BLOCKED');
  });

  it('rejects malicious PDF: Executable Launch action in Page AA dictionary', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([200, 200]);
    page.node.set(
      PDFName.of('AA'),
      doc.context.obj({
        O: doc.context.obj({
          Type: 'Action',
          S: PDFName.of('Launch'),
          F: PDFString.of('cmd.exe'),
        }),
      })
    );
    const bytes = Buffer.from(await doc.save());
    const res = await validatePdfBuffer(bytes);
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.code, 'ACTIVE_CONTENT_BLOCKED');
  });

  it('rejects malicious PDF: EmbeddedFiles in Names catalog tree', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([200, 200]);
    doc.catalog.set(
      PDFName.of('Names'),
      doc.context.obj({
        EmbeddedFiles: doc.context.obj({ Names: [] }),
      })
    );
    const bytes = Buffer.from(await doc.save());
    const res = await validatePdfBuffer(bytes);
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.code, 'ACTIVE_CONTENT_BLOCKED');
  });

  it('rejects encrypted / password-protected PDF', async () => {
    // Generate valid header + synthetic encrypted trailer dictionary
    const encPdf = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] >>\nendobj\n' +
      'trailer\n<< /Root 1 0 R /Encrypt 4 0 R >>\n%%EOF'
    );
    const res = await validatePdfBuffer(encPdf);
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.code, 'PASSWORD_PROTECTED_PDF');
  });

  it('rejects truncated / corrupted PDF', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([100, 100]);
    const full = Buffer.from(await doc.save());
    // Truncate to first 40% of bytes
    const truncated = full.subarray(0, Math.floor(full.length * 0.4));
    const res = await validatePdfBuffer(truncated);
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.code, 'INVALID_PDF_FORMAT');
  });

  it('rejects PDF exceeding 50 pages', async () => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < 55; i++) {
      doc.addPage([100, 100]);
    }
    const bytes = Buffer.from(await doc.save());
    const res = await validatePdfBuffer(bytes);
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.code, 'PAGE_COUNT_EXCEEDED');
    assert.strictEqual(res.pageCount, 55);
  });

  it('proves zero false rejections on 20 random 10MB image PDFs', { timeout: 180000 }, async () => {
    console.log('Testing 20 random 10MB scanned-image PDFs for zero false rejections...');
    let passed = 0;
    let falseRejections = 0;

    for (let i = 1; i <= 20; i++) {
      // 1-3 pages per scan, ~10MB total, with random byte noise and edge-case patterns
      const pages = (i % 3) + 1;
      const pdfBuffer = await generateScannedImagePdf({
        pages,
        totalSizeMb: 10,
        injectPatterns: ['/JS', '/JavaScript', '/Launch', '/Encrypt', '/AA', '/OpenAction'],
      });

      const check = await validatePdfBuffer(pdfBuffer);
      if (check.valid) {
        passed++;
      } else {
        falseRejections++;
        console.error(`[FALSE REJECTION] PDF #${i} rejected with code: ${check.code}, error: ${check.error}`);
      }

      if (i % 5 === 0) {
        console.log(`Progress: ${i}/20 10MB PDFs checked (${passed} passed, ${falseRejections} false rejections)`);
      }
    }

    assert.strictEqual(falseRejections, 0, 'Must have zero false rejections on 20 random 10MB scanned PDFs');
    assert.strictEqual(passed, 20, 'All 20 random 10MB scanned PDFs must pass');
    console.log('SUCCESS: Proved 0 false rejections across 20 random 10MB image PDFs (20/20 PASS).');
  });
});
