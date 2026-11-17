import rejectionService from '../services/rejectionService.js';

export async function listRejections(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const { search, requestType, startDate, endDate, page, limit } = req.query;

    const result = await rejectionService.listRejections({
      companyId,
      search,
      requestType,
      startDate,
      endDate,
      page,
      limit,
      user: req.user,
    });

    res.status(200).json({
      status: 'success',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

export async function getRejection(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const rejection = await rejectionService.getRejection(companyId, id, req.user);
    res.status(200).json({
      status: 'success',
      data: rejection,
    });
  } catch (err) {
    next(err);
  }
}

export async function exportRejectionsCsv(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const { search, requestType, startDate, endDate } = req.query;

    const csvData = await rejectionService.exportCsv({
      companyId,
      search,
      requestType,
      startDate,
      endDate,
      user: req.user,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="rejections-audit-log.csv"');
    res.status(200).send(csvData);
  } catch (err) {
    next(err);
  }
}

export default {
  listRejections,
  getRejection,
  exportRejectionsCsv,
};
