import salaryAdjustmentService from '../services/salaryAdjustmentService.js';

export async function listAdjustments(req, res, next) {
  try {
    const { employeeId, type, status, limit, offset } = req.query;
    const result = await salaryAdjustmentService.listAdjustments(req.companyId, {
      employeeId,
      type,
      status,
      limit,
      offset,
    });
    res.json({ status: 'success', data: result.items, total: result.total });
  } catch (err) {
    next(err);
  }
}

export async function createAdjustment(req, res, next) {
  try {
    const result = await salaryAdjustmentService.createAdjustment(
      req.companyId,
      req.body,
      req.user?.id
    );
    res.status(201).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

export async function approveAdjustment(req, res, next) {
  try {
    const result = await salaryAdjustmentService.approveAdjustment(
      req.companyId,
      req.params.id,
      req.user?.id
    );
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

export async function rejectAdjustment(req, res, next) {
  try {
    const result = await salaryAdjustmentService.rejectAdjustment(
      req.companyId,
      req.params.id,
      req.body.reason,
      req.user?.id
    );
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

export default {
  listAdjustments,
  createAdjustment,
  approveAdjustment,
  rejectAdjustment,
};
