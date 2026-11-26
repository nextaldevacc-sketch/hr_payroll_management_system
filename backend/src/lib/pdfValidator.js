import { PDFDocument, PDFName, PDFDict, PDFArray, PDFRef } from 'pdf-lib';

/**
 * Pure JavaScript Scanned-PDF Validator (pdf-lib based)
 *
 * Zero-native-dependency validator optimized for 1 vCPU / 3.8GB RAM VPS.
 * Enforces strict security invariants:
 * - Magic bytes verification (%PDF- in first 1024 bytes)
 * - Max size limit: 25MB (MAX_PDF_SIZE_BYTES)
 * - Real PDF parsing via pdf-lib: rejects unparseable or truncated files
 * - Password-protected detection (isEncrypted / /Encrypt dictionary)
 * - Active content rejection:
 *     - Catalog / Names / Page actions: JavaScript, OpenAction, AA, Launch, EmbeddedFiles
 *     - Recursive action dictionary inspection (/S /JavaScript, /S /Launch)
 * - Maximum page count: 50 pages from parsed document (MAX_PDF_PAGES)
 */

export const MAX_PDF_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_PDF_PAGES = 50;

const BLOCKED_NAMES = new Set([
  '/JavaScript',
  '/JS',
  '/OpenAction',
  '/AA',
  '/Launch',
  '/EmbeddedFiles',
]);

const BLOCKED_ACTION_TYPES = new Set([
  '/JavaScript',
  '/Launch',
]);

/**
 * Recursively scans a PDF object (dict or array) for prohibited active content
 *
 * @param {any} obj
 * @param {import('pdf-lib').PDFContext} context
 * @param {Set<any>} visited
 * @returns {string|null} Name of prohibited token found or null if safe
 */
function scanPdfObject(obj, context, visited) {
  if (!obj) return null;

  if (obj instanceof PDFRef) {
    if (visited.has(obj.tag)) return null;
    visited.add(obj.tag);
    const resolved = context.lookup(obj);
    return scanPdfObject(resolved, context, visited);
  }

  if (visited.has(obj)) return null;
  visited.add(obj);

  if (obj instanceof PDFDict) {
    for (const [key, val] of obj.entries()) {
      const kStr = key.toString();
      if (BLOCKED_NAMES.has(kStr)) {
        return kStr;
      }
      if (kStr === '/S') {
        const sStr = val?.toString?.();
        if (BLOCKED_ACTION_TYPES.has(sStr)) {
          return `Action:${sStr}`;
        }
      }
      const hit = scanPdfObject(val, context, visited);
      if (hit) return hit;
    }
  } else if (obj instanceof PDFArray) {
    for (let i = 0; i < obj.size(); i++) {
      const hit = scanPdfObject(obj.get(i), context, visited);
      if (hit) return hit;
    }
  }

  return null;
}

/**
 * Validates a PDF buffer against safety and structure rules using real AST parsing
 *
 * @param {Buffer|Uint8Array} buffer
 * @param {Object} [options]
 * @param {number} [options.maxSizeBytes=MAX_PDF_SIZE_BYTES]
 * @param {number} [options.maxPages=MAX_PDF_PAGES]
 * @returns {Promise<{ valid: boolean, pageCount?: number, error?: string, code?: string }>}
 */
export async function validatePdfBuffer(buffer, { maxSizeBytes = MAX_PDF_SIZE_BYTES, maxPages = MAX_PDF_PAGES } = {}) {
  if (!buffer || (Buffer.isBuffer(buffer) && buffer.length === 0) || buffer.byteLength === 0) {
    return { valid: false, error: 'Empty file buffer', code: 'INVALID_EMPTY_FILE' };
  }

  const byteLength = buffer.length || buffer.byteLength;

  // 1. Size check
  if (byteLength > maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds ${(maxSizeBytes / 1024 / 1024).toFixed(0)}MB limit (${(byteLength / 1024 / 1024).toFixed(2)}MB)`,
      code: 'PDF_SIZE_EXCEEDED',
    };
  }

  // 2. Magic bytes check: must contain %PDF- within the first 1024 bytes
  const headerSlice = buffer.subarray(0, Math.min(1024, byteLength));
  const headerStr = Buffer.from(headerSlice).toString('latin1');
  const pdfHeaderIndex = headerStr.indexOf('%PDF-');
  if (pdfHeaderIndex === -1) {
    return {
      valid: false,
      error: 'Invalid PDF format: %PDF- magic bytes not found in file header',
      code: 'INVALID_PDF_HEADER',
    };
  }

  // 3. Real Parser Execution via pdf-lib
  let pdfDoc;
  try {
    pdfDoc = await PDFDocument.load(buffer, {
      ignoreEncryption: true,
      parseSpeed: 1, // Full AST parsing
      throwOnInvalidObject: true,
    });
  } catch (err) {
    const msg = err?.message || String(err);
    if (
      msg.toLowerCase().includes('encrypt') ||
      err.name === 'EncryptedPDFError' ||
      msg.includes('password')
    ) {
      return {
        valid: false,
        error: 'Password-protected / encrypted PDFs cannot be processed. Please upload an unencrypted scanned copy.',
        code: 'PASSWORD_PROTECTED_PDF',
      };
    }
    return {
      valid: false,
      error: `Malformed or unparseable PDF document: ${msg}`,
      code: 'INVALID_PDF_FORMAT',
    };
  }

  // 4. Password Protection check
  if (pdfDoc.isEncrypted || pdfDoc.context.trailerInfo?.Encrypt !== undefined) {
    return {
      valid: false,
      error: 'Password-protected / encrypted PDFs cannot be processed. Please upload an unencrypted scanned copy.',
      code: 'PASSWORD_PROTECTED_PDF',
    };
  }

  // 5. Page count from parsed document
  let pageCount = 0;
  try {
    pageCount = pdfDoc.getPageCount();
  } catch (err) {
    return {
      valid: false,
      error: `Failed to determine page count from parsed PDF: ${err.message}`,
      code: 'INVALID_PDF_FORMAT',
    };
  }

  if (pageCount < 1) {
    return {
      valid: false,
      error: 'PDF contains no pages',
      code: 'INVALID_PDF_FORMAT',
      pageCount: 0,
    };
  }

  if (pageCount > maxPages) {
    return {
      valid: false,
      error: `Document has ${pageCount} pages, exceeding the maximum allowed limit of ${maxPages} pages`,
      code: 'PAGE_COUNT_EXCEEDED',
      pageCount,
    };
  }

  // 6. Active Content Traversal (Catalog, Names, Pages, Actions)
  const visited = new Set();
  let prohibitedToken = null;

  // Enumerate all indirect objects in the parsed document
  for (const [ref, obj] of pdfDoc.context.enumerateIndirectObjects()) {
    prohibitedToken = scanPdfObject(obj, pdfDoc.context, visited);
    if (prohibitedToken) break;
  }

  if (prohibitedToken) {
    return {
      valid: false,
      error: `Active or executable content detected (${prohibitedToken}). Scanned statutory documents must be static PDFs without scripts or launch actions.`,
      code: 'ACTIVE_CONTENT_BLOCKED',
      pageCount,
    };
  }

  return {
    valid: true,
    pageCount,
  };
}

export default {
  validatePdfBuffer,
  MAX_PDF_SIZE_BYTES,
  MAX_PDF_PAGES,
};
