import rejectionRepository from '../repositories/rejectionRepository.js';
import { toDubaiDateString } from '@nextal/shared';
import { scopeService } from './scopeService.js';

const SALARY_ROLES = ['PAYROLL_OFFICER', 'HR_MANAGER', 'GM', 'FINANCE'];
const COMPANY_LOG_ROLES = ['HR_OFFICER', 'HR_MANAGER', 'GM', 'COMPANY_ADMIN'];

export class RejectionService {
  constructor(repo = rejectionRepository) {
    this.repo = repo;
  }

  /**
   * Enforce company-wide rejection log access (defence-in-depth)
   */
  _assertCompanyLogAccess(user) {
    if (!user) {
      const err = new Error('Authentication required');
      err.status = 401;
      err.code = 'UNAUTHORIZED';
      throw err;
    }
    if (user.isPlatformAdmin || user.roles?.includes('PLATFORM_ADMIN')) {
      return;
    }
    const roles = user.roles || (user.role ? [user.role] : []);
    const isAllowed = roles.some((r) => COMPANY_LOG_ROLES.includes(r));
    if (!isAllowed) {
      const err = new Error('Access denied to company-wide rejection log');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }
  }

  /**
   * Check if a single rejection is within viewer's data scope
   */
  async _isRejectionInScope(rejection, scope, companyId) {
    if (!scope || scope.all) return true;

    // 1. Check requester employee's visa / branch
    const reqEmp = rejection.requester?.employee;
    if (reqEmp) {
      if (scope.visaIds?.length > 0 && scope.visaIds.includes(reqEmp.company_visa_id)) {
        return true;
      }
      if (scope.branchIds?.length > 0 && scope.branchIds.includes(reqEmp.branch_id)) {
        return true;
      }
    }

    // 2. Check underlying record
    if (rejection.record_id) {
      const client = this.repo.getClient();
      // Check if record_id is an employee
      const emp = await client.employees.findUnique({
        where: { id: rejection.record_id },
        select: { company_visa_id: true, branch_id: true },
      });
      if (emp) {
        if (scope.visaIds?.length > 0 && scope.visaIds.includes(emp.company_visa_id)) {
          return true;
        }
        if (scope.branchIds?.length > 0 && scope.branchIds.includes(emp.branch_id)) {
          return true;
        }
      }

      // Check if record_id is a leave request
      if (rejection.request_type === 'LEAVE') {
        const lr = await client.leave_requests.findUnique({
          where: { id: rejection.record_id },
          select: { employee: { select: { company_visa_id: true, branch_id: true } } },
        });
        if (lr?.employee) {
          if (scope.visaIds?.length > 0 && scope.visaIds.includes(lr.employee.company_visa_id)) {
            return true;
          }
          if (scope.branchIds?.length > 0 && scope.branchIds.includes(lr.employee.branch_id)) {
            return true;
          }
        }
      }
    }

    return false;
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
   * Query company-wide rejections with pagination, filtering, data scoping, and salary masking
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
    this._assertCompanyLogAccess(user);

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const scope = scopeService.resolveDataScope(user);
    const scopedRecordIds = await this.repo.resolveScopedRecordIds(companyId, scope);

    const [items, total] = await Promise.all([
      this.repo.findRejections({
        companyId,
        search,
        requestType,
        startDate,
        endDate,
        scope,
        scopedRecordIds,
        skip,
        take: limitNum,
      }),
      this.repo.countRejections({
        companyId,
        search,
        requestType,
        startDate,
        endDate,
        scope,
        scopedRecordIds,
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
    this._assertCompanyLogAccess(user);

    const rejection = await this.repo.findRejectionById(companyId, id);
    if (!rejection) {
      const err = new Error('Rejection record not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const scope = scopeService.resolveDataScope(user);
    if (!scope.all) {
      const inScope = await this._isRejectionInScope(rejection, scope, companyId);
      if (!inScope) {
        const err = new Error('Rejection record not found');
        err.status = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }
    }

    const canViewSalary = this._canViewSalary(user);
    const sanitized = this._sanitizeRejection(rejection, canViewSalary);
    return {
      ...sanitized,
      rejection_date_dubai: toDubaiDateString(rejection.rejection_date || rejection.created_at),
    };
  }

  /**
   * Export rejections to CSV format (restricted to company log roles)
   */
  async exportCsv({
    companyId,
    search = '',
    requestType = null,
    startDate = null,
    endDate = null,
    user = null,
  }) {
    this._assertCompanyLogAccess(user);

    const scope = scopeService.resolveDataScope(user);
    const scopedRecordIds = await this.repo.resolveScopedRecordIds(companyId, scope);

    const items = await this.repo.findRejections({
      companyId,
      search,
      requestType,
      startDate,
      endDate,
      scope,
      scopedRecordIds,
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

  /**
   * Self-service rejection log: returns rejections requested by the current user
   */
  async getMyRejections({
    companyId,
    userId,
    search = '',
    requestType = null,
    startDate = null,
    endDate = null,
    page = 1,
    limit = 20,
    user = null,
  }) {
    const requesterId = userId || user?.id || user?.userId;
    if (!requesterId) {
      const err = new Error('User identity is required');
      err.status = 401;
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

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
}

export default new RejectionService();
