import rejectionRepository from '../repositories/rejectionRepository.js';
import { toDubaiDateString } from '@nextal/shared';

const SALARY_ROLES = ['PAYROLL_OFFICER', 'HR_MANAGER', 'GM', 'FINANCE'];

export class RejectionService {
  constructor(repo = rejectionRepository) {
    this.repo = repo;
  }

  /**
   * Record a new immutable rejection in the audit log
   */
  async recordRejection(data, tx = null) {
    const {
      company_id,
      approval_request_id = null,
      request_type,
      record_id,
      record_title = null,
      requester_id = null,
      rejected_by_id,
      step_no = 1,
      reason,
      rejection_type = 'REJECT',
      rejection_date = null,
    } = data;

    if (!company_id || !request_type || !record_id || !rejected_by_id) {
      const err = new Error('company_id, request_type, record_id, and rejected_by_id are required');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
      const err = new Error('Rejection reason must be at least 10 characters long');
      err.status = 400;
      err.code = 'REASON_REQUIRED';
      throw err;
    }

    return this.repo.createRejection(
      {
        company_id,
        approval_request_id,
        request_type,
        record_id,
        record_title,
        requester_id,
        rejected_by_id,
        step_no,
        reason: reason.trim(),
        rejection_type,
        rejection_date,
      },
      tx
    );
  }

  /**
   * Helper to determine if user can view unmasked salary details
   */
  _canViewSalary(user) {
    if (!user) return false;
    const roles = user.roles || [];
    return roles.some((r) => SALARY_ROLES.includes(r));
  }

  /**
   * Mask salary numbers in text for non-salary roles
   */
  _maskSalaryText(text) {
    if (!text || typeof text !== 'string') return text;
    // Masks currency patterns like AED 15,000.00, AED15000, 15,000 AED
    return text
      .replace(/\b(AED\s*[\d,]+(\.\d{1,2})?)/gi, 'AED ***')
      .replace(/([\d,]+(\.\d{1,2})?\s*AED)\b/gi, '*** AED')
      .replace(/(\bSalary:\s*[\d,]+(\.\d{1,2})?)/gi, 'Salary: ***');
  }

  _sanitizeRejection(rejection, canViewSalary) {
    if (canViewSalary) return rejection;
    return {
      ...rejection,
      record_title: this._maskSalaryText(rejection.record_title),
      reason: this._maskSalaryText(rejection.reason),
    };
  }

  /**
   * Query rejections with pagination, filtering, and salary masking
   */
  async listRejections({
    companyId,
    search = '',
    requestType = null,
    startDate = null,
    endDate = null,
    page = 1,
    limit = 20,
    user = null,
  }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Scope check: If caller is purely EMPLOYEE, only show their own rejections
    const roles = user?.roles || [];
    const isStaffOnly = roles.length === 1 && roles[0] === 'EMPLOYEE';
    const requesterId = isStaffOnly ? user?.userId : null;

    const [items, total] = await Promise.all([
      this.repo.findRejections({
        companyId,
        search,
        requestType,
        startDate,
        endDate,
        requesterId,
        skip,
        take: limitNum,
      }),
      this.repo.countRejections({
        companyId,
        search,
        requestType,
        startDate,
        endDate,
        requesterId,
      }),
    ]);

    const canViewSalary = this._canViewSalary(user);
    const sanitizedItems = items.map((item) => {
      const sanitized = this._sanitizeRejection(item, canViewSalary);
      return {
        ...sanitized,
        rejection_date_dubai: toDubaiDateString(item.rejection_date || item.created_at),
      };
    });

    return {
      data: sanitizedItems,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  async getRejection(companyId, id, user = null) {
    const rejection = await this.repo.findRejectionById(companyId, id);
    if (!rejection) {
      const err = new Error('Rejection record not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    // Scope check for purely EMPLOYEE role
    const roles = user?.roles || [];
    const isStaffOnly = roles.length === 1 && roles[0] === 'EMPLOYEE';
    if (isStaffOnly && rejection.requester_id !== user?.userId) {
      const err = new Error('Rejection record not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const canViewSalary = this._canViewSalary(user);
    const sanitized = this._sanitizeRejection(rejection, canViewSalary);
    return {
      ...sanitized,
      rejection_date_dubai: toDubaiDateString(rejection.rejection_date || rejection.created_at),
    };
  }

  /**
   * Export rejections to CSV format
   */
  async exportCsv({
    companyId,
    search = '',
    requestType = null,
    startDate = null,
    endDate = null,
    user = null,
  }) {
    const roles = user?.roles || [];
    const isStaffOnly = roles.length === 1 && roles[0] === 'EMPLOYEE';
    const requesterId = isStaffOnly ? user?.userId : null;

    const items = await this.repo.findRejections({
      companyId,
      search,
      requestType,
      startDate,
      endDate,
      requesterId,
      skip: 0,
      take: 5000,
    });

    const canViewSalary = this._canViewSalary(user);

    const headers = [
      'Rejection ID',
      'Date (Asia/Dubai)',
      'Request Type',
      'Record Title',
      'Rejection Type',
      'Step No',
      'Rejected By',
      'Requester',
      'Reason',
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const text = String(str).replace(/"/g, '""');
      return `"${text}"`;
    };

    const rows = items.map((r) => {
      const sanitized = this._sanitizeRejection(r, canViewSalary);
      const rejectedByName =
        sanitized.rejected_by?.employee?.name || sanitized.rejected_by?.email || 'System';
      const requesterName =
        sanitized.requester?.employee?.name || sanitized.requester?.email || 'N/A';
      const dubaiDate = toDubaiDateString(r.rejection_date || r.created_at);

      return [
        escapeCsv(sanitized.id),
        escapeCsv(dubaiDate),
        escapeCsv(sanitized.request_type),
        escapeCsv(sanitized.record_title || 'N/A'),
        escapeCsv(sanitized.rejection_type),
        escapeCsv(sanitized.step_no),
        escapeCsv(rejectedByName),
        escapeCsv(requesterName),
        escapeCsv(sanitized.reason),
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\r\n');
  }
}

export default new RejectionService();
