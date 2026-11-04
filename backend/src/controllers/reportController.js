import reportService from '../services/reportService.js';
import { generatePayrollRegisterExcel, generateVarianceReportExcel } from '../lib/reports/payrollReportGenerator.js';
import prisma from '../lib/prisma.js';

export const reportController = {
  /**
   * 1. Attendance Report (Excel)
   */
  async downloadAttendanceReport(req, res, next) {
    try {
      const companyId = req.companyId;
      const { month, department_id, company_visa_id, companyVisaId } = req.query;

      const buffer = await reportService.generateAttendanceReportExcel({
        companyId,
        month,
        departmentId: department_id || null,
        companyVisaId: company_visa_id || companyVisaId || null,
      });

      const filename = `attendance_report_${month || new Date().toISOString().slice(0, 7)}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  },

  /**
   * 2. Leave Report (Excel)
   */
  async downloadLeaveReport(req, res, next) {
    try {
      const companyId = req.companyId;
      const { year, department_id, leave_type_id, company_visa_id, companyVisaId } = req.query;

      const buffer = await reportService.generateLeaveReportExcel({
        companyId,
        year,
        departmentId: department_id || null,
        leaveTypeId: leave_type_id || null,
        companyVisaId: company_visa_id || companyVisaId || null,
      });

      const targetYear = year || new Date().getUTCFullYear();
      const filename = `leave_report_${targetYear}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  },

  /**
   * 3. Headcount & Attrition (Dashboard JSON + Excel download)
   */
  async getHeadcountData(req, res, next) {
    try {
      const companyId = req.companyId;
      const { year, company_visa_id, companyVisaId } = req.query;
      const data = await reportService.getHeadcountReportData({
        companyId,
        year,
        companyVisaId: company_visa_id || companyVisaId || null,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async downloadHeadcountReport(req, res, next) {
    try {
      const companyId = req.companyId;
      const { year, company_visa_id, companyVisaId } = req.query;

      const buffer = await reportService.generateHeadcountReportExcel({
        companyId,
        year,
        companyVisaId: company_visa_id || companyVisaId || null,
      });

      const targetYear = year || new Date().getUTCFullYear();
      const filename = `headcount_attrition_report_${targetYear}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  },

  /**
   * 4. Accounting Export (CSV)
   * Only allowed for Locked/Paid runs; debits strictly equal credits
   */
  async downloadAccountingExport(req, res, next) {
    try {
      const companyId = req.companyId;
      const { payRunId } = req.query;

      if (!payRunId) {
        const err = new Error('payRunId query parameter is required');
        err.status = 400;
        throw err;
      }

      const exportResult = await reportService.generateAccountingExportCsv({
        companyId,
        payRunId,
      });

      const filename = `accounting_export_${exportResult.period}_${payRunId.slice(0, 8)}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(exportResult.csv);
    } catch (err) {
      next(err);
    }
  },

  /**
   * 5. Gratuity Provision (Excel)
   */
  async downloadGratuityProvision(req, res, next) {
    try {
      const companyId = req.companyId;
      const { asOfDate } = req.query;

      const buffer = await reportService.generateGratuityProvisionExcel({
        companyId,
        asOfDate: asOfDate ? new Date(asOfDate) : new Date(),
      });

      const dateStr = asOfDate || new Date().toISOString().slice(0, 10);
      const filename = `gratuity_provision_${dateStr}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  },

  /**
   * 6. Leave Liability (Excel)
   */
  async downloadLeaveLiability(req, res, next) {
    try {
      const companyId = req.companyId;
      const { asOfDate } = req.query;

      const buffer = await reportService.generateLeaveLiabilityExcel({
        companyId,
        asOfDate: asOfDate ? new Date(asOfDate) : new Date(),
      });

      const dateStr = asOfDate || new Date().toISOString().slice(0, 10);
      const filename = `leave_liability_${dateStr}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  },

  /**
   * 7. Payroll Register (Excel)
   */
  async downloadPayrollRegister(req, res, next) {
    try {
      const companyId = req.companyId;
      const { payRunId } = req.query;

      if (!payRunId) {
        const err = new Error('payRunId query parameter is required');
        err.status = 400;
        throw err;
      }

      const payRun = await prisma.$base().pay_runs.findUnique({
        where: { id: payRunId },
        include: {
          company: true,
          company_visa: true,
          payslips: {
            include: {
              employee: {
                select: { id: true, name: true, employee_code: true, department: true },
              },
              lines: { include: { salary_rule: true } },
            },
          },
        },
      });

      if (!payRun || payRun.company_id !== companyId) {
        const err = new Error('Pay run not found');
        err.status = 404;
        throw err;
      }

      const buffer = await generatePayrollRegisterExcel({
        payRun,
        company: payRun.company,
        companyVisa: payRun.company_visa,
        payslips: payRun.payslips,
      });

      const periodStr = typeof payRun.period_month === 'string'
        ? payRun.period_month.slice(0, 7)
        : new Date(payRun.period_month).toISOString().slice(0, 7);

      const filename = `payroll_register_${payRun.company_visa?.visa_name || 'visa'}_${periodStr}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  },

  /**
   * 8. Variance Report (Excel)
   */
  async downloadVarianceReport(req, res, next) {
    try {
      const companyId = req.companyId;
      const { payRunId } = req.query;

      if (!payRunId) {
        const err = new Error('payRunId query parameter is required');
        err.status = 400;
        throw err;
      }

      const payRun = await prisma.$base().pay_runs.findUnique({
        where: { id: payRunId },
        include: {
          company: true,
          company_visa: true,
          payslips: {
            include: {
              employee: {
                select: { id: true, name: true, employee_code: true, department: true },
              },
            },
          },
        },
      });

      if (!payRun || payRun.company_id !== companyId) {
        const err = new Error('Pay run not found');
        err.status = 404;
        throw err;
      }

      const buffer = await generateVarianceReportExcel({
        payRun,
        company: payRun.company,
        companyVisa: payRun.company_visa,
        payslips: payRun.payslips,
      });

      const periodStr = typeof payRun.period_month === 'string'
        ? payRun.period_month.slice(0, 7)
        : new Date(payRun.period_month).toISOString().slice(0, 7);

      const filename = `variance_report_${payRun.company_visa?.visa_name || 'visa'}_${periodStr}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  },
};

export default reportController;

