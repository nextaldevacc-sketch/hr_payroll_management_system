import employeeService from '../services/employeeService.js';
import { hasSalaryAccess } from '../serializers/index.js';
import auditService from '../services/auditService.js';
import prisma from '../lib/prisma.js';
import scopeService from '../services/scopeService.js';

export async function listEmployees(req, res, next) {
  try {
    const result = await employeeService.listEmployees({
      companyId: req.companyId,
      query: req.query,
      viewer: req.user,
    });

    res.json({
      status: 'success',
      data: result.data,
      meta: result.meta,
    });
  } catch (err) {
    next(err);
  }
}

export async function createEmployee(req, res, next) {
  try {
    const data = await employeeService.createEmployee({
      companyId: req.companyId,
      data: req.body,
      viewer: req.user,
    });

    res.status(201).json({
      status: 'success',
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function getEmployeeMetaOptions(req, res, next) {
  try {
    const data = await employeeService.getEmployeeMetaOptions({
      companyId: req.companyId,
    });
    res.json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}

export async function getNextEmployeeCode(req, res, next) {
  try {
    const code = await employeeService.getNextEmployeeCode({
      companyId: req.companyId,
    });
    res.json({ status: 'success', data: { next_employee_code: code } });
  } catch (err) {
    next(err);
  }
}

export async function getEmployeeById(req, res, next) {
  try {
    const data = await employeeService.getEmployeeById({
      companyId: req.companyId,
      employeeId: req.params.id,
      viewer: req.user,
    });

    res.json({
      status: 'success',
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateEmployee(req, res, next) {
  try {
    const data = await employeeService.updateEmployee({
      companyId: req.companyId,
      employeeId: req.params.id,
      data: req.body,
      viewer: req.user,
    });

    res.json({
      status: 'success',
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateEmployeeStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({
        status: 'error',
        code: 'MISSING_STATUS',
        message: 'Status field is required',
      });
    }

    const data = await employeeService.updateEmployeeStatus({
      companyId: req.companyId,
      employeeId: req.params.id,
      targetStatus: status,
      viewer: req.user,
    });

    res.json({
      status: 'success',
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmployee(req, res, next) {
  try {
    const { action, comment } = req.body;
    const data = await employeeService.verifyEmployee({
      companyId: req.companyId,
      employeeId: req.params.id,
      action: action || 'APPROVE',
      comment,
      viewer: req.user,
    });

    res.json({
      status: 'success',
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function getActivationCheck(req, res, next) {
  try {
    const data = await employeeService.getActivationCheck({
      companyId: req.companyId,
      employeeId: req.params.id,
    });

    res.json({
      status: 'success',
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function activateEmployee(req, res, next) {
  try {
    const data = await employeeService.activateEmployee({
      companyId: req.companyId,
      employeeId: req.params.id,
      viewer: req.user,
    });

    res.json({
      status: 'success',
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function createEmployeeLogin(req, res, next) {
  try {
    const data = await employeeService.createEmployeeLogin(
      req.companyId,
      req.params.id,
      req.user
    );

    res.status(201).json({
      status: 'success',
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function getContracts(req, res, next) {
  try {
    if (!hasSalaryAccess(req.user)) {
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN_SALARY_ACCESS',
        message: 'Access denied: Salary History is restricted to authorized salary roles',
      });
    }

    const data = await employeeService.getContracts({
      companyId: req.companyId,
      employeeId: req.params.id,
      viewer: req.user,
    });

    res.json({
      status: 'success',
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function createContractVersion(req, res, next) {
  try {
    const roles = req.user?.roles || [];
    if (!roles.includes('PAYROLL_OFFICER')) {
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN_SALARY_ACCESS',
        message: 'Access denied: Only Payroll Officer can create contract versions (Section 5.3).',
      });
    }

    const data = await employeeService.createContractVersion({
      companyId: req.companyId,
      employeeId: req.params.id,
      data: { ...req.body, status: req.body.status || 'Pending' },
      viewer: req.user,
    });

    res.status(201).json({
      status: 'success',
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function approveContractVersion(req, res, next) {
  try {
    const roles = req.user?.roles || [];
    if (!roles.includes('HR_MANAGER')) {
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'Access denied: Only HR Manager can approve contract versions (Section 5.3).',
      });
    }

    const data = await employeeService.approveContractVersion({
      companyId: req.companyId,
      employeeId: req.params.id,
      contractId: req.params.contractId,
      viewer: req.user,
    });

    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function rejectContractVersion(req, res, next) {
  try {
    const roles = req.user?.roles || [];
    if (!roles.includes('HR_MANAGER')) {
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'Access denied: Only HR Manager can reject contract versions (Section 5.3).',
      });
    }

    const data = await employeeService.rejectContractVersion({
      companyId: req.companyId,
      employeeId: req.params.id,
      contractId: req.params.contractId,
      viewer: req.user,
      reason: req.body?.reason,
    });

    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function getBankAccounts(req, res, next) {
  try {
    if (!hasSalaryAccess(req.user)) {
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN_SALARY_ACCESS',
        message: 'Access denied: Bank details are restricted to authorized salary roles',
      });
    }

    const data = await employeeService.getBankAccounts({
      companyId: req.companyId,
      employeeId: req.params.id,
      viewer: req.user,
    });

    res.json({
      status: 'success',
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function saveBankAccount(req, res, next) {
  try {
    if (!hasSalaryAccess(req.user)) {
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN_SALARY_ACCESS',
        message: 'Access denied: Managing bank details is restricted to authorized salary roles',
      });
    }

    const data = await employeeService.saveBankAccount({
      companyId: req.companyId,
      employeeId: req.params.id,
      data: req.body,
      viewer: req.user,
    });

    res.json({
      status: 'success',
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function getDocuments(req, res, next) {
  try {
    const data = await employeeService.getDocuments({
      companyId: req.companyId,
      employeeId: req.params.id,
      viewer: req.user,
    });

    res.json({
      status: 'success',
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function uploadDocument(req, res, next) {
  try {
    let fileBuffer = req.file?.buffer;
    let originalName = req.file?.originalname;
    let mimeType = req.file?.mimetype;

    if (!fileBuffer && req.body.file_base64) {
      fileBuffer = Buffer.from(req.body.file_base64, 'base64');
      originalName = req.body.file_name || 'document.pdf';
      mimeType = req.body.mime_type;
    }

    const meta = {
      doc_type: req.body.doc_type,
      doc_number: req.body.doc_number,
      issue_date: req.body.issue_date,
      expiry_date: req.body.expiry_date,
      owner_id: req.body.owner_id,
    };

    const data = await employeeService.uploadDocument({
      companyId: req.companyId,
      employeeId: req.params.id,
      file: { buffer: fileBuffer, originalname: originalName, mimetype: mimeType },
      meta,
      viewer: req.user,
    });

    res.status(201).json({
      status: 'success',
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function downloadDocument(req, res, next) {
  try {
    const fileData = await employeeService.downloadDocument({
      companyId: req.companyId,
      employeeId: req.params.id,
      documentId: req.params.docId,
      viewer: req.user,
    });

    res.setHeader('Content-Type', fileData.mimeType);
    res.setHeader('Content-Length', fileData.size);
    res.setHeader('Content-Disposition', `attachment; filename="${fileData.fileName}"`);

    fileData.stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

export async function getEmployeeHistory(req, res, next) {
  try {
    const data = await employeeService.getEmployeeHistory({
      companyId: req.companyId,
      employeeId: req.params.id,
      viewer: req.user,
    });

    res.json({
      status: 'success',
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function requestBranchChange(req, res, next) {
  try {
    const { target_branch_id, effective_date, reason } = req.body;
    const data = await employeeService.requestBranchChange({
      companyId: req.companyId,
      employeeId: req.params.id,
      targetBranchId: target_branch_id,
      effectiveDate: effective_date,
      reason,
      requestedBy: req.user.id,
    });
    res.json({ status: 'success', message: 'Branch change request submitted for HR approval', data });
  } catch (err) {
    next(err);
  }
}

export async function revealSensitiveField(req, res, next) {
  try {
    const { field } = req.body;
    const employeeId = req.params.id;
    const userId = req.user?.id || req.user?.userId;
    const companyId = req.companyId;

    // 1. Whitelist allowed fields to reveal: emirates_id, passport_number, iban, basic_salary
    const ALLOWED_FIELDS = ['emirates_id', 'passport_number', 'iban', 'basic_salary'];
    if (!field || typeof field !== 'string' || !ALLOWED_FIELDS.includes(field)) {
      const err = new Error(`Invalid field '${field}'. Allowed fields: ${ALLOWED_FIELDS.join(', ')}`);
      err.status = 400;
      err.code = 'INVALID_FIELD';
      throw err;
    }

    // 2. Scope check: target employee must be in the caller's company AND within their data scope (visa/branch/department)
    // Never reveal record existence to out-of-scope callers (returns 404 NOT_FOUND)
    const employee = await prisma.$base().employees.findUnique({
      where: { id: employeeId },
      include: {
        contracts: {
          where: { status: { in: ['Approved', 'Active'] } },
          orderBy: { effective_date: 'desc' },
        },
      },
    });

    if (!employee || employee.company_id !== companyId) {
      const err = new Error('Employee not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const scope = scopeService.resolveDataScope(req.user);
    scopeService.assertEmployeeInScope(employee, scope);

    // 3. RBAC check before revealing:
    // basic_salary: only revealed to SALARY_ROLES (HR_MANAGER, PAYROLL_OFFICER, GM, FINANCE). HR_OFFICER and DEPT_MANAGER CANNOT reveal salary.
    // Identification fields (emirates_id, passport_number, iban): caller must have HR_OFFICER, HR_MANAGER, PAYROLL_OFFICER, GM, or FINANCE.
    const SALARY_ROLES = ['HR_MANAGER', 'PAYROLL_OFFICER', 'GM', 'FINANCE'];
    const IDENTIFICATION_ROLES = ['HR_OFFICER', 'HR_MANAGER', 'PAYROLL_OFFICER', 'GM', 'FINANCE', 'COMPANY_ADMIN'];

    const userRoles = req.user?.roles || [];

    if (field === 'basic_salary') {
      const hasSalaryRole = userRoles.some((r) => SALARY_ROLES.includes(r));
      if (!hasSalaryRole) {
        const err = new Error('Permission denied: You do not have permission to reveal salary fields');
        err.status = 403;
        err.code = 'FORBIDDEN_SALARY_ACCESS';
        throw err;
      }
    } else {
      const hasIdRole = userRoles.some((r) => IDENTIFICATION_ROLES.includes(r));
      if (!hasIdRole) {
        const err = new Error('Permission denied: You do not have permission to reveal sensitive identity fields');
        err.status = 403;
        err.code = 'FORBIDDEN_ID_ACCESS';
        throw err;
      }
    }

    // 4. Retrieve field value and determine target table
    let value = null;
    let tableName = 'employees';

    if (field === 'basic_salary') {
      tableName = 'contracts';
      const contract =
        employee.contracts?.[0] ||
        (await prisma.$base().contracts.findFirst({
          where: { employee_id: employeeId, company_id: companyId, status: { in: ['Approved', 'Active'] } },
          orderBy: { effective_date: 'desc' },
        }));
      value = contract ? Number(contract.basic ?? contract.basic_salary) : null;
    } else if (field === 'iban') {
      tableName = 'bank_accounts';
      const bankAccount =
        (await prisma.$base().bank_accounts.findFirst({
          where: { employee_id: employeeId, company_id: companyId, is_primary: true },
        })) ||
        (await prisma.$base().bank_accounts.findFirst({
          where: { employee_id: employeeId, company_id: companyId },
        }));
      value = bankAccount ? bankAccount.iban : null;
    } else if (field === 'emirates_id') {
      tableName = 'employee_documents';
      const doc = await prisma.$base().employee_documents.findFirst({
        where: {
          employee_id: employeeId,
          company_id: companyId,
          doc_type: { in: ['EMIRATES_ID', 'Emirates ID', 'EID'] },
        },
      });
      value = doc ? doc.doc_number : null;
    } else if (field === 'passport_number') {
      tableName = 'employee_documents';
      const doc = await prisma.$base().employee_documents.findFirst({
        where: {
          employee_id: employeeId,
          company_id: companyId,
          doc_type: { in: ['PASSPORT', 'Passport'] },
        },
      });
      value = doc ? doc.doc_number : null;
    }

    // 5. Audit log: EVERY reveal MUST write an audit row: action: 'REVEAL_FIELD', tableName, recordId, metadata: { field, ip, user_id }
    await auditService.log({
      companyId,
      userId,
      action: 'REVEAL_FIELD',
      tableName,
      recordId: employeeId,
      newValues: {
        field,
        ip: req.ip,
        user_id: userId,
        metadata: { field, ip: req.ip, user_id: userId },
        revealedAt: new Date().toISOString(),
      },
      ipAddress: req.ip,
    });

    res.json({
      status: 'success',
      field,
      value,
      message: `Field ${field} revealed successfully`,
    });
  } catch (err) {
    next(err);
  }
}

export default {
  listEmployees,
  createEmployee,
  getEmployeeMetaOptions,
  getNextEmployeeCode,
  getEmployeeById,
  updateEmployee,
  updateEmployeeStatus,
  requestBranchChange,
  verifyEmployee,
  getActivationCheck,
  activateEmployee,
  createEmployeeLogin,
  getContracts,
  createContractVersion,
  approveContractVersion,
  rejectContractVersion,
  getBankAccounts,
  saveBankAccount,
  getDocuments,
  uploadDocument,
  downloadDocument,
  getEmployeeHistory,
  revealSensitiveField,
};
