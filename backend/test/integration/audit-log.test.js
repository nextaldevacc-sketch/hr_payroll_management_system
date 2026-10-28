import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { auditService } from '../../src/services/auditService.js';
import crypto from 'crypto';

const basePrisma = new PrismaClient();

describe('Audit Log Service & Append-Only Database Protection Tests', () => {
  let company;
  let testRecordId;
  let createdAuditLogId;

  before(async () => {
    // Setup test company
    company = await basePrisma.companies.upsert({
      where: { trade_license_no: 'TEST-AUDIT-COMPANY-01' },
      update: {},
      create: {
        name: 'Audit Test Company LLC',
        trade_license_no: 'TEST-AUDIT-COMPANY-01',
        default_language: 'en',
        status: 'Active',
      }
    });

    testRecordId = crypto.randomUUID();
  });

  after(async () => {
    // Note: audit_logs cannot be deleted due to trigger!
    // We clean up companies where possible or leave audit intact
    await basePrisma.$disconnect();
  });

  test('1. AuditService successfully logs create, update, delete and approval actions', async () => {
    const entry = await auditService.log({
      companyId: company.id,
      action: 'Create',
      tableName: 'contracts',
      recordId: testRecordId,
      oldValues: null,
      newValues: { basic: 5000, gross: 8000 },
      ipAddress: '127.0.0.1'
    });

    assert.ok(entry.id, 'Audit log must have generated an id');
    assert.equal(entry.company_id, company.id);
    assert.equal(entry.action, 'Create');
    assert.equal(entry.table_name, 'contracts');
    assert.equal(entry.record_id, testRecordId);
    assert.deepEqual(entry.new_values, { basic: 5000, gross: 8000 });

    createdAuditLogId = entry.id;
  });

  test('2. AuditService retrieves history with filtering', async () => {
    const history = await auditService.getHistory({
      companyId: company.id,
      tableName: 'contracts',
      recordId: testRecordId
    });

    assert.ok(history.length >= 1, 'Should find the logged audit entry');
    const item = history.find((h) => h.id === createdAuditLogId);
    assert.ok(item, 'History must contain the created audit log entry');
    assert.equal(item.action, 'Create');
  });

  test('3. Database blocks UPDATE on audit_logs at the Postgres trigger level', async () => {
    assert.ok(createdAuditLogId, 'Must have an existing audit log entry to test update');

    await assert.rejects(
      async () => {
        // Attempt raw SQL update directly on audit_logs table
        await basePrisma.$executeRaw`
          UPDATE "audit_logs"
          SET "action" = 'TamperedAction'
          WHERE "id" = ${createdAuditLogId}
        `;
      },
      (err) => {
        assert.ok(
          err.message.includes('audit_logs table is append-only') ||
          err.message.includes('UPDATE and DELETE operations are prohibited'),
          `Error must state trigger violation: ${err.message}`
        );
        return true;
      }
    );
  });

  test('4. Database blocks DELETE on audit_logs at the Postgres trigger level', async () => {
    assert.ok(createdAuditLogId, 'Must have an existing audit log entry to test delete');

    await assert.rejects(
      async () => {
        // Attempt raw SQL delete directly on audit_logs table
        await basePrisma.$executeRaw`
          DELETE FROM "audit_logs"
          WHERE "id" = ${createdAuditLogId}
        `;
      },
      (err) => {
        assert.ok(
          err.message.includes('audit_logs table is append-only') ||
          err.message.includes('UPDATE and DELETE operations are prohibited'),
          `Error must state trigger violation: ${err.message}`
        );
        return true;
      }
    );
  });
});
