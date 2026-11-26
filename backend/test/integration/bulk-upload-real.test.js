import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { PDFDocument, PDFName } from 'pdf-lib';
import app from '../../src/app.js';
import prisma from '../../src/lib/prisma.js';
import authService from '../../src/services/authService.js';
import storageService from '../../src/lib/storage.js';

describe('Part 16: Bulk Upload & Self-Service Real Integration Pipeline (Real DB + HTTP)', () => {
  let company;
  let visa;
  let branch;
  let empA;
  let userA;
  let tokenA;
  let hrUser;
  let hrToken;
  let deptMgrUser;
  let deptMgrToken;

  const runId = Date.now().toString().slice(-6);
  const testPassword = 'Password#RealBulk2026!';

  async function createValidPdf(text = 'Valid Doc Content') {
    const doc = await PDFDocument.create();
    const page = doc.addPage([400, 400]);
    page.drawText(text, { x: 50, y: 350, size: 12 });
    return Buffer.from(await doc.save());
  }

  async function createMaliciousPdf() {
    const doc = await PDFDocument.create();
    doc.addPage([200, 200]);
    doc.catalog.set(PDFName.of('OpenAction'), doc.context.obj({ S: 'JavaScript', JS: 'alert(1)' }));
    return Buffer.from(await doc.save());
  }

  before(async () => {
    // 1. Create company, visa, branch
    company = await prisma.$base().companies.create({
      data: {
        name: `Bulk Test Corp ${runId}`,
        trade_license_no: `TL-BULK-${runId}`,
        require_privileged_mfa: false,
      },
    });

    visa = await prisma.$base().company_visas.create({
      data: {
        company_id: company.id,
        name: 'Main Dubai Visa',
        mol_establishment_id: `MOL-BLK-${runId}`,
        bank_routing_code: 'ENBD001',
        emirate: 'Dubai',
      },
    });

    branch = await prisma.$base().branches.create({
      data: {
        company_id: company.id,
        company_visa_id: visa.id,
        name: 'Main Branch',
        emirate: 'Dubai',
      },
    });

    const roleHrMgr = await prisma.$base().roles.findUnique({ where: { code: 'HR_MANAGER' } });
    const roleDeptMgr = await prisma.$base().roles.findUnique({ where: { code: 'DEPT_MANAGER' } });
    const roleEmp = await prisma.$base().roles.findUnique({ where: { code: 'EMPLOYEE' } });
    const passwordHash = await authService.hashPassword(testPassword);

    // 2. Create HR Manager User
    hrUser = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        email: `hr-${runId}@bulk.test`,
        password_hash: passwordHash,
        status: 'Active',
      },
    });
    await prisma.$base().user_roles.create({
      data: { company_id: company.id, user_id: hrUser.id, role_id: roleHrMgr.id },
    });
    const hrLogin = await authService.login({ email: hrUser.email, password: testPassword, ipAddress: '127.0.0.1' });
    hrToken = hrLogin.token;

    // 3. Create Department Manager User (Cannot see salary/bank details)
    deptMgrUser = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        email: `dept-${runId}@bulk.test`,
        password_hash: passwordHash,
        status: 'Active',
      },
    });
    await prisma.$base().user_roles.create({
      data: { company_id: company.id, user_id: deptMgrUser.id, role_id: roleDeptMgr.id },
    });
    const deptLogin = await authService.login({ email: deptMgrUser.email, password: testPassword, ipAddress: '127.0.0.1' });
    deptMgrToken = deptLogin.token;

    // 4. Create Employee A & User A
    empA = await prisma.$base().employees.create({
      data: {
        company_id: company.id,
        company_visa_id: visa.id,
        branch_id: branch.id,
        employee_code: `EMP-BLK-${runId.toString().slice(-4)}`,
        name: 'Zayed Al Mansoori',
        nationality: 'Emirati',
        gender: 'Male',
        status: 'Active',
        joining_date: new Date(),
      },
    });
    userA = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        employee_id: empA.id,
        email: `zayed-${runId}@bulk.test`,
        password_hash: passwordHash,
        status: 'Active',
      },
    });
    await prisma.$base().user_roles.create({
      data: { company_id: company.id, user_id: userA.id, role_id: roleEmp.id },
    });
    const empLogin = await authService.login({ email: userA.email, password: testPassword, ipAddress: '127.0.0.1' });
    tokenA = empLogin.token;
  });

  after(async () => {
    try {
      await prisma.$base().employee_documents.deleteMany({ where: { company_id: company.id } });
      await prisma.$base().user_roles.deleteMany({
        where: { user_id: { in: [hrUser.id, deptMgrUser.id, userA.id] } },
      });
      await prisma.$base().users.deleteMany({ where: { company_id: company.id } });
      await prisma.$base().employees.deleteMany({ where: { company_id: company.id } });
      await prisma.$base().branches.deleteMany({ where: { company_id: company.id } });
      await prisma.$base().company_visas.deleteMany({ where: { company_id: company.id } });
      await prisma.$base().companies.delete({ where: { id: company.id } });
    } catch {}
  });

  it('1. Bulk upload creates NEW documents with valid uploaded_by and no orphan files', async () => {
    const originalPdf = await createValidPdf('Original Emirates ID for Employee A');
    const filename = `${empA.employee_code}_EMIRATES_ID.pdf`;

    // Step A: Upload chunk
    const chunkRes = await request(app)
      .post('/api/v1/employees/documents/bulk-upload/chunk')
      .set('Authorization', `Bearer ${hrToken}`)
      .set('Origin', 'https://localhost')
      .attach('files', originalPdf, filename);

    assert.equal(chunkRes.status, 200);
    const batchId = chunkRes.body.data.batch_id;
    assert.ok(batchId);

    // Step B: Preview batch from batch_id
    const previewRes = await request(app)
      .get(`/api/v1/employees/documents/bulk-upload/batch/${batchId}`)
      .set('Authorization', `Bearer ${hrToken}`);

    assert.equal(previewRes.status, 200);
    assert.equal(previewRes.body.data.summary.matched, 1);
    assert.equal(previewRes.body.data.summary.invalid, 0);

    // Step C: Confirm & Process batch without re-uploading files
    const processRes = await request(app)
      .post('/api/v1/employees/documents/bulk-upload/process')
      .set('Authorization', `Bearer ${hrToken}`)
      .set('Origin', 'https://localhost')
      .send({ batch_id: batchId });

    assert.equal(processRes.status, 200);
    assert.equal(processRes.body.data.success, true);
    assert.equal(processRes.body.data.processed, 1);
    assert.equal(processRes.body.data.created, 1);

    // Verify DB record has uploaded_by populated correctly
    const docInDb = await prisma.$base().employee_documents.findFirst({
      where: { company_id: company.id, employee_id: empA.id, doc_type: 'EMIRATES_ID' },
    });
    assert.ok(docInDb);
    assert.equal(docInDb.uploaded_by, hrUser.id);
    assert.equal(docInDb.verification_status, 'Pending Verification');
    assert.ok(docInDb.file_url);

    // Verify file exists on permanent disk
    const fullPath = path.join(storageService.storageDir, docInDb.file_url);
    assert.ok(fs.existsSync(fullPath));

    // Verify temp batch folder was cleanly removed
    const tmpBatchPath = path.join(process.cwd(), 'storage', 'tmp-batches', batchId);
    assert.ok(!fs.existsSync(tmpBatchPath), 'Temporary batch folder must be deleted after process');
  });

  it('2. Bulk upload updates EXISTING document and archives version in settings_versions', async () => {
    const updatedPdf = await createValidPdf('Updated/Renewed Emirates ID for Employee A');
    const filename = `${empA.employee_code}_EMIRATES_ID_renewed.pdf`;

    const chunkRes = await request(app)
      .post('/api/v1/employees/documents/bulk-upload/chunk')
      .set('Authorization', `Bearer ${hrToken}`)
      .set('Origin', 'https://localhost')
      .attach('files', updatedPdf, filename);

    assert.equal(chunkRes.status, 200);
    const batchId = chunkRes.body.data.batch_id;

    const processRes = await request(app)
      .post('/api/v1/employees/documents/bulk-upload/process')
      .set('Authorization', `Bearer ${hrToken}`)
      .set('Origin', 'https://localhost')
      .send({ batch_id: batchId });

    assert.equal(processRes.status, 200);
    assert.equal(processRes.body.data.processed, 1);
    assert.equal(processRes.body.data.updated, 1);

    // Verify version was archived in settings_versions
    const versionRecord = await prisma.$base().settings_versions.findFirst({
      where: { company_id: company.id, entity_type: 'employee_document' },
    });
    assert.ok(versionRecord, 'Old document version must be archived in settings_versions');
  });

  it('3. BANK_DETAILS restrictions: role protection, audit log sanitization, and download access', async () => {
    const bankPdf = await createValidPdf('IBAN Proof Document AE070331234567890123456');
    const filename = `${empA.employee_code}_BANK_DETAILS.pdf`;

    const chunkRes = await request(app)
      .post('/api/v1/employees/documents/bulk-upload/chunk')
      .set('Authorization', `Bearer ${hrToken}`)
      .set('Origin', 'https://localhost')
      .attach('files', bankPdf, filename);

    assert.equal(chunkRes.status, 200);
    const batchId = chunkRes.body.data.batch_id;

    await request(app)
      .post('/api/v1/employees/documents/bulk-upload/process')
      .set('Authorization', `Bearer ${hrToken}`)
      .set('Origin', 'https://localhost')
      .send({ batch_id: batchId });

    const bankDoc = await prisma.$base().employee_documents.findFirst({
      where: { company_id: company.id, employee_id: empA.id, doc_type: 'BANK_DETAILS' },
    });
    assert.ok(bankDoc);

    // 1. Audit log sanitize check: filename must be BANK_DETAILS_DOCUMENT.pdf, never sensitive name
    const auditLog = await prisma.$base().audit_logs.findFirst({
      where: { record_id: bankDoc.id },
      orderBy: { created_at: 'desc' },
    });
    assert.ok(auditLog);
    assert.equal(auditLog.new_values?.filename, 'BANK_DETAILS_DOCUMENT.pdf');

    // 2. Department Manager (no salary access) cannot download -> 403 Forbidden
    const deptRes = await request(app)
      .get(`/api/v1/employees/${empA.id}/documents/${bankDoc.id}/download`)
      .set('Authorization', `Bearer ${deptMgrToken}`);
    assert.equal(deptRes.status, 403);

    // 3. HR Manager can download -> 200 OK
    const hrRes = await request(app)
      .get(`/api/v1/employees/${empA.id}/documents/${bankDoc.id}/download`)
      .set('Authorization', `Bearer ${hrToken}`);
    assert.equal(hrRes.status, 200);

    // 4. Employee owner can download their own bank document -> 200 OK
    const ownRes = await request(app)
      .get(`/api/v1/me/documents/${bankDoc.id}/download`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert.equal(ownRes.status, 200);
  });

  it('4. Employee self-service multi upload creates new docs with valid uploaded_by', async () => {
    const passportPdf = await createValidPdf('Passport self-service scan');
    const visaPdf = await createValidPdf('Residence Visa self-service scan');

    const res = await request(app)
      .post('/api/v1/me/documents/bulk-upload')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('Origin', 'https://localhost')
      .attach('files', passportPdf, 'PASSPORT.pdf')
      .attach('files', visaPdf, 'RESIDENCE_VISA.pdf');

    assert.equal(res.status, 200);
    assert.equal(res.body.data.processed, 2);

    const docs = await prisma.$base().employee_documents.findMany({
      where: { company_id: company.id, employee_id: empA.id, doc_type: { in: ['PASSPORT', 'RESIDENCE_VISA'] } },
    });
    assert.equal(docs.length, 2);
    for (const d of docs) {
      assert.equal(d.uploaded_by, userA.id);
      assert.equal(d.verification_status, 'Pending Verification');
    }
  });

  it('5. Partial failure: invalid PDF rejected without stopping valid files; leaves 0 orphan files', async () => {
    const validPdf = await createValidPdf('Valid document in mixed batch');
    const maliciousPdf = await createMaliciousPdf();

    const beforeStorageFiles = new Set(fs.readdirSync(storageService.storageDir));

    const chunkRes = await request(app)
      .post('/api/v1/employees/documents/bulk-upload/chunk')
      .set('Authorization', `Bearer ${hrToken}`)
      .set('Origin', 'https://localhost')
      .attach('files', validPdf, `${empA.employee_code}_OTHER_valid.pdf`)
      .attach('files', maliciousPdf, `${empA.employee_code}_OTHER_malicious.pdf`);

    assert.equal(chunkRes.status, 200);
    const batchId = chunkRes.body.data.batch_id;

    // Preview verifies 1 valid, 1 invalid
    const previewRes = await request(app)
      .get(`/api/v1/employees/documents/bulk-upload/batch/${batchId}`)
      .set('Authorization', `Bearer ${hrToken}`);

    assert.equal(previewRes.status, 200);
    assert.equal(previewRes.body.data.summary.matched, 1);
    assert.equal(previewRes.body.data.summary.invalid, 1);

    // Process valid files
    const processRes = await request(app)
      .post('/api/v1/employees/documents/bulk-upload/process')
      .set('Authorization', `Bearer ${hrToken}`)
      .set('Origin', 'https://localhost')
      .send({ batch_id: batchId });

    assert.equal(processRes.status, 200);
    assert.equal(processRes.body.data.processed, 1);

    // Verify storage directory has exactly ONE new file (the valid one), zero orphan for the malicious one
    const afterStorageFiles = fs.readdirSync(storageService.storageDir);
    const addedFiles = afterStorageFiles.filter((f) => !beforeStorageFiles.has(f));
    assert.equal(addedFiles.length, 1, 'Only valid file may be added to storage; malicious file must leave no orphan');
  });

  it('6. Download stored document: exact byte-for-byte fidelity compared to original', async () => {
    const secretContent = `TopSecret_${runId}_${Math.random()}`;
    const testPdf = await createValidPdf(secretContent);

    // Self-service upload
    const upRes = await request(app)
      .post('/api/v1/me/documents')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('Origin', 'https://localhost')
      .attach('file', testPdf, 'ORIGINAL_TEST_DOC.pdf')
      .field('doc_type', 'OTHER')
      .field('doc_number', `NUM-${runId}`);

    assert.ok([200, 201].includes(upRes.status), `Expected status 200 or 201, got ${upRes.status}`);
    const docId = upRes.body.data?.id || upRes.body.id;

    // Download stream
    const downRes = await request(app)
      .get(`/api/v1/me/documents/${docId}/download`)
      .set('Authorization', `Bearer ${tokenA}`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    assert.equal(downRes.status, 200);
    assert.equal(downRes.headers['content-type'], 'application/pdf');

    // Decrypt / compare bytes
    const downloadedBuffer = downRes.body; // Buffer from supertest
    assert.equal(
      Buffer.compare(downloadedBuffer, testPdf),
      0,
      'Downloaded PDF bytes must match original uploaded PDF bytes with 100% fidelity'
    );
  });
});

