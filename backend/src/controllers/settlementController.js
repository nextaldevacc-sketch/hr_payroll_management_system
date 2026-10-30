import settlementService from '../services/settlementService.js';

export async function calculateSettlement(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const { separationId } = req.params;
    const calculation = await settlementService.calculateSettlement(
      companyId,
      separationId,
      req.body || {}
    );
    res.status(200).json({ status: 'success', data: calculation });
  } catch (err) {
    next(err);
  }
}

export async function prepareSettlement(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const { separationId } = req.params;
    const settlement = await settlementService.prepareSettlement(
      companyId,
      separationId,
      req.body || {},
      req.user.userId
    );
    res.status(200).json({ status: 'success', data: settlement });
  } catch (err) {
    next(err);
  }
}

export async function validateSettlement(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const settlement = await settlementService.validateSettlement(companyId, id, req.user.userId);
    res.status(200).json({ status: 'success', data: settlement });
  } catch (err) {
    next(err);
  }
}

export async function approveSettlement(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const settlement = await settlementService.approveSettlement(companyId, id, req.user.userId);
    res.status(200).json({ status: 'success', data: settlement });
  } catch (err) {
    next(err);
  }
}

export async function markSettlementPaid(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const settlement = await settlementService.markSettlementPaid(companyId, id, req.user.userId);
    res.status(200).json({ status: 'success', data: settlement });
  } catch (err) {
    next(err);
  }
}

export async function getSettlement(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const settlement = await settlementService.getSettlement(companyId, id);
    res.status(200).json({ status: 'success', data: settlement });
  } catch (err) {
    next(err);
  }
}

export async function downloadSettlementPdf(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const pdfBuffer = await settlementService.generateSettlementPdf(companyId, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="settlement_${id.slice(0, 8)}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

export async function downloadGratuityProvisionExcel(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const { asOfDate } = req.query;
    const excelBuffer = await settlementService.generateGratuityProvisionExcel(
      companyId,
      asOfDate ? new Date(asOfDate) : new Date()
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="gratuity_provision.xlsx"');
    res.send(excelBuffer);
  } catch (err) {
    next(err);
  }
}

export async function downloadLeaveLiabilityExcel(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const { asOfDate } = req.query;
    const excelBuffer = await settlementService.generateLeaveLiabilityExcel(
      companyId,
      asOfDate ? new Date(asOfDate) : new Date()
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="leave_liability.xlsx"');
    res.send(excelBuffer);
  } catch (err) {
    next(err);
  }
}

export default {
  calculateSettlement,
  prepareSettlement,
  validateSettlement,
  approveSettlement,
  markSettlementPaid,
  getSettlement,
  downloadSettlementPdf,
  downloadGratuityProvisionExcel,
  downloadLeaveLiabilityExcel,
};

