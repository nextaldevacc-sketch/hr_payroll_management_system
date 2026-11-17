import prisma from '../lib/prisma.js';
import mailer from '../lib/mailer.js';
import auditService from './auditService.js';
import storageService from '../lib/storage.js';
import { validateAndResolveVisa } from './visaValidator.js';
import scopeService from './scopeService.js';
import { toDubaiDateString } from '@nextal/shared';

// Dubai timezone is UTC+4 (no DST)
const DUBAI_OFFSET_MS = 4 * 60 * 60 * 1000;

/**
 * Returns current date at Dubai midnight
 */
export function getDubaiCalendarDate(date = new Date()) {
  const d = new Date(date);
  const dubaiMs = d.getTime() + DUBAI_OFFSET_MS;
  const dubaiDate = new Date(dubaiMs);
  const y = dubaiDate.getUTCFullYear();
  const m = dubaiDate.getUTCMonth();
  const day = dubaiDate.getUTCDate();
  return {
    year: y,
    month: m + 1,
    day,
    dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    midnightDubaiUtc: new Date(Date.UTC(y, m, day) - DUBAI_OFFSET_MS),
  };
}

/**
 * Calculates whole calendar days remaining until expiry in Asia/Dubai time.
 * If expiry date is 2026-10-15 and today is 2026-10-15 Dubai date, days remaining = 0 (expires end of day).
 * If today is 2026-10-16, days remaining = -1 (Expired).
 */
export function calculateDaysRemainingInDubai(expiryDate, referenceDate = new Date()) {
  if (!expiryDate) return null;
  const exp = new Date(expiryDate);
  if (isNaN(exp.getTime())) return null;

  const refInfo = getDubaiCalendarDate(referenceDate);
  const expInfo = getDubaiCalendarDate(exp);

  const refUtcMidnight = Date.UTC(refInfo.year, refInfo.month - 1, refInfo.day);
  const expUtcMidnight = Date.UTC(expInfo.year, expInfo.month - 1, expInfo.day);

  return Math.round((expUtcMidnight - refUtcMidnight) / (24 * 60 * 60 * 1000));
}

/**
 * Evaluates document status and milestone alert band
 */
export function evaluateDocumentStatus(doc, alertDays = 90, referenceDate = new Date()) {
  if (!doc || !doc.doc_number || !doc.expiry_date) {
    return { status: 'Missing Data', daysRemaining: null, currentMilestone: null };
  }

  const daysRemaining = calculateDaysRemainingInDubai(doc.expiry_date, referenceDate);
  if (daysRemaining === null) {
    return { status: 'Missing Data', daysRemaining: null, currentMilestone: null };
  }

  if (daysRemaining < 0) {
    return { status: 'Expired', daysRemaining, currentMilestone: null };
  }

  if (daysRemaining <= alertDays) {
    let currentMilestone = 90;
    if (daysRemaining <= 30) currentMilestone = 30;
    else if (daysRemaining <= 60) currentMilestone = 60;

    return { status: 'Expiring Soon', daysRemaining, currentMilestone };
  }

  return { status: 'Valid', daysRemaining, currentMilestone: null };
}

export class ComplianceService {
  constructor(client = prisma) {
    this.prisma = client;
  }

  /**
   * Run nightly compliance check across all or specific company
   */
  async runComplianceJob({ referenceDate = new Date(), companyId = null } = {}) {
    const where = {};
    if (companyId) {
      where.company_id = companyId;
    }

    const documents = await this.prisma.$base().employee_documents.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            arabic_name: true,
            employee_code: true,
            company_id: true,
            status: true,
            work_email: true,
            user: { select: { id: true, email: true } },
          },
        },
        owner: {
          select: { id: true, email: true, employee: { select: { name: true } } },
        },
      },
    });

    // Cache HR users per company for notifications
    const hrUsersByCompany = {};
    const getHrUsers = async (compId) => {
      if (hrUsersByCompany[compId]) return hrUsersByCompany[compId];
      const users = await this.prisma.$base().users.findMany({
        where: {
          company_id: compId,
          status: { in: ['Active', 'ACTIVE'] },
          user_roles: {
            some: {
              role: {
                name: { in: ['HR_MANAGER', 'COMPANY_ADMIN', 'HR_OFFICER'] },
              },
            },
          },
        },
        select: { id: true, email: true, employee: { select: { name: true } } },
      });
      hrUsersByCompany[compId] = users;
      return users;
    };

    let updatedCount = 0;
    let alertsSentCount = 0;
    const alertDetails = [];

    for (const doc of documents) {
      if (doc.employee?.status !== 'Active') continue;

      const evalResult = evaluateDocumentStatus(doc, 90, referenceDate);
      const { status: calculatedStatus, daysRemaining, currentMilestone } = evalResult;

      // 1. Update status in DB if changed
      let newDbStatus = calculatedStatus;
      // If doc is pending verification from renewal, keep pending status or valid
      if (doc.verification_status === 'Pending') {
        newDbStatus = doc.status; // keep current status until verified
      } else if (doc.status !== calculatedStatus) {
        await this.prisma.$base().employee_documents.update({
          where: { id: doc.id },
          data: { status: calculatedStatus },
        });
        updatedCount++;
      }

      // 2. Check milestone reminders (90, 60, 30 days)
      if (calculatedStatus === 'Expiring Soon' && currentMilestone !== null) {
        const lastSentMilestone = doc.last_alert_days;

        // Idempotency check: only send if milestone has not been sent yet
        // (i.e. lastSentMilestone is null or higher than currentMilestone, e.g. 90 -> 60 -> 30)
        if (lastSentMilestone === null || lastSentMilestone > currentMilestone) {
          const hrUsers = await getHrUsers(doc.company_id);
          const ownerUserId = doc.owner_id || doc.employee.user?.id;

          const expiryDateStr = toDubaiDateString(doc.expiry_date);
          const titleEn = `Document Expiring Soon (${doc.doc_type})`;
          const titleAr = `وثيقة توشك على الانتهاء (${doc.doc_type})`;
          const bodyEn = `${doc.doc_type} (${doc.doc_number}) for ${doc.employee.name} expires in ${daysRemaining} day(s) on ${expiryDateStr}.`;
          const bodyAr = `تنتهي صلاحية ${doc.doc_type} (${doc.doc_number}) للموظف ${doc.employee.arabic_name || doc.employee.name} خلال ${daysRemaining} يوم في ${expiryDateStr}.`;

          // In-app notifications
          const recipientsToNotify = new Set();
          if (ownerUserId) recipientsToNotify.add(ownerUserId);
          for (const hr of hrUsers) {
            recipientsToNotify.add(hr.id);
          }
          if (recipientsToNotify.size === 0) {
            console.warn(`[COMPLIANCE] No HR recipients or owner found to notify for expiring document ${doc.id} in company ${doc.company_id}`);
            try {
              await auditService.log({
                companyId: doc.company_id,
                action: 'ALERT_UNROUTED',
                tableName: 'employee_documents',
                recordId: doc.id,
                newValues: {
                  reason: 'No HR recipients or owner found for document expiry notification',
                  doc_type: doc.doc_type,
                  days_remaining: daysRemaining,
                },
              });
            } catch (auditErr) {
              console.error('[COMPLIANCE] Failed to log unrouted document alert:', auditErr.message);
            }
          }

          for (const userId of recipientsToNotify) {
            await this.prisma.$base().notifications.create({
              data: {
                company_id: doc.company_id,
                user_id: userId,
                type: 'DOCUMENT_EXPIRING',
                title: titleEn,
                title_ar: titleAr,
                body: bodyEn,
                body_ar: bodyAr,
                link: '/compliance',
              },
            });
          }

          // Email reminders via mailer (written to dev storage folder)
          const emailsToSend = [];
          if (doc.owner?.email) emailsToSend.push(doc.owner.email);
          else if (doc.employee?.work_email) emailsToSend.push(doc.employee.work_email);
          else if (doc.employee?.user?.email) emailsToSend.push(doc.employee.user.email);
          for (const hr of hrUsers) {
            if (hr.email && !emailsToSend.includes(hr.email)) {
              emailsToSend.push(hr.email);
            }
          }

          for (const email of emailsToSend) {
            await mailer.sendMail({
              to: email,
              subject: `[Nextal HR] Reminder: ${doc.doc_type} expires in ${daysRemaining} days`,
              html: `<p>Dear Colleague,</p><p>${bodyEn}</p><p><a href="/compliance">View in Compliance Tracker</a></p>`,
              text: bodyEn,
              companyId: doc.company_id,
              metadata: { docId: doc.id, docType: doc.doc_type, daysRemaining, type: 'document_expiry' },
            }).catch((err) => console.warn('[Compliance] Failed to send reminder email:', err.message));
          }

          // Mark milestone as sent to ensure idempotency
          await this.prisma.$base().employee_documents.update({
            where: { id: doc.id },
            data: {
              last_alert_days: currentMilestone,
              last_alert_sent_at: new Date(referenceDate),
            },
          });

          alertsSentCount++;
          alertDetails.push({
            documentId: doc.id,
            employeeName: doc.employee.name,
            docType: doc.doc_type,
            daysRemaining,
            milestone: currentMilestone,
          });
        }
      }
    }

    return {
      scanned: documents.length,
      updatedCount,
      alertsFound: alertDetails.length,
      alertsSentCount,
      alerts: alertDetails,
      referenceDate,
      timestamp: new Date(),
    };
  }

  /**
   * Get compliance overview statistics for dashboard / tracker bento
   */
  async getComplianceOverview(companyId, companyVisaId = null, viewer = null) {
    const scope = scopeService.resolveDataScope(viewer);
    const scopeWhere = scopeService.buildEmployeeWhere(scope, companyVisaId);

    const where = {
      company_id: companyId,
      employee: {
        status: 'Active',
        ...(scopeWhere || {}),
      },
    };

    const docs = await this.prisma.$base().employee_documents.findMany({
      where,
      select: {
        id: true,
        doc_type: true,
        doc_number: true,
        expiry_date: true,
        status: true,
        verification_status: true,
      },
    });

    const now = new Date();
    let expired = 0;
    let expiring30 = 0;
    let expiring60 = 0;
    let expiring90 = 0;
    let missingData = 0;
    let valid = 0;
    let pendingVerification = 0;

    for (const d of docs) {
      if (d.verification_status === 'Pending') {
        pendingVerification++;
      }

      const evalRes = evaluateDocumentStatus(d, 90, now);
      if (evalRes.status === 'Missing Data') {
        missingData++;
      } else if (evalRes.status === 'Expired') {
        expired++;
      } else if (evalRes.status === 'Expiring Soon') {
        if (evalRes.daysRemaining <= 30) expiring30++;
        else if (evalRes.daysRemaining <= 60) expiring60++;
        else expiring90++;
      } else {
        valid++;
      }
    }

    return {
      total: docs.length,
      expired,
      expiring30,
      expiring60,
      expiring90,
      expiringSoon: expiring30 + expiring60 + expiring90,
      missingData,
      valid,
      pendingVerification,
    };
  }

  /**
   * List compliance documents with filters
   */
  async listComplianceDocuments(companyId, filters = {}, viewer = null) {
    const { status, doc_type, department_id, search, page = 1, limit = 50 } = filters;
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const scope = scopeService.resolveDataScope(viewer);
    const visaParam = filters.company_visa_id || filters.companyVisaId;
    const scopeWhere = scopeService.buildEmployeeWhere(scope, visaParam);

    const where = {
      company_id: companyId,
      employee: {
        status: 'Active',
        ...(scopeWhere || {}),
      },
    };

    if (status) {
      if (status === 'Pending Verification' || status === 'Pending') {
        where.OR = [
          { verification_status: 'Pending' },
          { status: 'Pending Verification' },
          { status: 'Pending' },
        ];
      } else {
        where.status = status;
      }
    }

    if (filters.verification_status) {
      where.verification_status = filters.verification_status;
    }

    if (doc_type) {
      where.doc_type = doc_type;
    }

    if (department_id) {
      where.employee = {
        ...where.employee,
        department_id,
      };
    }

    if (search) {
      where.OR = [
        { doc_number: { contains: search, mode: 'insensitive' } },
        { employee: { name: { contains: search, mode: 'insensitive' } } },
        { employee: { employee_code: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.$base().employee_documents.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              employee_code: true,
              name: true,
              arabic_name: true,
              contracts: {
                where: { status: { in: ['Approved', 'Active'] } },
                include: { department: true },
                orderBy: { version_no: 'desc' },
                take: 1,
              },
            },
          },
          owner: { select: { id: true, email: true, employee: { select: { name: true } } } },
          uploader: { select: { id: true, email: true, employee: { select: { name: true } } } },
          verifier: { select: { id: true, email: true, employee: { select: { name: true } } } },
        },
        orderBy: [{ expiry_date: 'asc' }],
        skip,
        take,
      }),
      this.prisma.$base().employee_documents.count({ where }),
    ]);

    const now = new Date();
    const formattedItems = items.map((doc) => {
      const daysRemaining = calculateDaysRemainingInDubai(doc.expiry_date, now);
      // Status computed dynamically on read from date (Asia/Dubai)
      let dynamicStatus = doc.status;
      if (daysRemaining !== null) {
        if (daysRemaining < 0) dynamicStatus = 'Expired';
        else if (daysRemaining <= 90) dynamicStatus = 'Expiring Soon';
        else dynamicStatus = 'Valid';
      }
      return {
        id: doc.id,
        employee_id: doc.employee_id,
        employee_code: doc.employee?.employee_code,
        employee_name: doc.employee?.name,
        employee_name_ar: doc.employee?.arabic_name,
        department_name: doc.employee?.contracts?.[0]?.department?.name,
        department_name_ar: doc.employee?.contracts?.[0]?.department?.name_ar,
        doc_type: doc.doc_type,
        doc_number: doc.doc_number,
        issue_date: doc.issue_date,
        expiry_date: doc.expiry_date,
        days_remaining: daysRemaining,
        status: dynamicStatus,
        verification_status: doc.verification_status,
        file_url: doc.file_url,
        owner: doc.owner,
        uploader: doc.uploader,
        verifier: doc.verifier,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
      };
    });

    return {
      items: formattedItems,
      total,
      page: parseInt(page, 10),
      limit: take,
      totalPages: Math.ceil(total / take),
    };
  }

  /**
   * Renew document (owner or HR uploads renewed document)
   */
  async renewDocument({ companyId, documentId, file = null, meta = {}, viewer }) {
    const doc = await this.prisma.$base().employee_documents.findUnique({
      where: { id: documentId },
      include: { employee: true },
    });

    if (!doc || doc.company_id !== companyId) {
      const err = new Error('Document not found');
      err.status = 404;
      throw err;
    }

    // Capture old snapshot for version history
    const oldSnapshot = {
      doc_number: doc.doc_number,
      issue_date: doc.issue_date,
      expiry_date: doc.expiry_date,
      file_url: doc.file_url,
      status: doc.status,
      verification_status: doc.verification_status,
      last_alert_days: doc.last_alert_days,
      archived_at: new Date().toISOString(),
    };

    // Save previous version in settings_versions
    const prevVersions = await this.prisma.$base().settings_versions.count({
      where: { company_id: companyId, entity_type: 'employee_document', entity_id: documentId },
    });

    await this.prisma.$base().settings_versions.create({
      data: {
        company_id: companyId,
        entity_type: 'employee_document',
        entity_id: documentId,
        version_no: prevVersions + 1,
        effective_from: doc.issue_date || new Date(),
        snapshot: oldSnapshot,
        created_by: viewer?.id || null,
      },
    });

    // Save physical file if provided
    let fileUrl = doc.file_url;
    if (file && file.buffer) {
      const saved = await storageService.saveFile({
        buffer: file.buffer,
        originalName: file.originalname || `${doc.doc_type}_renewed.pdf`,
        mimeType: file.mimetype,
      });
      fileUrl = saved.storagePath;
    }

    const newExpiry = meta.expiry_date ? new Date(meta.expiry_date) : doc.expiry_date;
    const newIssue = meta.issue_date ? new Date(meta.issue_date) : doc.issue_date;
    const newDocNumber = meta.doc_number || doc.doc_number;

    // Update document to Pending Verification
    const updated = await this.prisma.$base().employee_documents.update({
      where: { id: documentId },
      data: {
        doc_number: newDocNumber,
        issue_date: newIssue,
        expiry_date: newExpiry,
        file_url: fileUrl,
        verification_status: 'Pending',
        uploaded_by: viewer?.id || null,
        last_alert_days: null,
        last_alert_sent_at: null,
        updated_by: viewer?.id || null,
      },
      include: {
        employee: { select: { id: true, name: true, employee_code: true } },
      },
    });

    // Log to audit history
    await auditService.log({
      companyId,
      userId: viewer?.id || null,
      action: 'RenewDocument',
      tableName: 'employee_documents',
      recordId: documentId,
      oldValues: oldSnapshot,
      newValues: {
        doc_number: newDocNumber,
        expiry_date: newExpiry,
        verification_status: 'Pending',
        file_url: fileUrl,
      },
    });

    // Notify HR users
    const hrUsers = await this.prisma.$base().users.findMany({
      where: {
        company_id: companyId,
        status: 'ACTIVE',
        user_roles: {
          some: {
            role: { name: { in: ['HR_MANAGER', 'HR_OFFICER'] } },
          },
        },
      },
      select: { id: true },
    });

    for (const hr of hrUsers) {
      await this.prisma.$base().notifications.create({
        data: {
          company_id: companyId,
          user_id: hr.id,
          type: 'DOCUMENT_EXPIRING',
          title: `Renewed Document Pending Verification: ${doc.doc_type}`,
          title_ar: `وثيقة مجددة بانتظار التحقق: ${doc.doc_type}`,
          body: `Renewed ${doc.doc_type} (${newDocNumber}) uploaded for ${doc.employee.name}. Please verify.`,
          body_ar: `تم رفع ${doc.doc_type} (${newDocNumber}) مجدد للموظف ${doc.employee.name}. يرجى التحقق.`,
          link: '/compliance',
        },
      });
    }

    return updated;
  }

  /**
   * Verify document by HR (sets verification_status: 'Verified', status: 'Valid')
   */
  async verifyDocument({ companyId, documentId, viewer }) {
    const doc = await this.prisma.$base().employee_documents.findUnique({
      where: { id: documentId },
      include: { employee: true },
    });

    if (!doc || doc.company_id !== companyId) {
      const err = new Error('Document not found');
      err.status = 404;
      throw err;
    }

    // Dual-control enforcement (7.7.7): uploader/owner cannot verify their own upload
    const viewerId = viewer?.id || viewer?.userId;
    const isOwner = viewerId && (viewerId === doc.owner_id || (doc.employee && doc.employee.user?.id === viewerId) || (viewer?.employeeId && viewer.employeeId === doc.employee_id));
    const isSelfUpload = viewerId && (viewerId === doc.uploaded_by || viewerId === doc.created_by);

    if (viewerId && (isOwner || isSelfUpload)) {
      const err = new Error('Dual-control violation: Uploader cannot verify their own document renewal');
      err.status = 403;
      err.code = 'SELF_VERIFICATION_FORBIDDEN';
      throw err;
    }

    const evalRes = evaluateDocumentStatus(doc, 90, new Date());
    const newStatus = evalRes.status;

    const updated = await this.prisma.$base().employee_documents.update({
      where: { id: documentId },
      data: {
        verification_status: 'Verified',
        status: newStatus,
        verified_by: viewer?.id || null,
        updated_by: viewer?.id || null,
      },
      include: {
        employee: { select: { id: true, name: true, employee_code: true } },
      },
    });

    await auditService.log({
      companyId,
      userId: viewer?.id || null,
      action: 'VerifyDocument',
      tableName: 'employee_documents',
      recordId: documentId,
      oldValues: { verification_status: doc.verification_status, status: doc.status },
      newValues: { verification_status: 'Verified', status: newStatus, verified_by: viewer?.id },
    });

    // Notify employee/owner
    const ownerUserId = doc.owner_id || doc.employee.user?.id;
    if (ownerUserId) {
      await this.prisma.$base().notifications.create({
        data: {
          company_id: companyId,
          user_id: ownerUserId,
          type: 'REQUEST_STATUS',
          title: `Document Verified: ${doc.doc_type}`,
          title_ar: `تم التحقق من الوثيقة: ${doc.doc_type}`,
          body: `Your renewed ${doc.doc_type} (${doc.doc_number}) has been verified and approved by HR.`,
          body_ar: `تم التحقق من وثيقتك ${doc.doc_type} (${doc.doc_number}) واعتمادها من قبل الموارد البشرية.`,
          link: '/compliance',
        },
      });
    }

    return updated;
  }

  /**
   * Get document renewal history
   */
  async getDocumentHistory({ companyId, documentId }) {
    const [versions, auditLogs] = await Promise.all([
      this.prisma.$base().settings_versions.findMany({
        where: { company_id: companyId, entity_type: 'employee_document', entity_id: documentId },
        orderBy: { version_no: 'desc' },
      }),
      this.prisma.$base().audit_logs.findMany({
        where: { company_id: companyId, table_name: 'employee_documents', record_id: documentId },
        orderBy: { created_at: 'desc' },
        include: { user: { select: { id: true, email: true, employee: { select: { name: true } } } } },
      }),
    ]);

    return { versions, auditLogs };
  }
}

export const complianceService = new ComplianceService();

export async function runComplianceJob(referenceDate = new Date()) {
  return await complianceService.runComplianceJob({ referenceDate });
}

export default complianceService;

