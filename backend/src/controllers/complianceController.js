import complianceService from '../services/complianceService.js';

export const complianceController = {
  async getOverview(req, res, next) {
    try {
      const companyId = req.companyId;
      const stats = await complianceService.getComplianceOverview(
        companyId,
        req.query.company_visa_id || req.query.companyVisaId
      );
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  },

  async listDocuments(req, res, next) {
    try {
      const companyId = req.companyId;
      const result = await complianceService.listComplianceDocuments(companyId, req.query, req.user);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },

  async renewDocument(req, res, next) {
    try {
      const companyId = req.companyId;
      const documentId = req.params.id;
      const file = req.file;
      const meta = req.body;

      const updated = await complianceService.renewDocument({
        companyId,
        documentId,
        file,
        meta,
        viewer: req.user,
      });

      res.json({ success: true, data: updated, message: 'Document renewed and submitted for verification' });
    } catch (err) {
      next(err);
    }
  },

  async verifyDocument(req, res, next) {
    try {
      const companyId = req.companyId;
      const documentId = req.params.id;

      const updated = await complianceService.verifyDocument({
        companyId,
        documentId,
        viewer: req.user,
      });

      res.json({ success: true, data: updated, message: 'Document verified successfully' });
    } catch (err) {
      next(err);
    }
  },

  async getDocumentHistory(req, res, next) {
    try {
      const companyId = req.companyId;
      const documentId = req.params.id;

      const history = await complianceService.getDocumentHistory({
        companyId,
        documentId,
        viewer: req.user,
      });

      res.json({ success: true, data: history });
    } catch (err) {
      next(err);
    }
  },

  async triggerJob(req, res, next) {
    try {
      const companyId = req.companyId;
      const referenceDate = req.body.referenceDate ? new Date(req.body.referenceDate) : new Date();

      const result = await complianceService.runComplianceJob({
        referenceDate,
        companyId,
      });

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
};

export default complianceController;

