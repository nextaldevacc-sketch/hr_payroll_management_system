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
    ipAddress = null
  }) {
    if (!companyId) {
      throw new Error('companyId is required for audit logging');
    }
    if (!action || !tableName || !recordId) {
      throw new Error('action, tableName, and recordId are required for audit logging');
    }

    const scopedPrisma = this.prisma.$scoped ? this.prisma.$scoped(companyId) : this.prisma;

    return await scopedPrisma.audit_logs.create({
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
          select: { id: true, email: true }
        }
      }
    });
  }
}

export const auditService = new AuditService();
export default auditService;
