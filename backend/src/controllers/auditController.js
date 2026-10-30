import auditService from '../services/auditService.js';

export const auditController = {
  /**
   * List audit logs with pagination and filters
   */
  async listLogs(req, res, next) {
    try {
      const companyId = req.companyId;
      const {
        userId,
        tableName,
        recordId,
        action,
        startDate,
        endDate,
        page,
        limit,
      } = req.query;

      const result = await auditService.listAuditLogs({
        companyId,
        userId,
        tableName,
        recordId,
        action,
        startDate,
        endDate,
        page,
        limit,
      });

      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Export audit logs to CSV
   */
  async exportCsv(req, res, next) {
    try {
      const companyId = req.companyId;
      const {
        userId,
        tableName,
        recordId,
        action,
        startDate,
        endDate,
      } = req.query;

      const csvContent = await auditService.exportAuditLogsCsv({
        companyId,
        userId,
        tableName,
        recordId,
        action,
        startDate,
        endDate,
      });

      const dateStr = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${dateStr}.csv"`);
      res.send(csvContent);
    } catch (err) {
      next(err);
    }
  },
};

export default auditController;

