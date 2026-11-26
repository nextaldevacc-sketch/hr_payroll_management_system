import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import prisma from '../lib/prisma.js';
import storageService, { encryptBuffer } from '../lib/storage.js';
import auditService from './auditService.js';
import scopeService from './scopeService.js';
import { validatePdfBuffer } from '../lib/pdfValidator.js';
import {
  normalizeDocumentType,
  isValidDocumentType,
  getDocumentTypeConfig,
} from '@nextal/shared';

export const MAX_BULK_FILES = 100;
const TMP_BATCH_DIR = process.env.TMP_BATCH_DIR || path.resolve(process.cwd(), 'storage', 'tmp-batches');

export class BulkDocumentService {
  constructor(db = prisma) {
    this.prisma = db;
    this.tmpBatchDir = TMP_BATCH_DIR;
    if (!fs.existsSync(this.tmpBatchDir)) {
      try {
        fs.mkdirSync(this.tmpBatchDir, { recursive: true });
      } catch (err) {
        console.warn('[BulkDocumentService] Could not create tmpBatchDir:', err.message);
      }
    }
  }

  /**
   * Cleans up stale temporary batches older than maxAgeMs (default 2 hours)
   */
  async cleanupStaleBatches(maxAgeMs = 2 * 60 * 60 * 1000) {
    try {
      if (!fs.existsSync(this.tmpBatchDir)) return;
      const entries = await fs.promises.readdir(this.tmpBatchDir, { withFileTypes: true });
      const now = Date.now();
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const dirPath = path.join(this.tmpBatchDir, entry.name);
          const metaPath = path.join(dirPath, 'meta.json');
          let shouldDelete = false;
          try {
            if (fs.existsSync(metaPath)) {
              const meta = JSON.parse(await fs.promises.readFile(metaPath, 'utf8'));
              const updatedTime = new Date(meta.updatedAt || meta.createdAt).getTime();
              if (now - updatedTime > maxAgeMs) {
                shouldDelete = true;
              }
            } else {
              const stat = await fs.promises.stat(dirPath);
              if (now - stat.mtimeMs > maxAgeMs) {
                shouldDelete = true;
              }
            }
          } catch {
            shouldDelete = true;
          }

          if (shouldDelete) {
            await fs.promises.rm(dirPath, { recursive: true, force: true }).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.warn('[BulkDocumentService] Stale batch cleanup warning:', err.message);
    }
  }

  /**
   * Initializes a new batch session
   */
  async initBatch({ companyId, viewer, manifestCsv = null, totalFiles = 0 }) {
    await this.cleanupStaleBatches();
    const batchId = crypto.randomUUID();
    const batchDir = path.join(this.tmpBatchDir, batchId);
    await fs.promises.mkdir(batchDir, { recursive: true });

    const meta = {
      batchId,
      companyId,
      viewerId: viewer?.id || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalFiles: Number(totalFiles) || 0,
      manifestCsv: manifestCsv || '',
      chunksUploaded: [],
      items: [],
    };

    await fs.promises.writeFile(path.join(batchDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');
    return { batchId };
  }

  /**
   * Uploads and validates a chunk of files (max 5 per chunk).
   * Validated files are encrypted on disk one-by-one; memory is freed immediately.
   */
  async uploadChunk({
    companyId,
    viewer,
    batchId = null,
    files = [],
    manifestBuffer = null,
    chunkIndex = 0,
    totalChunks = 1,
    totalFiles = 0,
  }) {
    if (!batchId) {
      const manifestStr = manifestBuffer
        ? (Buffer.isBuffer(manifestBuffer) ? manifestBuffer.toString('utf8') : String(manifestBuffer))
        : null;
      const init = await this.initBatch({ companyId, viewer, manifestCsv: manifestStr, totalFiles });
      batchId = init.batchId;
    }

    const batchDir = path.join(this.tmpBatchDir, batchId);
    const metaPath = path.join(batchDir, 'meta.json');

    if (!fs.existsSync(metaPath)) {
      // Re-init if batch expired or missing
      await fs.promises.mkdir(batchDir, { recursive: true });
      const initMeta = {
        batchId,
        companyId,
        viewerId: viewer?.id || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalFiles: Number(totalFiles) || 0,
        manifestCsv: '',
        chunksUploaded: [],
        items: [],
      };
      await fs.promises.writeFile(metaPath, JSON.stringify(initMeta, null, 2), 'utf8');
    }

    const meta = JSON.parse(await fs.promises.readFile(metaPath, 'utf8'));

    // Update manifest if provided in this chunk
    if (manifestBuffer) {
      meta.manifestCsv = Buffer.isBuffer(manifestBuffer)
        ? manifestBuffer.toString('utf8')
        : String(manifestBuffer);
    }

    const manifestMap = this.parseManifestCsv(meta.manifestCsv);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filename = file.originalname || `file_${chunkIndex}_${i}.pdf`;
      const itemIndex = meta.items.length;

      // Validate AST
      const pdfCheck = await validatePdfBuffer(file.buffer);

      const manifestEntry = manifestMap.get(filename.toLowerCase());
      const filenameParse = this.parseFilename(filename);

      const targetEmpCode = manifestEntry?.employeeCode || filenameParse?.employeeCode;
      const targetDocType = manifestEntry?.docType || filenameParse?.normalizedDocType;
      const targetDocNumber = manifestEntry?.docNumber || null;
      const targetIssueDate = manifestEntry?.issueDate || null;
      const targetExpiryDate = manifestEntry?.expiryDate || null;

      if (!pdfCheck.valid) {
        meta.items.push({
          index: itemIndex,
          filename,
          size: file.size || file.buffer?.length || 0,
          tempFile: null,
          pageCount: 0,
          valid: false,
          error: pdfCheck.error,
          code: pdfCheck.code,
          employeeCode: targetEmpCode || null,
          docType: targetDocType || null,
          docNumber: targetDocNumber,
          issueDate: targetIssueDate,
          expiryDate: targetExpiryDate,
        });
        file.buffer = null; // Free RAM immediately
        continue;
      }

      // Encrypt and persist to temp directory one-by-one
      const tempFilename = `item_${itemIndex}.enc`;
      const tempFilePath = path.join(batchDir, tempFilename);
      const encryptedData = encryptBuffer(file.buffer);
      await fs.promises.writeFile(tempFilePath, encryptedData);
      file.buffer = null; // Free RAM immediately

      meta.items.push({
        index: itemIndex,
        filename,
        size: file.size || encryptedData.length,
        tempFile: tempFilename,
        pageCount: pdfCheck.pageCount,
        valid: true,
        error: null,
        code: null,
        employeeCode: targetEmpCode || null,
        docType: targetDocType || null,
        docNumber: targetDocNumber,
        issueDate: targetIssueDate,
        expiryDate: targetExpiryDate,
      });
    }

    meta.updatedAt = new Date().toISOString();
    if (!meta.chunksUploaded.includes(chunkIndex)) {
      meta.chunksUploaded.push(chunkIndex);
    }
    if (totalFiles) {
      meta.totalFiles = Number(totalFiles);
    }

    await fs.promises.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf8');

    return {
      batch_id: batchId,
      chunk_index: chunkIndex,
      items_in_chunk: files.length,
      total_saved: meta.items.length,
    };
  }

  /**
   * Fetches preview and resolves employee scope against DB from stored batch state
   */
  async getBatchPreview({ companyId, viewer, batchId }) {
    const batchDir = path.join(this.tmpBatchDir, batchId);
    const metaPath = path.join(batchDir, 'meta.json');

    if (!fs.existsSync(metaPath)) {
      const err = new Error('Batch session not found or expired');
      err.status = 404;
      err.code = 'BATCH_NOT_FOUND';
      throw err;
    }

    const meta = JSON.parse(await fs.promises.readFile(metaPath, 'utf8'));

    // Preload company employees in viewer scope
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

    for (const item of meta.items) {
      if (!item.valid) {
        invalidCount++;
        previewItems.push({
          index: item.index,
          file_name: item.filename,
          valid: false,
          status: 'Invalid',
          reason: item.error,
          code: item.code,
          size_bytes: item.size,
          page_count: item.pageCount,
        });
        continue;
      }

      if (!item.employeeCode || !item.docType) {
        unmatchedCount++;
        previewItems.push({
          index: item.index,
          file_name: item.filename,
          valid: false,
          status: 'Unmatched',
          reason: 'Could not detect employee code or valid document type from filename or manifest',
          employee_code: item.employeeCode || null,
          doc_type: item.docType || null,
          size_bytes: item.size,
          page_count: item.pageCount,
        });
        continue;
      }

      const normalizedType = normalizeDocumentType(item.docType);
      if (!isValidDocumentType(normalizedType)) {
        invalidCount++;
        previewItems.push({
          index: item.index,
          file_name: item.filename,
          valid: false,
          status: 'Invalid Document Type',
          reason: `Document type "${item.docType}" is not recognized`,
          employee_code: item.employeeCode,
          doc_type: item.docType,
          size_bytes: item.size,
          page_count: item.pageCount,
        });
        continue;
      }

      const employee = empCodeMap.get(item.employeeCode.toUpperCase());
      if (!employee) {
        unmatchedCount++;
        previewItems.push({
          index: item.index,
          file_name: item.filename,
          valid: false,
          status: 'Employee Not Found / Out of Scope',
          reason: `Employee with code "${item.employeeCode}" not found or out of user's authorized visa/branch scope`,
          employee_code: item.employeeCode,
          doc_type: normalizedType,
          size_bytes: item.size,
          page_count: item.pageCount,
        });
        continue;
      }

      const batchKey = `${employee.id}_${normalizedType}`;
      if (seenEmployeeDocKeys.has(batchKey)) {
        invalidCount++;
        previewItems.push({
          index: item.index,
          file_name: item.filename,
          valid: false,
          status: 'Duplicate In Batch',
          reason: `Multiple files uploaded for employee ${employee.employee_code} and document type ${normalizedType}`,
          employee_code: employee.employee_code,
          employee_name: employee.name,
          doc_type: normalizedType,
          size_bytes: item.size,
          page_count: item.pageCount,
        });
        continue;
      }
      seenEmployeeDocKeys.add(batchKey);

      matchedCount++;
      const config = getDocumentTypeConfig(normalizedType);
      previewItems.push({
        index: item.index,
        file_name: item.filename,
        valid: true,
        status: 'Ready',
        employee_id: employee.id,
        employee_code: employee.employee_code,
        employee_name: employee.name,
        doc_type: normalizedType,
        doc_number: item.docNumber || `${normalizedType}-${employee.employee_code}`,
        issue_date: item.issueDate,
        expiry_date: item.expiryDate,
        requires_expiry: config?.requiresExpiry || false,
        size_bytes: item.size,
        page_count: item.pageCount,
        tempFile: item.tempFile,
      });
    }

    return {
      batch_id: batchId,
      summary: {
        total_files: meta.items.length,
        matched: matchedCount,
        unmatched: unmatchedCount,
        invalid: invalidCount,
        can_proceed: matchedCount > 0,
      },
      items: previewItems,
    };
  }

  /**
   * Processes a confirmed batch by batch_id without re-uploading files.
   * Copies pre-encrypted temp files to permanent storage one-by-one.
   */
  async processBatchById({ companyId, viewer, batchId }) {
    const preview = await this.getBatchPreview({ companyId, viewer, batchId });
    const readyItems = preview.items.filter((item) => item.valid);

    if (readyItems.length === 0) {
      const err = new Error('No valid documents found in batch to process');
      err.status = 400;
      err.preview = preview;
      throw err;
    }

    const batchDir = path.join(this.tmpBatchDir, batchId);
    const results = [];
    let successCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let failedCount = 0;

    try {
      for (const item of readyItems) {
        let destination = null;
        try {
          const tempFilePath = path.join(batchDir, item.tempFile);
          if (!fs.existsSync(tempFilePath)) {
            throw new Error(`Temporary file ${item.tempFile} not found`);
          }

          // Generate target storage filename
          const randomHex = crypto.randomBytes(16).toString('hex');
          const safeFileName = `${Date.now()}_${randomHex}.pdf`;
          destination = path.join(storageService.storageDir, safeFileName);

          // 1. Process Order: Perform Database write FIRST
          const existing = await this.prisma.employee_documents.findFirst({
            where: {
              company_id: companyId,
              employee_id: item.employee_id,
              doc_type: item.doc_type,
            },
          });

          let docRecord = null;
          let isUpdate = false;

          if (existing) {
            isUpdate = true;
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
                file_url: safeFileName,
                verification_status: 'Pending Verification',
                last_alert_days: null,
                updated_by: viewer?.id || null,
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
                file_url: safeFileName,
                status: 'Valid',
                verification_status: 'Pending Verification',
                uploaded_by: viewer?.id || null,
                created_by: viewer?.id || null,
              },
            });
          }

          // 2. Process Order: Copy pre-encrypted temp file to permanent storage only AFTER DB write succeeds
          await fs.promises.copyFile(tempFilePath, destination);

          // 3. Audit log
          const safeLogFilename = item.doc_type === 'BANK_DETAILS' ? 'BANK_DETAILS_DOCUMENT.pdf' : item.file_name;
          await auditService.log({
            companyId,
            userId: viewer?.id || null,
            action: isUpdate ? 'BulkDocumentUpdate' : 'BulkDocumentUpload',
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
          if (isUpdate) updatedCount++;
          else createdCount++;

          results.push({
            file_name: item.file_name,
            employee_code: item.employee_code,
            employee_name: item.employee_name,
            doc_type: item.doc_type,
            status: 'SUCCESS',
            action: isUpdate ? 'UPDATED' : 'CREATED',
            document_id: docRecord.id,
          });
        } catch (err) {
          // If destination file was already copied before an error occurred, remove it so zero orphans remain
          if (destination && fs.existsSync(destination)) {
            await fs.promises.unlink(destination).catch(() => {});
          }
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
    } finally {
      // Guarantee temporary batch directory is completely deleted on success AND failure paths
      await fs.promises.rm(batchDir, { recursive: true, force: true }).catch(() => {});
    }

    // Build downloadable result CSV report
    const csvRows = ['file_name,employee_code,employee_name,doc_type,status,action,error'];
    for (const r of results) {
      const cleanErr = (r.error || '').replace(/[,\n\r"]/g, ' ');
      csvRows.push(`"${r.file_name}","${r.employee_code}","${r.employee_name}","${r.doc_type}","${r.status}","${r.action || ''}","${cleanErr}"`);
    }
    const reportCsv = csvRows.join('\n');

    return {
      success: failedCount === 0,
      batch_id: batchId,
      total_ready: readyItems.length,
      processed: successCount,
      created: createdCount,
      updated: updatedCount,
      failed: failedCount,
      results,
      reportCsv,
    };
  }

  /**
   * Backwards-compatible preview & process handlers
   */
  async previewBatch({ companyId, files = [], manifestBuffer = null, viewer }) {
    const chunkRes = await this.uploadChunk({
      companyId,
      viewer,
      files,
      manifestBuffer,
      chunkIndex: 0,
      totalChunks: 1,
      totalFiles: files.length,
    });
    return this.getBatchPreview({ companyId, viewer, batchId: chunkRes.batch_id });
  }

  async processBatch({ companyId, files = [], manifestBuffer = null, viewer, batchId = null }) {
    if (batchId) {
      return this.processBatchById({ companyId, viewer, batchId });
    }
    const chunkRes = await this.uploadChunk({
      companyId,
      viewer,
      files,
      manifestBuffer,
      chunkIndex: 0,
      totalChunks: 1,
      totalFiles: files.length,
    });
    return this.processBatchById({ companyId, viewer, batchId: chunkRes.batch_id });
  }

  /**
   * Parses filename according to convention:
   * [employee_code]_[doc_type][_optional_notes].pdf
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
   * Employee self-service multiple PDF upload from My Documents
   * Processes files one at a time, releasing buffer immediately.
   */
  async processEmployeeSelfUpload({ companyId, employeeId, files = [], viewer }) {
    if (!files || files.length === 0) {
      const err = new Error('No files provided');
      err.status = 400;
      throw err;
    }

    if (files.length > 5) {
      const err = new Error('Self-service upload allows a maximum of 5 files per request');
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
      const pdfCheck = await validatePdfBuffer(file.buffer);
      if (!pdfCheck.valid) {
        file.buffer = null;
        results.push({ file_name: filename, status: 'FAILED', error: pdfCheck.error });
        continue;
      }

      const baseName = path.basename(filename).replace(/\.[^/.]+$/, '');
      const parts = baseName.split('_');
      let docType = normalizeDocumentType(parts[0]);
      if (!docType && parts.length > 1) {
        docType = normalizeDocumentType(`${parts[0]}_${parts[1]}`);
      }
      if (!docType || !isValidDocumentType(docType)) {
        docType = 'OTHER';
      }

      let destination = null;
      try {
        const randomHex = crypto.randomBytes(16).toString('hex');
        const safeFileName = `${Date.now()}_${randomHex}.pdf`;
        destination = path.join(storageService.storageDir, safeFileName);

        // 1. Process Order: DB write first
        const docRecord = await this.prisma.employee_documents.create({
          data: {
            company_id: companyId,
            employee_id: employeeId,
            doc_type: docType,
            doc_number: `${docType}-${employee.employee_code}`,
            file_url: safeFileName,
            status: 'Valid',
            verification_status: 'Pending Verification',
            uploaded_by: viewer?.id || null,
            created_by: viewer?.id || null,
          },
        });

        // 2. Encrypt & write file only AFTER DB write succeeds
        const encryptedData = encryptBuffer(file.buffer);
        await fs.promises.writeFile(destination, encryptedData);
        file.buffer = null; // Free RAM immediately

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
        // If file was created on disk but subsequent step failed, remove orphan
        if (destination && fs.existsSync(destination)) {
          await fs.promises.unlink(destination).catch(() => {});
        }
        file.buffer = null;
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
