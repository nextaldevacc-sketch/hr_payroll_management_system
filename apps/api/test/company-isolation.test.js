import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { createScopedPrismaClient, companyStorage } from '../src/prisma/client.js';

const basePrisma = new PrismaClient();

describe('Company Tenant Isolation Tests', () => {
  let companyA;
  let companyB;
  let deptA;
  let deptB;

  before(async () => {
    // Clean up test companies if existing
    await basePrisma.departments.deleteMany({
      where: {
        name: { in: ['Alpha Engineering', 'Beta Operations', 'Alpha Marketing'] }
      }
    });
    await basePrisma.companies.deleteMany({
      where: {
        trade_license_no: { in: ['TEST-ISO-A-001', 'TEST-ISO-B-002'] }
      }
    });

    // Create Company A
    companyA = await basePrisma.companies.create({
      data: {
        name: 'Company Alpha LLC',
        name_ar: 'شركة ألفا ذ.م.م',
        trade_license_no: 'TEST-ISO-A-001',
        default_language: 'en',
        status: 'Active',
      }
    });

    // Create Company B
    companyB = await basePrisma.companies.create({
      data: {
        name: 'Company Beta LLC',
        name_ar: 'شركة بيتا ذ.م.م',
        trade_license_no: 'TEST-ISO-B-002',
        default_language: 'ar',
        status: 'Active',
      }
    });

    // Seed Department in Company A
    deptA = await basePrisma.departments.create({
      data: {
        company_id: companyA.id,
        name: 'Alpha Engineering',
        name_ar: 'هندسة ألفا',
      }
    });

    // Seed Department in Company B
    deptB = await basePrisma.departments.create({
      data: {
        company_id: companyB.id,
        name: 'Beta Operations',
        name_ar: 'عمليات بيتا',
      }
    });
  });

  after(async () => {
    await basePrisma.departments.deleteMany({
      where: {
        company_id: { in: [companyA.id, companyB.id] }
      }
    });
    await basePrisma.companies.deleteMany({
      where: {
        id: { in: [companyA.id, companyB.id] }
      }
    });
    await basePrisma.$disconnect();
  });

  test('1. Unscoped query without company context throws explicit Error', async () => {
    const unscopedClient = createScopedPrismaClient();

    await assert.rejects(
      async () => {
        await unscopedClient.departments.findMany();
      },
      {
        name: 'Error',
        message: 'Company context is required for company-owned table: departments'
      }
    );
  });

  test('2. Company A cannot read records belonging to Company B (findMany)', async () => {
    const clientA = createScopedPrismaClient(companyA.id);
    const depts = await clientA.departments.findMany();

    assert.ok(depts.length > 0, 'Company A should see its own departments');
    assert.ok(depts.some((d) => d.id === deptA.id), 'Company A sees Dept A');
    assert.ok(!depts.some((d) => d.id === deptB.id), 'Company A must NEVER see Dept B');
  });

  test('3. Company A cannot read Company B record by ID (findUnique & findFirst)', async () => {
    const clientA = createScopedPrismaClient(companyA.id);

    // Attempting to read Dept B by its exact ID
    const foundUnique = await clientA.departments.findUnique({
      where: { id: deptB.id }
    });
    assert.equal(foundUnique, null, 'findUnique on Company B ID must return null');

    const foundFirst = await clientA.departments.findFirst({
      where: { id: deptB.id }
    });
    assert.equal(foundFirst, null, 'findFirst on Company B ID must return null');
  });

  test('4. Company A cannot update Company B records (update)', async () => {
    const clientA = createScopedPrismaClient(companyA.id);

    // Attempting to update Dept B while scoped to Company A
    await assert.rejects(
      async () => {
        await clientA.departments.update({
          where: { id: deptB.id },
          data: { name: 'Unauthorized Overwrite' }
        });
      },
      (err) => {
        assert.ok(
          err.code === 'P2025' || err.message.includes('belongs to another company'),
          'Should reject with record not found or company mismatch'
        );
        return true;
      }
    );

    // Verify Dept B was NOT modified in the database
    const verifyDeptB = await basePrisma.departments.findUnique({
      where: { id: deptB.id }
    });
    assert.equal(verifyDeptB.name, 'Beta Operations', 'Department B name must remain untouched');
  });

  test('5. Company A cannot update Company B records (updateMany)', async () => {
    const clientA = createScopedPrismaClient(companyA.id);

    const updateResult = await clientA.departments.updateMany({
      where: { id: deptB.id },
      data: { name: 'Unauthorized Batch Overwrite' }
    });

    assert.equal(updateResult.count, 0, 'updateMany on another company must affect 0 rows');

    const verifyDeptB = await basePrisma.departments.findUnique({
      where: { id: deptB.id }
    });
    assert.equal(verifyDeptB.name, 'Beta Operations');
  });

  test('6. Company A cannot delete Company B records (delete)', async () => {
    const clientA = createScopedPrismaClient(companyA.id);

    // Attempting to delete Dept B while scoped to Company A
    await assert.rejects(
      async () => {
        await clientA.departments.delete({
          where: { id: deptB.id }
        });
      },
      (err) => {
        assert.ok(
          err.code === 'P2025' || err.message.includes('belongs to another company'),
          'Should reject with record not found or company mismatch'
        );
        return true;
      }
    );

    // Verify Dept B still exists in the database
    const verifyDeptB = await basePrisma.departments.findUnique({
      where: { id: deptB.id }
    });
    assert.ok(verifyDeptB, 'Department B must still exist');
  });

  test('7. Company A creating a record automatically injects company_id', async () => {
    const clientA = createScopedPrismaClient(companyA.id);

    const newDept = await clientA.departments.create({
      data: {
        name: 'Alpha Marketing',
        name_ar: 'تسويق ألفا',
      }
    });

    assert.equal(newDept.company_id, companyA.id, 'company_id must match Company A');
    assert.equal(newDept.name, 'Alpha Marketing');
  });

  test('8. AsyncLocalStorage context injection works seamlessly', async () => {
    const client = createScopedPrismaClient();

    await companyStorage.run({ companyId: companyA.id }, async () => {
      const depts = await client.departments.findMany();
      assert.ok(depts.every((d) => d.company_id === companyA.id));
      assert.ok(!depts.some((d) => d.id === deptB.id));
    });
  });
});
