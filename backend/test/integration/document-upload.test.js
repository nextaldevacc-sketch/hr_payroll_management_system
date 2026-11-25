import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/lib/prisma.js';
import authService from '../../src/services/authService.js';
import storageService, { MAX_FILE_SIZE } from '../../src/lib/storage.js';

describe('Part 11 Section B: Secure Document Upload & Download Pipeline', () => {
  let company;
  let employeeA;
  let employeeB;
  let userA;
  let userB;
  let tokenA;
  let tokenB;
  const runId = Date.now();
  const testPassword = 'Password#DocUpload2026!';

  // Standard valid PDF buffer with %PDF magic header
  const samplePdfBuffer = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n164\n%%EOF'
  );

  before(async () => {
    // 1. Create company, visa, branch
    company = await prisma.$base().companies.create({
      data: {
        name: `Doc Upload Test Corp ${runId}`,
        trade_license_no: `TL-DOC-${runId}`,
      },
    });

    const visa = await prisma.$base().company_visas.create({
      data: {
        company_id: company.id,
        name: 'Dubai Visa',
        mol_establishment_id: `MOL-${runId}`,
        bank_routing_code: 'ENBD001',
        emirate: 'Dubai',
      },
    });

    const branch = await prisma.$base().branches.create({
      data: {
        company_id: company.id,
        company_visa_id: visa.id,
        name: 'Main Branch',
        emirate: 'Dubai',
      },
    });

    const roleEmployee = await prisma.$base().roles.findUnique({ where: { code: 'EMPLOYEE' } });
    const passwordHash = await authService.hashPassword(testPassword);

    // 2. Create Employee A & User A
    employeeA = await prisma.$base().employees.create({
      data: {
        company_id: company.id,
        company_visa_id: visa.id,
        branch_id: branch.id,
        employee_code: `DOCA-${runId}`,
        name: 'Employee A Doc',
        nationality: 'Emirati',
        gender: 'Male',
        status: 'Active',
        joining_date: new Date(),
      },
    });

    userA = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        employee_id: employeeA.id,
        email: `empa-${runId}@doc.test`,
        password_hash: passwordHash,
        status: 'Active',
      },
    });
    if (roleEmployee) {
      await prisma.$base().user_roles.create({
        data: {
          company_id: company.id,
          user_id: userA.id,
          role_id: roleEmployee.id,
          scope_type: 'Self',
        },
      });
    }

    // 3. Create Employee B & User B
    employeeB = await prisma.$base().employees.create({
      data: {
        company_id: company.id,
        company_visa_id: visa.id,
        branch_id: branch.id,
        employee_code: `DOCB-${runId}`,
        name: 'Employee B Doc',
        nationality: 'Indian',
        gender: 'Female',
        status: 'Active',
        joining_date: new Date(),
      },
    });

    userB = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        employee_id: employeeB.id,
        email: `empb-${runId}@doc.test`,
        password_hash: passwordHash,
        status: 'Active',
      },
    });
    if (roleEmployee) {
      await prisma.$base().user_roles.create({
        data: {
          company_id: company.id,
          user_id: userB.id,
          role_id: roleEmployee.id,
          scope_type: 'Self',
        },
      });
    }

    // Generate tokens
    const sessionA = await authService.login({ email: userA.email, password: testPassword });
    tokenA = sessionA.token;

    const sessionB = await authService.login({ email: userB.email, password: testPassword });
    tokenB = sessionB.token;
  });

  after(async () => {
    try {
      await prisma.$base().employee_documents.deleteMany({ where: { company_id: company.id } });
      await prisma.$base().sessions.deleteMany({ where: { user_id: { in: [userA.id, userB.id] } } });
      await prisma.$base().user_roles.deleteMany({ where: { company_id: company.id } });
      await prisma.$base().users.deleteMany({ where: { company_id: company.id } });
      await prisma.$base().employees.deleteMany({ where: { company_id: company.id } });
      await prisma.$base().branches.deleteMany({ where: { company_id: company.id } });
      await prisma.$base().company_visas.deleteMany({ where: { company_id: company.id } });
      await prisma.$base().companies.delete({ where: { id: company.id } });
    } catch (e) {
      // Ignore cleanup error
    }
  });

  let uploadedDocAId = null;

  it('1. Employee uploads own document via POST /api/v1/me/documents with safe storage pipeline', async () => {
    const res = await request(app)
      .post('/api/v1/me/documents')
      .set('Origin', 'https://localhost')
      .set('Authorization', `Bearer ${tokenA}`)
      .field('doc_type', 'EMIRATES_ID')
      .field('doc_number', '784-1990-1234567-1')
      .field('expiry_date', '2028-12-31')
      .attach('file', samplePdfBuffer, 'emirates-id.pdf');

    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'success');
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.status, 'Pending Verification');
    assert.equal(res.body.data.doc_type, 'EMIRATES_ID');
    assert.ok(res.body.data.file_url);

    uploadedDocAId = res.body.data.id;

    // Verify storage at rest is encrypted with NEXTAL_ENC_V1 magic header (not raw plain text)
    const storedFileName = res.body.data.file_url;
    const fullPath = path.join(storageService.storageDir, storedFileName);
    const rawDiskBytes = fs.readFileSync(fullPath);
    assert.equal(rawDiskBytes.subarray(0, 13).toString('utf8'), 'NEXTAL_ENC_V1');
    assert.notDeepEqual(rawDiskBytes, samplePdfBuffer);
  });

  it('2. Download roundtrip: GET /api/v1/me/documents/:id/download decrypts and matches original bytes', async () => {
    assert.ok(uploadedDocAId, 'Requires uploaded document from test 1');

    const res = await request(app)
      .get(`/api/v1/me/documents/${uploadedDocAId}/download`)
      .set('Authorization', `Bearer ${tokenA}`)
      .responseType('blob');

    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'], 'application/pdf');

    // Decrypted bytes must match original samplePdfBuffer
    const downloadedBuffer = Buffer.from(res.body);
    assert.deepEqual(downloadedBuffer, samplePdfBuffer);
  });

  it('3. IDOR Protection: Employee B CANNOT download Employee A document', async () => {
    assert.ok(uploadedDocAId);

    const res = await request(app)
      .get(`/api/v1/me/documents/${uploadedDocAId}/download`)
      .set('Authorization', `Bearer ${tokenB}`);

    // Must be 404 (or 403) to prevent information leakage
    assert.equal(res.status, 404);
  });

  it('4. Rejects disallowed file types (e.g. executable script)', async () => {
    const maliciousScript = Buffer.from('#!/bin/bash\necho "pwned"');

    const res = await request(app)
      .post('/api/v1/me/documents')
      .set('Origin', 'https://localhost')
      .set('Authorization', `Bearer ${tokenA}`)
      .field('doc_type', 'PASSPORT')
      .field('expiry_date', '2028-12-31')
      .attach('file', maliciousScript, 'malicious.sh');

    // Rejected by file filter middleware with 400
    assert.equal(res.status, 400);
  });

  it('5. Storage pipeline enforces 25MB max size limit', async () => {
    assert.equal(MAX_FILE_SIZE, 25 * 1024 * 1024);
  });
});
