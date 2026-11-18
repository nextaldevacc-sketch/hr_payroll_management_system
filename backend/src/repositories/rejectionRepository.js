import prisma from '../lib/prisma.js';

export class RejectionRepository {
  constructor(client = prisma) {
    this.prisma = client;
  }

  getClient(tx) {
    if (tx) return tx;
    return this.prisma.$base ? this.prisma.$base() : this.prisma;
  }

  async createRejection(data, tx = null) {
    const client = this.getClient(tx);
    return client.approval_rejections.create({
      data: {
        company_id: data.company_id,
        approval_request_id: data.approval_request_id || null,
        request_type: data.request_type,
        record_id: data.record_id,
        record_title: data.record_title || null,
        requester_id: data.requester_id || null,
        rejected_by_id: data.rejected_by_id,
        step_no: data.step_no || 1,
        reason: data.reason,
        rejection_type: data.rejection_type || 'REJECT',
        rejection_date: data.rejection_date ? new Date(data.rejection_date) : new Date(),
      },
      include: {
        rejected_by: {
          select: { id: true, email: true, employee: { select: { id: true, name: true } } },
        },
        requester: {
          select: { id: true, email: true, employee: { select: { id: true, name: true } } },
        },
      },
    });
  }

  async resolveScopedRecordIds(companyId, scope) {
    if (!scope || scope.all) return null;
    const client = this.getClient();

    const empWhere = { company_id: companyId };
    if (scope.visaIds && scope.visaIds.length > 0) {
      empWhere.company_visa_id = { in: scope.visaIds };
    }
    if (scope.branchIds && scope.branchIds.length > 0) {
      empWhere.branch_id = { in: scope.branchIds };
    }

    const emps = await client.employees.findMany({
      where: empWhere,
      select: { id: true },
    });
    const empIds = emps.map((e) => e.id);

    let leaveIds = [];
    if (empIds.length > 0) {
      const leaves = await client.leave_requests.findMany({
        where: {
          company_id: companyId,
          employee_id: { in: empIds },
        },
        select: { id: true },
      });
      leaveIds = leaves.map((l) => l.id);
    }

    return { empIds, leaveIds };
  }

  _buildWhere({ companyId, search, requestType, startDate, endDate, requesterId, scope, scopedRecordIds }) {
    const where = { company_id: companyId };

    if (requesterId) {
      where.requester_id = requesterId;
    }

    if (requestType) {
      where.request_type = { equals: requestType, mode: 'insensitive' };
    }

    if (startDate || endDate) {
      where.rejection_date = {};
      if (startDate) {
        where.rejection_date.gte = new Date(startDate);
      }
      if (endDate) {
        where.rejection_date.lte = new Date(endDate);
      }
    }

    const conditions = [];

    if (search && search.trim()) {
      const term = search.trim();
      conditions.push({
        OR: [
          { record_title: { contains: term, mode: 'insensitive' } },
          { reason: { contains: term, mode: 'insensitive' } },
          { request_type: { contains: term, mode: 'insensitive' } },
        ],
      });
    }

    if (scope && !scope.all) {
      const scopeOr = [];
      if (scope.visaIds && scope.visaIds.length > 0) {
        scopeOr.push({
          requester: {
            employee: {
              company_visa_id: { in: scope.visaIds },
            },
          },
        });
      }
      if (scope.branchIds && scope.branchIds.length > 0) {
        scopeOr.push({
          requester: {
            employee: {
              branch_id: { in: scope.branchIds },
            },
          },
        });
      }
      const targetIds = [
        ...(scopedRecordIds?.empIds || []),
        ...(scopedRecordIds?.leaveIds || []),
      ];
      if (targetIds.length > 0) {
        scopeOr.push({ record_id: { in: targetIds } });
      }

      if (scopeOr.length > 0) {
        conditions.push({ OR: scopeOr });
      } else {
        where.id = '00000000-0000-0000-0000-000000000000';
      }
    }

    if (conditions.length === 1) {
      Object.assign(where, conditions[0]);
    } else if (conditions.length > 1) {
      where.AND = conditions;
    }

    return where;
  }

  async findRejections({ companyId, search, requestType, startDate, endDate, requesterId, scope, scopedRecordIds, skip = 0, take = 50 }) {
    const client = this.getClient();
    const where = this._buildWhere({ companyId, search, requestType, startDate, endDate, requesterId, scope, scopedRecordIds });

    return client.approval_rejections.findMany({
      where,
      skip: Number(skip) || 0,
      take: Number(take) || 50,
      orderBy: { created_at: 'desc' },
      include: {
        rejected_by: {
          select: {
            id: true,
            email: true,
            employee: { select: { id: true, name: true, company_visa_id: true, branch_id: true } },
          },
        },
        requester: {
          select: {
            id: true,
            email: true,
            employee: { select: { id: true, name: true, company_visa_id: true, branch_id: true } },
          },
        },
      },
    });
  }

  async countRejections({ companyId, search, requestType, startDate, endDate, requesterId, scope, scopedRecordIds }) {
    const client = this.getClient();
    const where = this._buildWhere({ companyId, search, requestType, startDate, endDate, requesterId, scope, scopedRecordIds });
    return client.approval_rejections.count({ where });
  }

  async findRejectionById(companyId, id) {
    const client = this.getClient();
    return client.approval_rejections.findFirst({
      where: { id, company_id: companyId },
      include: {
        rejected_by: {
          select: {
            id: true,
            email: true,
            employee: { select: { id: true, name: true, company_visa_id: true, branch_id: true } },
          },
        },
        requester: {
          select: {
            id: true,
            email: true,
            employee: { select: { id: true, name: true, company_visa_id: true, branch_id: true } },
          },
        },
        approval_request: {
          include: {
            flow: { select: { id: true, name: true, request_type: true } },
            actions: {
              orderBy: { step_no: 'asc' },
              include: { actor: { select: { id: true, email: true } } },
            },
          },
        },
      },
    });
  }
}

export default new RejectionRepository();
