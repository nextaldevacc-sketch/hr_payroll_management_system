import path from 'node:path';
import prisma from '../lib/prisma.js';
import storageService from '../lib/storage.js';
import auditService from './auditService.js';
import scopeService from './scopeService.js';
import { validatePdfBuffer } from '../lib/pdfValidator.js';
import {
  normalizeDocumentType,
  isValidDocumentType,
  getDocumentTypeConfig,
} from '@nextal/shared';

export const MAX_BULK_FILES = 100;

export class BulkDocumentService {
  constructor(db = prisma) {
    this.prisma = db;
  }

  /**
   * Parses filename according to convention:
   * [employee_code]_[doc_type][_optional_notes].pdf
   * E.g. EMP-001_EMIRATES_ID.pdf, EMP-042_PASSPORT_front.pdf, EMP102_BANK_DETAILS.pdf
   */
  parseFilename(originalFilename) {
    if (!originalFilename || typeof originalFilename !== 'string') return null;
    const base = path.basename(originalFilename).replace(/\.[^/.]+$/, '');
    const parts = base.split('_');

    if (parts.length < 2) {
      return {
        matched: false,
        employeeCode: null,
        rawDocType: null,
        normalizedDocType: null,
      };
    }

    const employeeCode = parts[0].trim();
    // Try matching doc type combinations from part 1 onwards
    // E.g. "RESIDENCE_VISA" might be split into parts[1] and parts[2]
    let normalizedDocType = null;
    let rawDocType = parts[1].trim();

    if (parts.length >= 3) {
      const combined = `${parts[1]}_${parts[2]}`;
      const normCombined = normalizeDocumentType(combined);
      if (normCombined && isValidDocumentType(normCombined)) {
        normalizedDocType = normCombined;
        rawDocType = combined;
      }
    }

    if (!normalizedDocType) {
      normalizedDocType = normalizeDocumentType(rawDocType);
    }

    return {
      matched: Boolean(employeeCode && normalizedDocType),
      employeeCode,
      rawDocType,
      normalizedDocType,
    };
  }

  /**
   * Parses an optional CSV manifest:
   * file_name, employee_code, doc_type, doc_number, issue_date, expiry_date
   */
  parseManifestCsv(csvBufferOrString) {
    if (!csvBufferOrString) return new Map();
    const text = Buffer.isBuffer(csvBufferOrString)
      ? csvBufferOrString.toString('utf8')
      : String(csvBufferOrString);

    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return new Map();

    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const fileIdx = header.findIndex((h) => h.includes('file'));
    const empIdx = header.findIndex((h) => h.includes('employee') || h.includes('code'));
    const typeIdx = header.findIndex((h) => h.includes('type'));
    const numIdx = header.findIndex((h) => h.includes('number'));
    const issueIdx = header.findIndex((h) => h.includes('issue'));
    const expIdx = header.findIndex((h) => h.includes('expiry') || h.includes('expire'));

    const map = new Map();
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      const filename = fileIdx >= 0 ? cols[fileIdx] : null;
      if (!filename) continue;

      const employeeCode = empIdx >= 0 ? cols[empIdx] : null;
      const rawType = typeIdx >= 0 ? cols[typeIdx] : null;
      const normalizedType = rawType ? normalizeDocumentType(rawType) : null;

      map.set(filename.toLowerCase(), {
        filename,
        employeeCode,
        docType: normalizedType || rawType,
        docNumber: numIdx >= 0 ? cols[numIdx] : null,
        issueDate: issueIdx >= 0 && cols[issueIdx] ? cols[issueIdx] : null,
        expiryDate: expIdx >= 0 && cols[expIdx] ? cols[expIdx] : null,
      });
    }

    return map;
  }

  /**
   * Validates and previews a batch of uploaded files
   */
  async previewBatch({ companyId, files = [], manifestBuffer = null, viewer }) {
    if (!files || files.length === 0) {
      const err = new Error('No document files provided for upload');
      err.status = 400;
      throw err;
    }

    if (files.length > MAX_BULK_FILES) {
      const err = new Error(`Batch size exceeds maximum limit of ${MAX_BULK_FILES} files`);
      err.status = 400;
      throw err;
    }

    const manifestMap = this.parseManifestCsv(manifestBuffer);

    // Preload company employees to match in memory
    const scope = scopeService.resolveDataScope(viewer);
    const scopeWhere = scopeService.buildEmployeeWhere(scope);

    const employees = await this.prisma.employees.findMany({
      where: {
        company_id: companyId,
        ...(scopeWhere || {}),
      },
      select: {
        id: true,
        employee_code: true,
        name: true,
        arabic_name: true,
        branch_id: true,
        company_visa_id: true,
        status: true,
      },
    });

    const empCodeMap = new Map();
    for (const emp of employees) {
      empCodeMap.set(emp.employee_code.trim().toUpperCase(), emp);
    }

    const previewItems = [];
    let matchedCount = 0;
    let unmatchedCount = 0;
    let invalidCount = 0;

    const seenEmployeeDocKeys = new Set();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filename = file.originalname || `file_${i}.pdf`;

      // 1. PDF Buffer Validation (Pure JS)
      const pdfCheck = validatePdfBuffer(file.buffer);
      if (!pdfCheck.valid) {
        invalidCount++;
        previewItems.push({
          index: i,
          file_name: filename,
          valid: false,
          status: 'Invalid',
          reason: pdfCheck.error,
          code: pdfCheck.code,
          size_bytes: file.size || file.buffer?.length || 0,
        });
        continue;
      }

      // 2. Matching via Manifest or Filename
      const manifestEntry = manifestMap.get(filename.toLowerCase());
      const filenameParse = this.parseFilename(filename);

      const targetEmpCode = manifestEntry?.employeeCode || filenameParse?.employeeCode;
      const targetDocType = manifestEntry?.docType || filenameParse?.normalizedDocType;
      const targetDocNumber = manifestEntry?.docNumber || null;
      const targetIssueDate = manifestEntry?.issueDate || null;
      const targetExpiryDate = manifestEntry?.expiryDate || null;

      if (!targetEmpCode || !targetDocType) {
        unmatchedCount++;
        previewItems.push({
          index: i,
          file_name: filename,
          valid: false,
          status: 'Unmatched',
          reason: 'Could not detect employee code or valid document type from filename or manifest',
          employee_code: targetEmpCode || null,
          doc_type: targetDocType || null,
          size_bytes: file.buffer?.length || 0,
          page_count: pdfCheck.pageCount,
        });
        continue;
      }

      // 3. Document Type Validity Check
      const normalizedType = normalizeDocumentType(targetDocType);
      if (!isValidDocumentType(normalizedType)) {
        invalidCount++;
        previewItems.push({
          index: i,
          file_name: filename,
          valid: false,
          status: 'Invalid Document Type',
          reason: `Document type "${targetDocType}" is not recognized`,
          employee_code: targetEmpCode,
          doc_type: targetDocType,
          size_bytes: file.buffer?.length || 0,
          page_count: pdfCheck.pageCount,
        });
        continue;
      }

      // 4. Employee Existence & Scope Check
      const employee = empCodeMap.get(targetEmpCode.toUpperCase());
      if (!employee) {
        unmatchedCount++;
        previewItems.push({
          index: i,
          file_name: filename,
          valid: false,
          status: 'Employee Not Found / Out of Scope',
          reason: `Employee with code "${targetEmpCode}" not found or out of user's authorized visa/branch scope`,
          employee_code: targetEmpCode,
          doc_type: normalizedType,
          size_bytes: file.buffer?.length || 0,
          page_count: pdfCheck.pageCount,
        });
        continue;
      }

      // 5. Duplicate Check within batch
      const batchKey = `${employee.id}_${normalizedType}`;
      if (seenEmployeeDocKeys.has(batchKey)) {
        invalidCount++;
        previewItems.push({
          index: i,
          file_name: filename,
          valid: false,
          status: 'Duplicate In Batch',
          reason: `Multiple files uploaded for employee ${employee.employee_code} and document type ${normalizedType}`,
          employee_code: employee.employee_code,
          employee_name: employee.name,
          doc_type: normalizedType,
          size_bytes: file.buffer?.length || 0,
          page_count: pdfCheck.pageCount,
        });
        continue;
      }
      seenEmployeeDocKeys.add(batchKey);

      // Valid and matched
      matchedCount++;
      const config = getDocumentTypeConfig(normalizedType);
      previewItems.push({
        index: i,
        file_name: filename,
        valid: true,
        status: 'Ready',
        employee_id: employee.id,
        employee_code: employee.employee_code,
        employee_name: employee.name,
        doc_type: normalizedType,
        doc_number: targetDocNumber || `${normalizedType}-${employee.employee_code}`,
        issue_date: targetIssueDate,
        expiry_date: targetExpiryDate,
        requires_expiry: config?.requiresExpiry || false,
        size_bytes: file.buffer?.length || 0,
        page_count: pdfCheck.pageCount,
      });
    }

    return {
      summary: {
        total_files: files.length,
        matched: matchedCount,
        unmatched: unmatchedCount,
        invalid: invalidCount,
        can_proceed: matchedCount > 0,
      },
      items: previewItems,
    };
  }

  /**
   * Sequentially encrypts, stores, and inserts records for matched documents
   */
  async processBatch({ companyId, files = [], manifestBuffer = null, viewer }) {
    const preview = await this.previewBatch({ companyId, files, manifestBuffer, viewer });
    const readyItems = preview.items.filter((item) => item.valid);

    if (readyItems.length === 0) {
      const err = new Error('No valid documents found in batch to process');
      err.status = 400;
      err.preview = preview;
      throw err;
    }

    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (const item of readyItems) {
      const file = files[item.index];
      try {
        // Save encrypted file with AES-256-GCM
        const saved = await storageService.saveFile({
          buffer: file.buffer,
          originalName: file.originalname || item.file_name,
          mimeType: 'application/pdf',
        });

        // Check if an existing document record exists for this employee + doc_type
        const existing = await this.prisma.employee_documents.findFirst({
          where: {
            company_id: companyId,
            employee_id: item.employee_id,
            doc_type: item.doc_type,
          },
        });

        let docRecord = null;
        if (existing) {
          // Archive old version in settings_versions
          const prevVersions = await this.prisma.settings_versions.count({
            where: { company_id: companyId, entity_type: 'employee_document', entity_id: existing.id },
          }).catch(() => 0);

          await this.prisma.settings_versions.create({
            data: {
              company_id: companyId,
              entity_type: 'employee_document',
              entity_id: existing.id,
              version_no: prevVersions + 1,
              effective_from: existing.issue_date || new Date(),
              snapshot: {
                doc_number: existing.doc_number,
                issue_date: existing.issue_date,
                expiry_date: existing.expiry_date,
                file_url: existing.file_url,
                status: existing.status,
                verification_status: existing.verification_status,
                archived_at: new Date().toISOString(),
              },
              created_by: viewer?.id || null,
            },
          }).catch((err) => console.warn('[BulkUpload] Version archive error:', err.message));

          docRecord = await this.prisma.employee_documents.update({
            where: { id: existing.id },
            data: {
              doc_number: item.doc_number,
              issue_date: item.issue_date ? new Date(item.issue_date) : existing.issue_date,
              expiry_date: item.expiry_date ? new Date(item.expiry_date) : existing.expiry_date,
              file_url: saved.storagePath,
              verification_status: 'Pending Verification',
              last_alert_days: null,
            },
          });
        } else {
          docRecord = await this.prisma.employee_documents.create({
            data: {
              company_id: companyId,
              employee_id: item.employee_id,
              doc_type: item.doc_type,
              doc_number: item.doc_number,
              issue_date: item.issue_date ? new Date(item.issue_date) : null,
              expiry_date: item.expiry_date ? new Date(item.expiry_date) : null,
              file_url: saved.storagePath,
              status: 'Valid',
              verification_status: 'Pending Verification',
              uploader_id: viewer?.id || null,
            },
          });
        }

        // Audit log (guaranteed: sanitize BANK_DETAILS filename)
        const safeLogFilename = item.doc_type === 'BANK_DETAILS' ? 'BANK_DETAILS_DOCUMENT.pdf' : item.file_name;
        await auditService.log({
          companyId,
          userId: viewer?.id || null,
          action: 'BulkDocumentUpload',
          tableName: 'employee_documents',
          recordId: docRecord.id,
          newValues: {
            employee_code: item.employee_code,
            doc_type: item.doc_type,
            filename: safeLogFilename,
            page_count: item.page_count,
            verification_status: 'Pending Verification',
          },
        }).catch((err) => console.warn('[BulkUpload] Audit log failed:', err.message));

        successCount++;
        results.push({
          file_name: item.file_name,
          employee_code: item.employee_code,
          employee_name: item.employee_name,
          doc_type: item.doc_type,
          status: 'SUCCESS',
          document_id: docRecord.id,
        });
      } catch (err) {
        failedCount++;
        results.push({
          file_name: item.file_name,
          employee_code: item.employee_code,
          employee_name: item.employee_name,
          doc_type: item.doc_type,
          status: 'FAILED',
          error: err.message,
        });
      }
    }

    // Build downloadable result CSV report
    const csvRows = ['file_name,employee_code,employee_name,doc_type,status,error'];
    for (const r of results) {
      const cleanErr = (r.error || '').replace(/[,\n\r"]/g, ' ');
      csvRows.push(`"${r.file_name}","${r.employee_code}","${r.employee_name}","${r.doc_type}","${r.status}","${cleanErr}"`);
    }
    const reportCsv = csvRows.join('\n');

    return {
      success: true,
      total_ready: readyItems.length,
      processed: successCount,
      failed: failedCount,
      results,
      reportCsv,
    };
  }

  /**
   * Employee self-service multiple PDF upload from My Documents
   */
  async processEmployeeSelfUpload({ companyId, employeeId, files = [], viewer }) {
    if (!files || files.length === 0) {
      const err = new Error('No files provided');
      err.status = 400;
      throw err;
    }

    if (files.length > 10) {
      const err = new Error('Self-service upload allows a maximum of 10 files per batch');
      err.status = 400;
      throw err;
    }

    const employee = await this.prisma.employees.findUnique({
      where: { id: employeeId },
    });
    if (!employee || employee.company_id !== companyId) {
      const err = new Error('Employee not found');
      err.status = 404;
      throw err;
    }

    const results = [];
    for (const file of files) {
      const filename = file.originalname || 'doc.pdf';
      const pdfCheck = validatePdfBuffer(file.buffer);
      if (!pdfCheck.valid) {
        results.push({ file_name: filename, status: 'FAILED', error: pdfCheck.error });
        continue;
      }

      // Detect doc_type from filename: e.g. EMIRATES_ID_front.pdf or PASSPORT.pdf
      const baseName = path.basename(filename).replace(/\.[^/.]+$/, '');
      const parts = baseName.split('_');
      let docType = normalizeDocumentType(parts[0]);
      if (!docType && parts.length > 1) {
        docType = normalizeDocumentType(`${parts[0]}_${parts[1]}`);
      }
      if (!docType || !isValidDocumentType(docType)) {
        docType = 'OTHER';
      }

      try {
        const saved = await storageService.saveFile({
          buffer: file.buffer,
          originalName: filename,
          mimeType: 'application/pdf',
        });

        const docRecord = await this.prisma.employee_documents.create({
          data: {
            company_id: companyId,
            employee_id: employeeId,
            doc_type: docType,
            doc_number: `${docType}-${employee.employee_code}`,
            file_url: saved.storagePath,
            status: 'Valid',
            verification_status: 'Pending Verification',
            uploader_id: viewer?.id || null,
          },
        });

        const safeFilename = docType === 'BANK_DETAILS' ? 'BANK_DETAILS_DOCUMENT.pdf' : filename;
        await auditService.log({
          companyId,
          userId: viewer?.id || null,
          action: 'EmployeeSelfDocUpload',
          tableName: 'employee_documents',
          recordId: docRecord.id,
          newValues: { doc_type: docType, filename: safeFilename },
        }).catch(() => {});

        results.push({ file_name: filename, doc_type: docType, status: 'SUCCESS', id: docRecord.id });
      } catch (err) {
        results.push({ file_name: filename, status: 'FAILED', error: err.message });
      }
    }

    return {
      success: true,
      processed: results.filter((r) => r.status === 'SUCCESS').length,
      failed: results.filter((r) => r.status === 'FAILED').length,
      results,
    };
  }
}

export const bulkDocumentService = new BulkDocumentService();
export default bulkDocumentService;
