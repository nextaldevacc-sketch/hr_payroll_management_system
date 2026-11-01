import separationService from '../services/separationService.js';

export async function createSeparation(req, res, next) {
  try {
    const roles = req.user?.roles || [];
    if (!roles.some((r) => ['HR_OFFICER', 'HR_MANAGER'].includes(r))) {
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'Access denied: Only HR Officer or HR Manager can create separations.',
      });
    }

    const companyId = req.user.companyId;
    const separation = await separationService.createSeparation(companyId, req.body, req.user.userId || req.user.id);
    res.status(201).json({ status: 'success', data: separation });
  } catch (err) {
    next(err);
  }
}

export async function actOnSeparation(req, res, next) {
  try {
    const roles = req.user?.roles || [];
    if (!roles.includes('HR_MANAGER')) {
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'Access denied: Only HR Manager can approve or reject separations.',
      });
    }

    const companyId = req.user.companyId;
    const { id } = req.params;
    const { action, reason } = req.body;
    const separation = await separationService.actOnSeparation(
      companyId,
      id,
      { action, reason },
      req.user.userId || req.user.id
    );
    res.status(200).json({ status: 'success', data: separation });
  } catch (err) {
    next(err);
  }
}

export async function listSeparations(req, res, next) {
  try {
    const roles = req.user?.roles || [];
    const allowedRoles = ['HR_OFFICER', 'HR_MANAGER', 'PAYROLL_OFFICER', 'GM', 'DEPT_MANAGER', 'FINANCE', 'COMPANY_ADMIN'];
    if (!roles.some((r) => allowedRoles.includes(r))) {
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'Access denied: Employees cannot view separations.',
      });
    }

    const companyId = req.user.companyId;
    const { status, type, employeeId, limit, offset } = req.query;
    const result = await separationService.listSeparations(
      companyId,
      {
        status,
        type,
        employeeId,
        limit,
        offset,
      },
      req.user
    );
    res.status(200).json({ status: 'success', data: result.items, total: result.total });
  } catch (err) {
    next(err);
  }
}

export async function getSeparation(req, res, next) {
  try {
    const roles = req.user?.roles || [];
    const allowedRoles = ['HR_OFFICER', 'HR_MANAGER', 'PAYROLL_OFFICER', 'GM', 'DEPT_MANAGER', 'FINANCE', 'COMPANY_ADMIN'];
    if (!roles.some((r) => allowedRoles.includes(r))) {
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'Access denied: Employees cannot view separations.',
      });
    }

    const companyId = req.user.companyId;
    const { id } = req.params;
    const separation = await separationService.getSeparationById(companyId, id, req.user);
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

export async function getSeparationTasks(req, res, next) {
  try {
    const roles = req.user?.roles || [];
    if (!roles.some((r) => ['HR_OFFICER', 'HR_MANAGER', 'COMPANY_ADMIN'].includes(r))) {
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'Access denied: Only HR roles can view cancellation tasks.',
      });
    }

    const companyId = req.user.companyId;
    const { id } = req.params;
    const tasks = await separationService.getSeparationTasks(companyId, id);
    res.status(200).json({ status: 'success', data: tasks });
  } catch (err) {
    next(err);
  }
}

export async function listSeparationTasks(req, res, next) {
  try {
    const roles = req.user?.roles || [];
    if (!roles.some((r) => ['HR_OFFICER', 'HR_MANAGER', 'COMPANY_ADMIN'].includes(r))) {
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'Access denied: Only HR roles can list cancellation tasks.',
      });
    }

    const companyId = req.user.companyId;
    const { status, task_type, limit, offset } = req.query;
    const result = await separationService.listSeparationTasks(companyId, {
      status,
      task_type,
      limit,
      offset,
    });
    res.status(200).json({ status: 'success', data: result.items, total: result.total });
  } catch (err) {
    next(err);
  }
}

export async function updateSeparationTask(req, res, next) {
  try {
    const roles = req.user?.roles || [];
    if (!roles.some((r) => ['HR_OFFICER', 'HR_MANAGER'].includes(r))) {
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'Access denied: Only HR Officer or HR Manager can update cancellation tasks.',
      });
    }

    const companyId = req.user.companyId;
    const { id, taskId } = req.params;
    const targetTaskId = id || taskId;
    const task = await separationService.updateSeparationTask(
      companyId,
      targetTaskId,
      req.body,
      req.user.userId || req.user.id
    );
    res.status(200).json({ status: 'success', data: task });
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
  getSeparationTasks,
  listSeparationTasks,
  updateSeparationTask,
};

