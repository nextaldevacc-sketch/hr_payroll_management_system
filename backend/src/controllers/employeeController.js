import employeeService from '../services/employeeService.js';
import { hasSalaryAccess } from '../serializers/index.js';

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
    if (!hasSalaryAccess(req.user)) {
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN_SALARY_ACCESS',
        message: 'Access denied: Managing contracts and salary is restricted to authorized salary roles',
      });
    }

    const data = await employeeService.createContractVersion({
      companyId: req.companyId,
      employeeId: req.params.id,
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

export default {
  listEmployees,
  createEmployee,
  getEmployeeMetaOptions,
  getEmployeeById,
  updateEmployee,
  updateEmployeeStatus,
  verifyEmployee,
  getActivationCheck,
  activateEmployee,
  getContracts,
  createContractVersion,
  getBankAccounts,
  saveBankAccount,
  getDocuments,
  uploadDocument,
  downloadDocument,
  getEmployeeHistory,
};
