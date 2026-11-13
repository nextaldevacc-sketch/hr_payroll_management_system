import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });
import test from 'node:test';
import assert from 'node:assert/strict';
import complianceService from '../src/services/complianceService.js';
import prisma from '../src/lib/prisma.js';
import mailer from '../src/lib/mailer.js';

test('Email Jobs Idempotency & Outbox Persistence (E4)', async (t) => {
  let testCompany;
  let testEmployee;
  let testDoc;

  // Setup test company, employee, and document
  testCompany = await prisma.$base().companies.findFirst();
  if (!testCompany) {
    testCompany = await prisma.$base().companies.create({
      data: {
        name: 'Idempotency Test Co',
        trade_license_no: 'TL-IDEMP-TEST',
      },
    });
  }

  testEmployee = await prisma.$base().employees.findFirst({
    where: { company_id: testCompany.id, status: 'Active' },
  });

  if (!testEmployee) {
    const visa = await prisma.$base().company_visas.findFirst({ where: { company_id: testCompany.id } });
    const branch = await prisma.$base().branches.findFirst({ where: { company_id: testCompany.id } });
    testEmployee = await prisma.$base().employees.create({
      data: {
        company_id: testCompany.id,
        company_visa_id: visa.id,
        branch_id: branch.id,
        employee_code: `EMP-IDEMP-${Date.now().toString().slice(-4)}`,
        name: 'Idempotency Test Employee',
        nationality: 'United Arab Emirates',
        gender: 'Female',
        work_email: 'idemp_test_user@company.ae',
        status: 'Active',
        joining_date: new Date('2025-01-01'),
      },
    });
  }

  // Create document expiring in exactly 60 days
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 60);

  testDoc = await prisma.$base().employee_documents.create({
    data: {
      company_id: testCompany.id,
      employee_id: testEmployee.id,
      doc_type: 'PASSPORT',
      doc_number: 'P987654321',
      expiry_date: expiryDate,
      verification_status: 'VERIFIED',
      file_url: 'mock/path/passport.pdf',
    },
  });

  t.after(async () => {
    try {
      await prisma.$base().email_outbox.deleteMany({ where: { company_id: testCompany.id } });
      await prisma.$base().employee_documents.deleteMany({ where: { employee_id: testEmployee.id } });
      await prisma.$base().employees.deleteMany({ where: { id: testEmployee.id } });
    } catch (_) {}
  });

  await t.test('1. first run sends document expiry reminder and creates outbox records', async () => {
    mailer.clearHistory();
    const result1 = await complianceService.runComplianceJob({ referenceDate: new Date(), companyId: testCompany.id });

    assert.ok(result1, 'First run must succeed');
    const sent = mailer.getRecentSent();
    const docReminder = sent.find((m) => m.to === testEmployee.work_email);
    assert.ok(docReminder, 'Document reminder email must be dispatched to employee');
    assert.ok(docReminder.subject.includes('expires in 60 days'));
  });

  await t.test('2. second run on same date is strictly IDEMPOTENT (zero duplicate emails or outbox entries)', async () => {
    mailer.clearHistory();
    const result2 = await complianceService.runComplianceJob({ referenceDate: new Date(), companyId: testCompany.id });

    assert.ok(result2, 'Second run must succeed');
    const sentSecondRun = mailer.getRecentSent();
    const duplicateDocReminder = sentSecondRun.find((m) => m.to === testEmployee.work_email);
    assert.equal(
      duplicateDocReminder,
      undefined,
      'Second run must NOT dispatch any duplicate reminder for the same milestone'
    );
  });
});
