import reportService from '../services/reportService.js';
import payrollService from '../services/payrollService.js';

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
        viewer: req.user,
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
        viewer: req.user,
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
        viewer: req.user,
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
        viewer: req.user,
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
        viewer: req.user,
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

      const buffer = await payrollService.getPayrollRegisterExcel(companyId, payRunId, req.user);
      const filename = `payroll_register_${payRunId.slice(0, 8)}.xlsx`;
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

      const buffer = await payrollService.getVarianceReportExcel(companyId, payRunId, req.user);
      const filename = `variance_report_${payRunId.slice(0, 8)}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  },
};

export default reportController;

