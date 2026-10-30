import separationService from '../services/separationService.js';

export async function createSeparation(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const separation = await separationService.createSeparation(companyId, req.body, req.user.userId);
    res.status(201).json({ status: 'success', data: separation });
  } catch (err) {
    next(err);
  }
}

export async function actOnSeparation(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const { action, reason } = req.body;
    const separation = await separationService.actOnSeparation(
      companyId,
      id,
      { action, reason },
      req.user.userId
    );
    res.status(200).json({ status: 'success', data: separation });
  } catch (err) {
    next(err);
  }
}

export async function listSeparations(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const { status, type, employeeId, limit, offset } = req.query;
    const result = await separationService.listSeparations(companyId, {
      status,
      type,
      employeeId,
      limit,
      offset,
    });
    res.status(200).json({ status: 'success', data: result.items, total: result.total });
  } catch (err) {
    next(err);
  }
}

export async function getSeparation(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const separation = await separationService.getSeparationById(companyId, id);
    res.status(200).json({ status: 'success', data: separation });
  } catch (err) {
    next(err);
  }
}

export async function updateClearanceItem(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const { itemId } = req.params;
    const item = await separationService.updateClearanceItem(
      companyId,
      itemId,
      req.body,
      req.user
    );
    res.status(200).json({ status: 'success', data: item });
  } catch (err) {
    next(err);
  }
}

export default {
  createSeparation,
  actOnSeparation,
  listSeparations,
  getSeparation,
  updateClearanceItem,
};

