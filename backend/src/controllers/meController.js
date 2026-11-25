import prisma from '../lib/prisma.js';
import storageService from '../lib/storage.js';
import bulkDocumentService from '../services/bulkDocumentService.js';
import auditService from '../services/auditService.js';
import leaveService from '../services/leaveService.js';
import overtimeService from '../services/overtimeService.js';
import rejectionService from '../services/rejectionService.js';
import { PayrollService } from '../services/payrollService.js';
import notificationService from '../services/notificationService.js';
import {
  toDubaiDateString,
  maskIban,
  maskIdentityNumber,
  isValidDocumentType,
  normalizeDocumentType,
  getDocumentTypeConfig,
  DOCUMENT_TYPES,
} from '@nextal/shared';

const payrollService = new PayrollService(prisma);

/**
 * 1. Bento My Home metrics for logged in employee
 */
export async function getMyHome(req, res, next) {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.status(403).json({ status: 'error', message: 'User is not linked to an employee' });
    }

    const now = new Date();
    const todayDubai = toDubaiDateString(now);
    const [y, m] = todayDubai.split('-').map(Number);
    const startOfMonth = new Date(Date.UTC(y, m - 1, 1));
    const endOfMonth = new Date(Date.UTC(y, m, 0, 23, 59, 59));

    // Leave balance summary
    const leaveBalances = await leaveService.getLeaveBalances({
      companyId: req.companyId,
      employeeId,
      year: y,
    });
    const annualBalance = leaveBalances.balances?.find((b) => b.code === 'ANNUAL' || b.name === 'Annual Leave');
    const annualAllocated = annualBalance ? Number(annualBalance.days_allocated ?? annualBalance.allocated ?? 30) : 30;
    const annualRemaining = annualBalance ? Number(annualBalance.remaining_balance ?? annualBalance.balance ?? 30) : 30;
    const annualTaken = annualBalance ? Number(annualBalance.days_taken ?? annualBalance.taken ?? 0) : 0;

    // Last net pay from last PAID pay run
    const lastPaidPayslip = await prisma.$base().payslips.findFirst({
      where: {
        employee_id: employeeId,
        company_id: req.companyId,
        pay_run: { status: 'Paid' },
      },
      include: { pay_run: true },
      orderBy: { period_to: 'desc' },
    });

    const nextPayday = new Date(Date.UTC(y, m - 1, 28));

    // Pending requests
    const [pendingLeaves, pendingOvertimes, pendingPunches] = await Promise.all([
      prisma.$base().leave_requests.count({
        where: { company_id: req.companyId, employee_id: employeeId, status: 'Pending' },
      }),
      prisma.$base().overtime_requests.count({
        where: { company_id: req.companyId, employee_id: employeeId, status: 'Pending' },
      }),
      prisma.$base().attendance_requests.count({
        where: { company_id: req.companyId, employee_id: employeeId, status: 'Pending' },
      }),
    ]);

    // Documents expiring in next 90 days
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const expiringDocs = await prisma.$base().employee_documents.findMany({
      where: {
        company_id: req.companyId,
        employee_id: employeeId,
        expiry_date: { lte: in90Days },
      },
      orderBy: { expiry_date: 'asc' },
    });

    // This month's attendance summary
    const monthDays = await prisma.$base().attendance_days.findMany({
      where: {
        company_id: req.companyId,
        employee_id: employeeId,
        work_date: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    const presentDays = monthDays.filter((d) => d.day_type === 'Present').length;
    const lateDays = monthDays.filter((d) => Number(d.late_minutes || 0) > 0).length;
    const absentDays = monthDays.filter((d) => d.day_type === 'Absence').length;
    const totalHoursWorked = monthDays.reduce((sum, d) => sum + Number(d.worked_hours || 0), 0);

    res.json({
      status: 'success',
      data: {
        leaveBalance: {
          annualRemaining,
          annualAllocated,
          annualTaken,
        },
        payday: {
          lastNetPay: lastPaidPayslip ? Number(lastPaidPayslip.net || 0).toFixed(2) : null,
          lastPayMonth: lastPaidPayslip
            ? new Date(lastPaidPayslip.pay_run.period_month).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
            : null,
          nextPayday: nextPayday.toISOString().slice(0, 10),
        },
        pendingRequestsCount: pendingLeaves + pendingOvertimes + pendingPunches,
        expiringDocumentsCount: expiringDocs.length,
        expiringDocuments: expiringDocs.map((d) => ({
          id: d.id,
          docType: d.doc_type,
          expiryDate: d.expiry_date,
          daysLeft: Math.ceil((new Date(d.expiry_date) - now) / (1000 * 60 * 60 * 24)),
        })),
        attendanceSummary: {
          presentDays,
          lateDays,
          absentDays,
          totalHoursWorked: Number(totalHoursWorked.toFixed(1)),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 2. View-only Profile for logged in employee with masked IDs
 */
export async function getMyProfile(req, res, next) {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.status(403).json({ status: 'error', message: 'User is not linked to an employee' });
    }

    const emp = await prisma.$base().employees.findUnique({
      where: { id: employeeId },
      include: {
        company: true,
        company_visa: true,
        branch: true,
        manager: true,
        contracts: {
          where: { status: { in: ['Active', 'Approved'] } },
          include: { job: true, department: true },
          orderBy: { version_no: 'desc' },
          take: 1,
        },
        bank_accounts: {
          where: { is_active: true },
        },
        documents: true,
      },
    });

    if (!emp) {
      return res.status(404).json({ status: 'error', message: 'Employee profile not found' });
    }

    const primaryContract = emp.contracts[0] || null;
    const primaryBank = emp.bank_accounts.find((b) => b.is_primary) || emp.bank_accounts[0] || null;

    const eidDoc = emp.documents.find(
      (d) => d.doc_type.toUpperCase().includes('EMIRATES') || d.doc_type.toUpperCase().includes('EID')
    );
    const passportDoc = emp.documents.find((d) => d.doc_type.toUpperCase().includes('PASSPORT'));

    const profileData = {
      id: emp.id,
      name: emp.name,
      arabic_name: emp.arabic_name || '—',
      employee_code: emp.employee_code,
      work_email: emp.work_email,
      mobile: emp.mobile,
      gender: emp.gender,
      nationality: emp.nationality,
      status: emp.status,
      joining_date: emp.joining_date,
      company: emp.company.name,
      visa: emp.company_visa.name,
      branch: emp.branch?.name || '—',
      manager: emp.manager?.name || '—',
      job_title: primaryContract?.job?.title || '—',
      department: primaryContract?.department?.name || '—',
      masked_national_id: eidDoc
        ? maskIdentityNumber('EMIRATES_ID', eidDoc.doc_number)
        : (emp.mohre_person_id ? maskIdentityNumber('EMIRATES_ID', emp.mohre_person_id) : '784-****-*******-1'),
      masked_passport: passportDoc
        ? maskIdentityNumber('PASSPORT', passportDoc.doc_number)
        : 'A******1',
      primary_bank: primaryBank
        ? {
            bank_name: primaryBank.bank_name,
            masked_iban: maskIban(primaryBank.iban),
          }
        : null,
    };

    res.json({ status: 'success', data: profileData });
  } catch (err) {
    next(err);
  }
}

/**
 * 3. Employee personal attendance
 */
export async function getMyAttendance(req, res, next) {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.json({ status: 'success', count: 0, data: [] });
    }

    const monthKey = req.query.month || toDubaiDateString(new Date()).slice(0, 7);
    const [y, m] = monthKey.split('-').map(Number);
    const startOfMonth = new Date(Date.UTC(y, m - 1, 1));
    const endOfMonth = new Date(Date.UTC(y, m, 0, 23, 59, 59));

    const days = await prisma.$base().attendance_days.findMany({
      where: {
        company_id: req.companyId,
        employee_id: employeeId,
        work_date: { gte: startOfMonth, lte: endOfMonth },
      },
      include: {
        shift: { select: { name: true, start_time: true, end_time: true } },
        public_holiday: { select: { name: true } },
        leave_request: { select: { leave_type: { select: { name: true } } } },
      },
      orderBy: { work_date: 'asc' },
    });

    res.json({ status: 'success', month: monthKey, count: days.length, data: days });
  } catch (err) {
    next(err);
  }
}

/**
 * 4. Employee personal leave balances & history
 */
export async function getMyLeave(req, res, next) {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.json({ status: 'success', data: { balances: [], request_history: [] } });
    }

    const data = await leaveService.getLeaveBalances({
      companyId: req.companyId,
      employeeId,
      year: req.query.year,
    });

    res.json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}

/**
 * 5. Employee combined requests & submission
 */
export async function getMyRequests(req, res, next) {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.json({ status: 'success', count: 0, data: [] });
    }

    const [leaves, overtimes, punchRequests] = await Promise.all([
      prisma.$base().leave_requests.findMany({
        where: { company_id: req.companyId, employee_id: employeeId },
        include: {
          leave_type: { select: { name: true, code: true } },
          approval_request: {
            include: {
              actions: {
                orderBy: { step_no: 'asc' },
                include: { actor: { select: { email: true } } },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.$base().overtime_requests.findMany({
        where: { company_id: req.companyId, employee_id: employeeId },
        include: {
          approval_request: {
            include: {
              actions: {
                orderBy: { step_no: 'asc' },
                include: { actor: { select: { email: true } } },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.$base().attendance_requests.findMany({
        where: { company_id: req.companyId, employee_id: employeeId },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    const formattedLeaves = leaves.map((l) => ({
      id: l.id,
      request_type: 'Leave',
      title: `${l.leave_type?.name || 'Leave'} (${l.days} days)`,
      date_from: l.date_from,
      date_to: l.date_to,
      status: l.status,
      actions: l.approval_request?.actions || [],
      created_at: l.created_at,
    }));

    const formattedOvertimes = overtimes.map((o) => ({
      id: o.id,
      request_type: 'Overtime',
      title: `${o.ot_type} (${o.hours}h)`,
      date: o.work_date,
      status: o.status,
      actions: o.approval_request?.actions || [],
      created_at: o.created_at,
    }));

    const formattedPunches = punchRequests.map((p) => ({
      id: p.id,
      request_type: 'MissingPunch',
      title: `Missing Punch for ${toDubaiDateString(p.work_date)}`,
      date: p.work_date,
      status: p.status,
      actions: [],
      created_at: p.created_at,
    }));

    const combined = [...formattedLeaves, ...formattedOvertimes, ...formattedPunches].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    res.json({ status: 'success', count: combined.length, data: combined });
  } catch (err) {
    next(err);
  }
}

export async function submitMyRequest(req, res, next) {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.status(400).json({ status: 'error', message: 'User is not linked to an employee record' });
    }

    const { type, ...payload } = req.body;

    if (type === 'Leave') {
      const result = await leaveService.requestLeave({
        companyId: req.companyId,
        employeeId,
        data: payload,
        userId: req.user.id,
      });
      return res.status(201).json({ status: 'success', data: result });
    }

    if (type === 'Overtime') {
      const result = await overtimeService.requestOvertime({
        companyId: req.companyId,
        employeeId,
        data: payload,
        userId: req.user.id,
      });
      return res.status(201).json({ status: 'success', data: result });
    }

    if (type === 'MissingPunch') {
      const reqRecord = await prisma.$base().attendance_requests.create({
        data: {
          company_id: req.companyId,
          employee_id: employeeId,
          work_date: new Date(payload.work_date),
          request_type: 'MissingPunch',
          requested_time: new Date(payload.requested_time),
          reason: payload.reason || 'Missing punch submitted by employee',
          status: 'Pending',
        },
      });
      return res.status(201).json({ status: 'success', data: reqRecord });
    }

    return res.status(400).json({ status: 'error', message: `Unknown request type: ${type}` });
  } catch (err) {
    next(err);
  }
}

/**
 * 6. Cancel pending request
 */
export async function cancelMyRequest(req, res, next) {
  try {
    const employeeId = req.user.employeeId;
    const { type, id } = req.params;

    if (!employeeId) {
      return res.status(403).json({ status: 'error', message: 'Not authorized' });
    }

    const normalizedType = type.toLowerCase();

    if (normalizedType === 'leave') {
      const item = await prisma.$base().leave_requests.findFirst({
        where: { id, employee_id: employeeId, company_id: req.companyId },
      });
      if (!item) {
        return res.status(404).json({ status: 'error', message: 'Request not found' });
      }
      if (item.status !== 'Pending' && item.status !== 'Approved') {
        return res.status(400).json({ status: 'error', message: 'Cannot cancel request in status: ' + item.status });
      }
      await leaveService.actOnLeave({
        companyId: req.companyId,
        id,
        action: 'Cancel',
        userId: req.user.id,
        user: req.user,
      });
      return res.json({ status: 'success', message: 'Request cancelled' });
    }

    if (normalizedType === 'overtime') {
      const item = await prisma.$base().overtime_requests.findFirst({
        where: { id, employee_id: employeeId, company_id: req.companyId },
      });
      if (!item) {
        return res.status(404).json({ status: 'error', message: 'Request not found' });
      }
      if (item.status !== 'Pending') {
        return res.status(400).json({ status: 'error', message: 'Cannot cancel non-pending request' });
      }
      await prisma.$base().overtime_requests.update({
        where: { id },
        data: { status: 'Cancelled' },
      });
      return res.json({ status: 'success', message: 'Request cancelled' });
    }

    if (normalizedType === 'missingpunch' || normalizedType === 'missing-punch' || normalizedType === 'attendance') {
      const item = await prisma.$base().attendance_requests.findFirst({
        where: { id, employee_id: employeeId, company_id: req.companyId },
      });
      if (!item) {
        return res.status(404).json({ status: 'error', message: 'Request not found' });
      }
      if (item.status !== 'Pending') {
        return res.status(400).json({ status: 'error', message: 'Cannot cancel non-pending request' });
      }
      await prisma.$base().attendance_requests.update({
        where: { id },
        data: { status: 'Cancelled' },
      });
      return res.json({ status: 'success', message: 'Request cancelled' });
    }

    return res.status(400).json({ status: 'error', message: `Unknown request type: ${type}` });
  } catch (err) {
    next(err);
  }
}

/**
 * 7. My Payslips: ONLY runs with status 'Paid'
 */
export async function getMyPayslips(req, res, next) {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.json({ status: 'success', count: 0, data: [] });
    }

    const payslips = await prisma.$base().payslips.findMany({
      where: {
        employee_id: employeeId,
        company_id: req.companyId,
        pay_run: { status: 'Paid' },
      },
      include: {
        pay_run: {
          select: {
            id: true,
            period_month: true,
            status: true,
            paid_at: true,
            payment_date: true,
          },
        },
      },
      orderBy: { pay_run: { period_month: 'desc' } },
    });

    const formatted = payslips.map((ps) => ({
      id: ps.id,
      pay_run_id: ps.pay_run_id,
      period_month: ps.pay_run.period_month.toISOString().slice(0, 7),
      status: ps.pay_run.status,
      paid_at: ps.pay_run.paid_at || ps.pay_run.payment_date,
      basic: Number(ps.basic || 0),
      gross: Number(ps.gross || 0),
      total_deductions: Number(ps.total_deductions || 0),
      net: Number(ps.net || 0),
    }));

    res.json({ status: 'success', count: formatted.length, data: formatted });
  } catch (err) {
    next(err);
  }
}

export async function getMyPayslipById(req, res, next) {
  try {
    const employeeId = req.user.employeeId;
    const { id } = req.params;
    if (!employeeId) {
      return res.status(403).json({ status: 'error', message: 'Not authorized' });
    }

    const payslip = await prisma.$base().payslips.findFirst({
      where: {
        id,
        employee_id: employeeId,
        company_id: req.companyId,
        pay_run: { status: 'Paid' },
      },
      include: {
        pay_run: true,
        lines: {
          include: { salary_rule: true },
          orderBy: [{ salary_rule: { sequence: 'asc' } }, { created_at: 'asc' }],
        },
        contract: {
          include: { job: true, department: true },
        },
        employee: {
          select: { id: true, name: true, arabic_name: true, employee_code: true },
        },
      },
    });

    if (!payslip) {
      return res.status(404).json({ status: 'error', message: 'Payslip not found or not yet released' });
    }

    res.json({ status: 'success', data: payslip });
  } catch (err) {
    next(err);
  }
}

export async function getMyPayslipPdf(req, res, next) {
  try {
    const employeeId = req.user.employeeId;
    const { id } = req.params;
    if (!employeeId) {
      return res.status(403).json({ status: 'error', message: 'Not authorized' });
    }

    const payslip = await prisma.$base().payslips.findFirst({
      where: {
        id,
        employee_id: employeeId,
        company_id: req.companyId,
      },
      include: { pay_run: true },
    });

    if (!payslip || payslip.pay_run?.status !== 'Paid') {
      return res.status(404).json({ status: 'error', message: 'Payslip not found or not yet released' });
    }

    const pdfBuffer = await payrollService.getPayslipPdf(req.companyId, id);

    // Audit log payslip PDF download
    await auditService.log({
      companyId: req.companyId,
      userId: req.user?.id || req.user?.userId,
      action: 'PAYSLIP_PDF_DOWNLOAD',
      tableName: 'payslips',
      recordId: payslip.id,
      newValues: { employeeId: payslip.employee_id, payRunId: payslip.pay_run_id },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="payslip-${payslip.id.slice(0, 8)}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

/**
 * 8. My Documents: view and upload renewed
 */
export async function getMyDocuments(req, res, next) {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.json({ status: 'success', count: 0, data: [] });
    }

    const docs = await prisma.$base().employee_documents.findMany({
      where: { company_id: req.companyId, employee_id: employeeId },
      orderBy: { expiry_date: 'asc' },
    });

    const now = new Date();
    const formatted = docs.map((d) => {
      const exp = new Date(d.expiry_date);
      const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
      let status = 'Valid';
      if (daysLeft < 0) status = 'Expired';
      else if (daysLeft <= 90) status = 'Expiring Soon';

      return {
        id: d.id,
        doc_type: d.doc_type,
        doc_number_masked: maskIdentityNumber(d.doc_type, d.doc_number),
        expiry_date: d.expiry_date,
        days_left: daysLeft,
        status: d.verified_at ? status : 'Pending Verification',
        is_verified: Boolean(d.verified_at),
        verified_at: d.verified_at,
        file_url: d.file_url || null,
        created_at: d.created_at,
      };
    });

    res.json({ status: 'success', count: formatted.length, data: formatted });
  } catch (err) {
    next(err);
  }
}

export async function uploadMyDocument(req, res, next) {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.status(403).json({ status: 'error', code: 'FORBIDDEN', message: 'User is not linked to an employee' });
    }

    let fileBuffer = req.file?.buffer;
    let originalName = req.file?.originalname;
    let mimeType = req.file?.mimetype;

    if (!fileBuffer && req.body.file_base64) {
      fileBuffer = Buffer.from(req.body.file_base64, 'base64');
      originalName = req.body.file_name || 'document.pdf';
      mimeType = req.body.mime_type;
    }

    if (!fileBuffer) {
      const err = new Error('No file uploaded');
      err.status = 400;
      err.code = 'NO_FILE';
      throw err;
    }

    const { doc_type, doc_number, expiry_date, issue_date } = req.body;
    const normalizedType = normalizeDocumentType(doc_type);
    if (!normalizedType || !isValidDocumentType(normalizedType)) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_DOCUMENT_TYPE',
        message: `Invalid document type '${doc_type}'. Allowed types: ${DOCUMENT_TYPES.join(', ')}`,
      });
    }

    const typeConfig = getDocumentTypeConfig(normalizedType);
    if (typeConfig.requiresExpiry && !expiry_date) {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: `Expiry date is required for document type '${normalizedType}'`,
      });
    }

    // Save with safe storage pipeline: magic bytes check, size limit, AES-256-GCM encryption at rest
    const saved = await storageService.saveFile({
      buffer: fileBuffer,
      originalName: originalName || 'document.pdf',
      mimeType,
    });

    const doc = await prisma.$base().employee_documents.create({
      data: {
        company_id: req.companyId,
        employee_id: employeeId,
        doc_type: normalizedType,
        doc_number: doc_number || (normalizedType === 'BANK_DETAILS' ? 'BANK-PROOF' : 'DOC-SELF'),
        issue_date: issue_date ? new Date(issue_date) : null,
        expiry_date: expiry_date ? new Date(expiry_date) : null,
        file_url: saved.storagePath,
        uploaded_by: req.user.id || req.user.userId,
        owner_id: req.user.id || req.user.userId,
        status: 'Pending Verification',
        verification_status: 'Pending',
      },
    });

    const safeAuditFileName = (normalizedType === 'BANK_DETAILS')
      ? 'BANK_DETAILS_DOCUMENT.pdf'
      : saved.fileName;

    await auditService.log({
      companyId: req.companyId,
      userId: req.user.id || req.user.userId,
      action: 'UploadDocument',
      tableName: 'employee_documents',
      recordId: doc.id,
      newValues: {
        doc_type: doc.doc_type,
        expiry_date: expiry_date || null,
        file_name: safeAuditFileName,
      },
    });

    // Notify HR Manager to verify
    try {
      const hrRole = await prisma.$base().roles.findUnique({ where: { code: 'HR_MANAGER' } });
      if (hrRole) {
        const hrUsers = await prisma.$base().user_roles.findMany({
          where: { company_id: req.companyId, role_id: hrRole.id },
          select: { user_id: true },
        });
        const emp = await prisma.$base().employees.findUnique({
          where: { id: employeeId },
          select: { name: true },
        });
        for (const u of hrUsers) {
          await notificationService.notifyApprovalWaiting(
            req.companyId,
            u.user_id,
            'Document Verification',
            emp?.name || 'Employee',
            '/employees'
          );
        }
      }
    } catch (e) {
      console.warn('Failed to dispatch HR verification notification:', e.message);
    }

    res.status(201).json({ status: 'success', data: doc });
  } catch (err) {
    next(err);
  }
}

export async function downloadMyDocument(req, res, next) {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.status(403).json({ status: 'error', code: 'FORBIDDEN', message: 'User is not linked to an employee' });
    }

    const docId = req.params.id;
    const doc = await prisma.$base().employee_documents.findUnique({
      where: { id: docId },
    });

    if (!doc || doc.company_id !== req.companyId || doc.employee_id !== employeeId) {
      const err = new Error('Document not found or does not belong to you');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (!doc.file_url) {
      const err = new Error('No physical file attached to this document');
      err.status = 404;
      err.code = 'FILE_NOT_FOUND';
      throw err;
    }

    const fileData = await storageService.getFile(doc.file_url);

    await auditService.log({
      companyId: req.companyId,
      userId: req.user.id || req.user.userId,
      action: 'DownloadDocument',
      tableName: 'employee_documents',
      recordId: doc.id,
      newValues: { doc_type: doc.doc_type },
    });

    res.setHeader('Content-Type', fileData.mimeType);
    res.setHeader('Content-Length', fileData.size);
    res.setHeader('Content-Disposition', `attachment; filename="${doc.doc_type.toLowerCase()}-${doc.id.slice(0, 8)}.pdf"`);

    fileData.stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

/**
 * 8. My Rejected Requests (Self-service personal rejection trail)
 */
export async function getMyRejections(req, res, next) {
  try {
    const companyId = req.companyId || req.user?.companyId;
    const userId = req.user?.id || req.user?.userId;
    const { search, requestType, startDate, endDate, page, limit } = req.query;

    const result = await rejectionService.getMyRejections({
      companyId,
      userId,
      search,
      requestType,
      startDate,
      endDate,
      page,
      limit,
      user: req.user,
    });

    res.status(200).json({
      status: 'success',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

export async function bulkUploadMyDocuments(req, res, next) {
  try {
    const employeeId = req.user.employeeId || req.user.employee_id;
    if (!employeeId) {
      return res.status(403).json({ status: 'error', message: 'User is not linked to an employee' });
    }
    const files = req.files || [];
    const result = await bulkDocumentService.processEmployeeSelfUpload({
      companyId: req.companyId,
      employeeId,
      files,
      viewer: req.user,
    });
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

export default {
  getMyHome,
  getMyProfile,
  getMyAttendance,
  getMyLeave,
  getMyRequests,
  submitMyRequest,
  cancelMyRequest,
  getMyPayslips,
  getMyPayslipById,
  getMyPayslipPdf,
  getMyDocuments,
  uploadMyDocument,
  downloadMyDocument,
  getMyRejections,
  bulkUploadMyDocuments,
};
