import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import ExcelJS from 'exceljs';
import app from '../../src/app.js';
import prisma from '../../src/lib/prisma.js';
import { generateValidUaeIban } from '../../prisma/seed/employees.js';

describe('Employee Bulk Import (Prompt 6 Step 3)', () => {
  let company;
  let hrMgrToken;
  let adminToken;
  let deptMgrToken;
  let employeeToken;
  let branch;
  let dept;
  let visa;

  const password = 'Nextal@2026!';

  async function login(email) {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password });
    assert.equal(res.status, 200, `Login failed for ${email}`);
    return res.body.token;
  }

  before(async () => {
    company = await prisma.$base().companies.findFirst({
      where: { name: 'Gulf Tech Logistics LLC' },
    });
    assert(company, 'Gulf Tech Logistics LLC must exist');

    branch = await prisma.$base().branches.findFirst({ where: { company_id: company.id } });
    dept = await prisma.$base().departments.findFirst({ where: { company_id: company.id } });
    visa = await prisma.$base().company_visas.findFirst({ where: { company_id: company.id } });

    assert(branch && dept && visa, 'Company branches, departments, visas must exist');

    hrMgrToken = await login('hr.mgr@gulftech.ae');
    adminToken = await login('admin@gulftech.ae');
    deptMgrToken = await login('dept.mgr@gulftech.ae');
    employeeToken = await login('employee@gulftech.ae');
  });

  after(async () => {
    // Cleanup any imported test employees
    const testEmails = [
      'import.test.1@gulftech.ae',
      'import.test.2@gulftech.ae',
      'import.test.xlsx@gulftech.ae',
      'formula.inject@gulftech.ae',
      'bad.iban@gulftech.ae',
      'dup.file@gulftech.ae',
    ];
    const emps = await prisma.$base().employees.findMany({
      where: { company_id: company.id, work_email: { in: testEmails } },
      select: { id: true },
    });
    const ids = emps.map((e) => e.id);
    if (ids.length > 0) {
      await prisma.$base().users.updateMany({
        where: { employee_id: { in: ids } },
        data: { employee_id: null },
      });
      await prisma.$base().user_roles.deleteMany({
        where: { user: { email: { in: testEmails } } },
      });
      await prisma.$base().users.deleteMany({
        where: { email: { in: testEmails } },
      });
      await prisma.$base().bank_accounts.deleteMany({
        where: { employee_id: { in: ids } },
      });
      await prisma.$base().employee_documents.deleteMany({
        where: { employee_id: { in: ids } },
      });
      await prisma.$base().contracts.deleteMany({
        where: { employee_id: { in: ids } },
      });
      await prisma.$base().employees.deleteMany({
        where: { id: { in: ids } },
      });
    }
  });

  it('1. GET /api/v1/employees/import/template returns XLSX and CSV templates', async () => {
    const resXlsx = await request(app)
      .get('/api/v1/employees/import/template?format=xlsx')
      .set('Authorization', `Bearer ${hrMgrToken}`);
    assert.equal(resXlsx.status, 200);
    assert(resXlsx.headers['content-type'].includes('spreadsheetml'));

    const resCsv = await request(app)
      .get('/api/v1/employees/import/template?format=csv')
      .set('Authorization', `Bearer ${hrMgrToken}`);
    assert.equal(resCsv.status, 200);
    assert(resCsv.headers['content-type'].includes('text/csv'));
    assert(resCsv.text.includes('First Name'));
    assert(resCsv.text.includes('Work Email'));
  });

  it('2. Unauthorized roles (EMPLOYEE, DEPT_MANAGER) get 403 Forbidden', async () => {
    const dummyCsv = Buffer.from('first_name,last_name,email\nTest,User,t@t.ae');
    const resEmp = await request(app)
      .post('/api/v1/employees/import')
      .set('Authorization', `Bearer ${employeeToken}`)
      .attach('file', dummyCsv, 'test.csv');
    assert.equal(resEmp.status, 403);

    const resDept = await request(app)
      .post('/api/v1/employees/import')
      .set('Authorization', `Bearer ${deptMgrToken}`)
      .attach('file', dummyCsv, 'test.csv');
    assert.equal(resDept.status, 403);
  });

  it('3. Rejects formula injection attempts (=, +, -, @)', async () => {
    const headers = 'first_name,last_name,email,nationality,emirates_id,branch,department,joining_date,basic_salary';
    const row = `=cmd|' /C calc'!A1,Tester,formula.inject@gulftech.ae,AE,784-1990-1111111-1,"${branch.name}","${dept.name}",2024-01-01,5000`;
    const csvBuffer = Buffer.from(`${headers}\n${row}\n`);

    const res = await request(app)
      .post('/api/v1/employees/import/validate')
      .set('Authorization', `Bearer ${hrMgrToken}`)
      .attach('file', csvBuffer, 'formula.csv');

    assert.equal(res.status, 400);
    assert(res.body.errors.some((e) => e.message.includes('Formula injection forbidden')));
  });

  it('4. Rejects invalid UAE IBAN (fails ISO 7064 mod-97)', async () => {
    const headers = 'first_name,last_name,email,nationality,emirates_id,branch,department,joining_date,basic_salary,bank_name,iban';
    const row = `Salim,BadIban,bad.iban@gulftech.ae,AE,784-1990-2222222-2,"${branch.name}","${dept.name}",2024-01-01,5000,Emirates NBD,AE070331000000000999999`;
    const csvBuffer = Buffer.from(`${headers}\n${row}\n`);

    const res = await request(app)
      .post('/api/v1/employees/import/validate')
      .set('Authorization', `Bearer ${hrMgrToken}`)
      .attach('file', csvBuffer, 'bad-iban.csv');

    assert.equal(res.status, 400);
    assert(res.body.errors.some((e) => e.field === 'iban' && e.message.includes('Mod-97')));
  });

  it('5. Rejects duplicate emails within the file', async () => {
    const headers = 'first_name,last_name,email,nationality,emirates_id,branch,department,joining_date,basic_salary';
    const row1 = `User,One,dup.file@gulftech.ae,AE,784-1990-3333333-3,"${branch.name}","${dept.name}",2024-01-01,5000`;
    const row2 = `User,Two,dup.file@gulftech.ae,AE,784-1990-4444444-4,"${branch.name}","${dept.name}",2024-01-01,5000`;
    const csvBuffer = Buffer.from(`${headers}\n${row1}\n${row2}\n`);

    const res = await request(app)
      .post('/api/v1/employees/import/validate')
      .set('Authorization', `Bearer ${hrMgrToken}`)
      .attach('file', csvBuffer, 'dup-emails.csv');

    assert.equal(res.status, 400);
    assert(res.body.errors.some((e) => e.field === 'email' && e.message.includes('Duplicate email')));
  });

  it('6. Rejects email already existing in the company', async () => {
    const headers = 'first_name,last_name,email,nationality,emirates_id,branch,department,joining_date,basic_salary';
    const row = `Admin,Duplicate,admin@gulftech.ae,AE,784-1990-5555555-5,"${branch.name}","${dept.name}",2024-01-01,5000`;
    const csvBuffer = Buffer.from(`${headers}\n${row}\n`);

    const res = await request(app)
      .post('/api/v1/employees/import/validate')
      .set('Authorization', `Bearer ${hrMgrToken}`)
      .attach('file', csvBuffer, 'existing-email.csv');

    assert.equal(res.status, 400);
    assert(res.body.errors.some((e) => e.field === 'email' && e.message.includes('already exists')));
  });

  it('7. Dry-Run validation succeeds and creates 0 database records', async () => {
    const validIban = generateValidUaeIban('033', '9000000000000001');
    const headers = 'first_name,last_name,email,nationality,emirates_id,branch,department,joining_date,basic_salary,housing_allowance,bank_name,iban';
    const row = `Valid,DryRun,import.test.1@gulftech.ae,AE,784-1991-6666666-6,"${branch.name}","${dept.name}",2024-02-01,6000,2000,Emirates NBD,${validIban}`;
    const csvBuffer = Buffer.from(`${headers}\n${row}\n`);

    const res = await request(app)
      .post('/api/v1/employees/import/validate')
      .set('Authorization', `Bearer ${hrMgrToken}`)
      .attach('file', csvBuffer, 'dryrun.csv');

    assert.equal(res.status, 200);
    assert.equal(res.body.dryRun, true);
    assert.equal(res.body.validRows, 1);
    assert.equal(res.body.invalidRows, 0);

    // Verify employee was NOT created in DB
    const empInDb = await prisma.$base().employees.findFirst({
      where: { company_id: company.id, work_email: 'import.test.1@gulftech.ae' },
    });
    assert.equal(empInDb, null, 'Dry-run must not create employee in database');
  });

  it('8. Atomic rollback: if any row fails during real import, 0 rows are created', async () => {
    const validIban = generateValidUaeIban('033', '9000000000000002');
    const headers = 'first_name,last_name,email,nationality,emirates_id,branch,department,joining_date,basic_salary,bank_name,iban';
    const rowValid = `Valid,Row,import.test.2@gulftech.ae,AE,784-1992-7777777-7,"${branch.name}","${dept.name}",2024-02-01,6000,Emirates NBD,${validIban}`;
    const rowInvalid = `Invalid,Row,import.test.fail@gulftech.ae,AE,BAD-EMIRATES-ID,"${branch.name}","${dept.name}",2024-02-01,6000,,`;
    const csvBuffer = Buffer.from(`${headers}\n${rowValid}\n${rowInvalid}\n`);

    const res = await request(app)
      .post('/api/v1/employees/import?dryRun=false')
      .set('Authorization', `Bearer ${hrMgrToken}`)
      .attach('file', csvBuffer, 'rollback.csv');

    assert.equal(res.status, 400);

    // Verify rowValid was NOT committed
    const empInDb = await prisma.$base().employees.findFirst({
      where: { company_id: company.id, work_email: 'import.test.2@gulftech.ae' },
    });
    assert.equal(empInDb, null, 'Atomic rollback must ensure 0 records written on failure');
  });

  it('9. Real CSV import creates employee, contract, bank, user, documents, and audit log', async () => {
    const validIban = generateValidUaeIban('033', '9000000000000003');
    const headers = 'first_name,last_name,email,phone,gender,nationality,emirates_id,branch,department,job_title,joining_date,basic_salary,housing_allowance,bank_name,iban';
    const row = `Tariq,Mansoor,import.test.1@gulftech.ae,+971501234567,Male,AE,784-1991-8888888-8,"${branch.name}","${dept.name}",Logistics Officer,2024-03-01,7500,2500,Emirates NBD,${validIban}`;
    const csvBuffer = Buffer.from(`${headers}\n${row}\n`);

    const res = await request(app)
      .post('/api/v1/employees/import?dryRun=false')
      .set('Authorization', `Bearer ${hrMgrToken}`)
      .attach('file', csvBuffer, 'real-import.csv');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.importedCount, 1);
    assert(res.body.credentials && res.body.credentials.length === 1);
    assert(res.body.credentials[0].tempPassword);

    // 1. Verify Employee
    const emp = await prisma.$base().employees.findFirst({
      where: { company_id: company.id, work_email: 'import.test.1@gulftech.ae' },
    });
    assert(emp, 'Employee record must be created');
    assert.equal(emp.name, 'Tariq Mansoor');
    assert.equal(emp.residency_type, 'UAENational');

    // 2. Verify Contract
    const contract = await prisma.$base().contracts.findFirst({
      where: { company_id: company.id, employee_id: emp.id },
    });
    assert(contract, 'Contract record must be created');
    assert.equal(Number(contract.basic), 7500);
    assert.equal(Number(contract.housing), 2500);
    assert.equal(Number(contract.gross), 10000);

    // 3. Verify Bank Account
    const bank = await prisma.$base().bank_accounts.findFirst({
      where: { company_id: company.id, employee_id: emp.id },
    });
    assert(bank, 'Bank account must be created');
    assert.equal(bank.iban, validIban);

    // 4. Verify Emirates ID document
    const doc = await prisma.$base().employee_documents.findFirst({
      where: { company_id: company.id, employee_id: emp.id, doc_type: 'EMIRATES_ID' },
    });
    assert(doc, 'Emirates ID document must be created');
    assert.equal(doc.doc_number, '784-1991-8888888-8');

    // 5. Verify User Login created with temporary password
    const user = await prisma.$base().users.findFirst({
      where: { company_id: company.id, email: 'import.test.1@gulftech.ae' },
      include: { user_roles: { include: { role: true } } },
    });
    assert(user, 'User login must be created');
    assert.equal(user.must_change_password, true);
    assert(user.user_roles.some((ur) => ur.role.code === 'EMPLOYEE'));

    // 6. Verify Audit Log EMPLOYEE_BULK_IMPORT
    const audit = await prisma.$base().audit_logs.findFirst({
      where: {
        company_id: company.id,
        action: 'EMPLOYEE_BULK_IMPORT',
      },
      orderBy: { created_at: 'desc' },
    });
    assert(audit, 'Audit log EMPLOYEE_BULK_IMPORT must be recorded');
  });

  it('10. Real XLSX import creates employee record', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Employee Import');
    const headers = [
      'first_name',
      'last_name',
      'email',
      'nationality',
      'emirates_id',
      'branch',
      'department',
      'joining_date',
      'basic_salary',
    ];
    ws.addRow(headers);
    ws.addRow([
      'Amira',
      'Kassim',
      'import.test.xlsx@gulftech.ae',
      'AE',
      '784-1994-9999999-9',
      branch.name,
      dept.name,
      '2024-04-01',
      8500,
    ]);

    const xlsxBuffer = await wb.xlsx.writeBuffer();

    const res = await request(app)
      .post('/api/v1/employees/import?dryRun=false')
      .set('Authorization', `Bearer ${hrMgrToken}`)
      .attach('file', Buffer.from(xlsxBuffer), 'import.xlsx');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.importedCount, 1);

    const emp = await prisma.$base().employees.findFirst({
      where: { company_id: company.id, work_email: 'import.test.xlsx@gulftech.ae' },
    });
    assert(emp, 'Employee from XLSX must be created');
    assert.equal(emp.name, 'Amira Kassim');
  });
});
