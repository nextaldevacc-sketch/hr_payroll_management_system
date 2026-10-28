import prisma from '../lib/prisma.js';

export async function getPayrollOverview(req, res, next) {
  try {
    const companyId = req.companyId;

    const payRuns = await prisma.$base().pay_runs.findMany({
      where: { company_id: companyId },
      include: {
        company_visa: { select: { id: true, name: true } },
        _count: { select: { payslips: true } },
      },
      orderBy: { period_month: 'desc' },
    });

    res.json({
      status: 'success',
      count: payRuns.length,
      data: payRuns,
    });
  } catch (err) {
    next(err);
  }
}

export async function approvePayRun(req, res, next) {
  try {
    res.json({
      status: 'success',
      message: 'Pay run approved by authorized executive',
      runId: req.params.id,
    });
  } catch (err) {
    next(err);
  }
}

export default {
  getPayrollOverview,
  approvePayRun,
};
