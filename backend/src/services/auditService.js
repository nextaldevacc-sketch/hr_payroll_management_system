import prisma from '../lib/prisma.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function sanitizeUuid(val) {
  return typeof val === 'string' && UUID_REGEX.test(val) ? val : null;
}

export class AuditService {
  constructor(client = prisma) {
    this.prisma = client;
  }

  /**
   * Log an audit event
   * @param {Object} params
   * @param {string} params.companyId
   * @param {string|null} [params.userId]
   * @param {string} params.action - Create, Update, Delete, Approve, Login, View, Export
   * @param {string} params.tableName
   * @param {string} params.recordId
   * @param {Object|null} [params.oldValues]
   * @param {Object|null} [params.newValues]
   * @param {string|null} [params.ipAddress]
   */
  async log({
    companyId,
    userId = null,
    action,
    tableName,
    recordId,
    oldValues = null,
    newValues = null,
    ipAddress = null,
    tx = null,
  }) {
    if (!companyId) {
      throw new Error('companyId is required for audit logging');
    }
    if (!action || !tableName || !recordId) {
      throw new Error('action, tableName, and recordId are required for audit logging');
    }

    const client = tx || (this.prisma.$scoped ? this.prisma.$scoped(companyId) : this.prisma);

    return await client.audit_logs.create({
      data: {
        company_id: companyId,
        user_id: sanitizeUuid(userId),
        action: action ? String(action).slice(0, 20) : 'UNKNOWN',
        table_name: tableName,
        record_id: recordId,
        old_values: oldValues ? JSON.parse(JSON.stringify(oldValues)) : null,
        new_values: newValues ? JSON.parse(JSON.stringify(newValues)) : null,
        ip_address: ipAddress
      }
    });
  }

  /**
   * Alias for record
   */
  async record(params) {
    return this.log(params);
  }

  /**
   * Convenience alias for entity-level audit action logging
   */
  async logAction({
    companyId,
    userId = null,
    action,
    entity,
    tableName,
    recordId,
    oldValues = null,
    newValues = null,
    ipAddress = null
  }) {
    return this.log({
      companyId,
      userId,
      action,
      tableName: tableName || entity,
      recordId: recordId || companyId,
      oldValues,
      newValues,
      ipAddress
    });
  }

  /**
   * Query audit history for an entity or record
   */
  async getHistory({ companyId, tableName = null, recordId = null, limit = 50, offset = 0 }) {
    const scopedPrisma = this.prisma.$scoped ? this.prisma.$scoped(companyId) : this.prisma;
    const where = {};
    if (tableName) where.table_name = tableName;
    if (recordId) where.record_id = recordId;

    return await scopedPrisma.audit_logs.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: { id: true, email: true, employee: { select: { name: true } } }
        }
      }
    });
  }

  /**
   * Filterable audit history with pagination
   */
  async listAuditLogs({
    companyId,
    userId = null,
    tableName = null,
    recordId = null,
    action = null,
    startDate = null,
    endDate = null,
    page = 1,
    limit = 50,
  }) {
    const scopedPrisma = this.prisma.$scoped ? this.prisma.$scoped(companyId) : this.prisma;
    const where = { company_id: companyId };

    if (userId) where.user_id = sanitizeUuid(userId);
    if (tableName) where.table_name = tableName;
    if (recordId) where.record_id = recordId;
    if (action) where.action = { equals: action, mode: 'insensitive' };

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = new Date(startDate);
      if (endDate) where.created_at.lte = new Date(endDate);
    }

    const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (Math.max(1, parseInt(page, 10) || 1) - 1) * take;

    const [items, total] = await Promise.all([
      scopedPrisma.audit_logs.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take,
        include: {
          user: {
            select: { id: true, email: true, employee: { select: { name: true } } },
          },
        },
      }),
      scopedPrisma.audit_logs.count({ where }),
    ]);

    // Format BigInt id for JSON serialization
    const serializedItems = items.map((item) => ({
      ...item,
      id: item.id.toString(),
      user: item.user
        ? {
            id: item.user.id,
            email: item.user.email,
            name: item.user.employee?.name || item.user.email,
          }
        : null,
    }));

    return {
      items: serializedItems,
      total,
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: take,
      totalPages: Math.ceil(total / take),
    };
  }

  /**
   * Export audit logs to CSV
   */
  async exportAuditLogsCsv({
    companyId,
    userId = null,
    tableName = null,
    recordId = null,
    action = null,
    startDate = null,
    endDate = null,
  }) {
    const scopedPrisma = this.prisma.$scoped ? this.prisma.$scoped(companyId) : this.prisma;
    const where = { company_id: companyId };

    if (userId) where.user_id = sanitizeUuid(userId);
    if (tableName) where.table_name = tableName;
    if (recordId) where.record_id = recordId;
    if (action) where.action = { equals: action, mode: 'insensitive' };

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = new Date(startDate);
      if (endDate) where.created_at.lte = new Date(endDate);
    }

    const items = await scopedPrisma.audit_logs.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 2000, // Export up to 2,000 most recent matching entries
      include: {
        user: {
          select: { id: true, email: true, employee: { select: { name: true } } },
        },
      },
    });

    const csvLines = [
      'ID,Timestamp (UTC),User Name,User Email,Action,Entity,Record ID,IP Address,Old Values,New Values',
    ];

    for (const item of items) {
      const oldStr = item.old_values ? JSON.stringify(item.old_values).replace(/"/g, '""') : '';
      const newStr = item.new_values ? JSON.stringify(item.new_values).replace(/"/g, '""') : '';
      const userName = (item.user?.employee?.name || item.user?.email || 'SYSTEM').replace(/"/g, '""');
      const userEmail = (item.user?.email || 'SYSTEM').replace(/"/g, '""');

      const line = [
        item.id.toString(),
        new Date(item.created_at).toISOString(),
        `"${userName}"`,
        `"${userEmail}"`,
        `"${item.action}"`,
        `"${item.table_name}"`,
        `"${item.record_id}"`,
        `"${item.ip_address || ''}"`,
        `"${oldStr}"`,
        `"${newStr}"`,
      ].join(',');

      csvLines.push(line);
    }

    return csvLines.join('\r\n');
  }
}

export const auditService = new AuditService();
export default auditService;
