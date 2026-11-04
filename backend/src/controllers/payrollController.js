import payrollService from '../services/payrollService.js';
import auditService from '../services/auditService.js';
import { SALARY_ROLES } from '../middleware/permissions.js';

export async function listPayRuns(req, res, next) {
  try {
    const { companyVisaId, company_visa_id, periodMonth, status, limit, offset } = req.query;
    const result = await payrollService.listPayRuns(req.companyId, {
      companyVisaId: companyVisaId || company_visa_id,
      periodMonth,
      status,
      limit,
      offset,
    });
    res.json({ status: 'success', data: result.items, total: result.total });
  } catch (err) {
    next(err);
  }
}

export async function getPayRun(req, res, next) {
  try {
    const payRun = await payrollService.getPayRun(req.companyId, req.params.id);
    res.json({ status: 'success', data: payRun });
  } catch (err) {
    next(err);
  }
}

export async function listPayRunPayslips(req, res, next) {
  try {
    const { search, hasVariance, limit, offset } = req.query;
    const result = await payrollService.listPayRunPayslips(req.companyId, req.params.id, {
      search,
      hasVariance,
      limit,
      offset,
    });
    res.json({ status: 'success', data: result.items, total: result.total });
  } catch (err) {
    next(err);
  }
}

export async function listPayRunIssues(req, res, next) {
  try {
    const { severity, resolved } = req.query;
    const issues = await payrollService.listPayRunIssues(req.companyId, req.params.id, {
      severity,
      resolved,
    });
    res.json({ status: 'success', data: issues });
  } catch (err) {
    next(err);
  }
}

export async function createPayRun(req, res, next) {
  try {
    const payRun = await payrollService.createPayRun(req.companyId, req.body, req.user?.id);
    res.status(201).json({ status: 'success', data: payRun });
  } catch (err) {
    next(err);
  }
}

export async function calculatePayRun(req, res, next) {
  try {
    const payRun = await payrollService.calculatePayRun(req.companyId, req.params.id, req.user?.id);
    res.json({ status: 'success', message: 'Pay run calculated successfully', data: payRun });
  } catch (err) {
    next(err);
  }
}

export async function validatePayRun(req, res, next) {
  try {
    const payRun = await payrollService.validatePayRun(req.companyId, req.params.id, req.user?.id);
    res.json({ status: 'success', message: 'Pay run validated successfully', data: payRun });
  } catch (err) {
    next(err);
  }
}

export async function lockPayRun(req, res, next) {
  try {
    const payRun = await payrollService.lockPayRun(req.companyId, req.params.id, req.user?.id);
    res.json({ status: 'success', message: 'Pay run locked successfully', data: payRun });
  } catch (err) {
    next(err);
  }
}

export async function markPayRunPaid(req, res, next) {
  try {
    const payRun = await payrollService.markPayRunPaid(req.companyId, req.params.id, req.user?.id);
    res.json({ status: 'success', message: 'Pay run marked as paid successfully', data: payRun });
  } catch (err) {
    next(err);
  }
}

export async function getPayslip(req, res, next) {
  try {
    const payslip = await payrollService.getPayslip(req.companyId, req.params.id);

    // Authorization check (P1)
    const roles = req.user?.roles || [];
    const isSalaryRole = roles.some((r) => SALARY_ROLES.includes(r));
    const isOwner = Boolean(req.user?.employeeId && req.user.employeeId === payslip.employee_id);
    const isPaid = payslip.pay_run?.status === 'Paid';

    if (!isSalaryRole && !(isOwner && isPaid)) {
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN_PAYSLIP_ACCESS',
        message: 'Access denied: Payslips can only be viewed by authorized salary roles or by the employee once the pay run is Paid.',
      });
    }

    res.json({ status: 'success', data: payslip });
  } catch (err) {
    next(err);
  }
}

export async function updateVarianceReason(req, res, next) {
  try {
    const payslip = await payrollService.updateVarianceReason(
      req.companyId,
      req.params.id,
      req.body.reason,
      req.user?.id
    );
    res.json({ status: 'success', message: 'Variance justification saved', data: payslip });
  } catch (err) {
    next(err);
  }
}

export async function exportSif(req, res, next) {
  try {
    const sifData = await payrollService.getPayRunSif(req.companyId, req.params.id);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${sifData.filename}"`);
    res.send(sifData.content);
  } catch (err) {
    next(err);
  }
}

export async function downloadPayslipPdf(req, res, next) {
  try {
    const payslip = await payrollService.getPayslip(req.companyId, req.params.id);

    // Authorization check (P1)
    const roles = req.user?.roles || [];
    const isSalaryRole = roles.some((r) => SALARY_ROLES.includes(r));
    const isOwner = Boolean(req.user?.employeeId && req.user.employeeId === payslip.employee_id);
    const isPaid = payslip.pay_run?.status === 'Paid';

    if (!isSalaryRole && !(isOwner && isPaid)) {
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN_PAYSLIP_ACCESS',
        message: 'Access denied: Payslips can only be downloaded by authorized salary roles or by the employee once the pay run is Paid.',
      });
    }

    const pdfBuffer = await payrollService.getPayslipPdf(req.companyId, req.params.id);

    // Audit log payslip PDF download (P1)
    await auditService.log({
      companyId: req.companyId,
      userId: req.user?.id || req.user?.userId,
      action: 'PAYSLIP_PDF_DOWNLOAD',
      tableName: 'payslips',
      recordId: payslip.id,
      newValues: { employeeId: payslip.employee_id, payRunId: payslip.pay_run_id },
    }).catch(() => {});

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="payslip-${req.params.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

export async function downloadPayrollRegisterExcel(req, res, next) {
  try {
    const excelBuffer = await payrollService.getPayrollRegisterExcel(req.companyId, req.params.id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="payroll-register-${req.params.id}.xlsx"`);
    res.send(excelBuffer);
  } catch (err) {
    next(err);
  }
}

export async function downloadVarianceReportExcel(req, res, next) {
  try {
    const excelBuffer = await payrollService.getVarianceReportExcel(req.companyId, req.params.id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="payroll-variance-${req.params.id}.xlsx"`);
    res.send(excelBuffer);
  } catch (err) {
    next(err);
  }
}

export async function getPayrollOverview(req, res, next) {
  try {
    const result = await payrollService.listPayRuns(req.companyId);
    res.json({
      status: 'success',
      count: result.total,
      data: result.items,
    });
  } catch (err) {
    next(err);
  }
}

export default {
  getPayrollOverview,
  listPayRuns,
  getPayRun,
  listPayRunPayslips,
  listPayRunIssues,
  createPayRun,
  calculatePayRun,
  validatePayRun,
  lockPayRun,
  markPayRunPaid,
  getPayslip,
  updateVarianceReason,
  exportSif,
  downloadPayslipPdf,
  downloadPayrollRegisterExcel,
  downloadVarianceReportExcel,
};
