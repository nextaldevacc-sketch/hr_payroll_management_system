import prisma from '../backend/src/lib/prisma.js';

async function main() {
  console.log('=== Nextal Demo Database Integrity Verification ===\n');
  const failures = [];

  try {
    const basePrisma = prisma.$base();

    // 1. Check duplicate employees (same employee_code or same name + DOB)
    console.log('1. Checking for duplicate employees...');
    const employees = await basePrisma.employees.findMany({
      select: { id: true, company_id: true, employee_code: true, name: true, birth_date: true },
    });

    const codeMap = new Map();
    const nameDobMap = new Map();
    for (const emp of employees) {
      if (codeMap.has(emp.employee_code)) {
        failures.push(`Duplicate employee_code detected: '${emp.employee_code}' (IDs: ${codeMap.get(emp.employee_code)}, ${emp.id})`);
      }
      codeMap.set(emp.employee_code, emp.id);

      if (emp.birth_date) {
        const key = `${emp.company_id}_${emp.name.toLowerCase()}_${emp.birth_date.toISOString().slice(0, 10)}`;
        if (nameDobMap.has(key)) {
          failures.push(`Duplicate employee name + DOB detected: '${emp.name}' (${key})`);
        }
        nameDobMap.set(key, emp.id);
      }
    }
    console.log(`   Scanned ${employees.length} employees: ${failures.length === 0 ? 'OK' : 'FAIL'}`);

    // 2. Check duplicate IBANs, passports, or Emirates IDs
    console.log('2. Checking for duplicate IBANs, Passports, and Emirates IDs...');
    const bankAccounts = await basePrisma.bank_accounts.findMany({
      select: { id: true, company_id: true, iban: true, employee_id: true },
    });
    const ibanMap = new Map();
    for (const b of bankAccounts) {
      const cleanIban = b.iban.replace(/\s+/g, '').toUpperCase();
      const key = `${b.company_id}_${cleanIban}`;
      if (ibanMap.has(key)) {
        failures.push(`Duplicate IBAN in company: '${cleanIban}' (Account IDs: ${ibanMap.get(key)}, ${b.id})`);
      }
      ibanMap.set(key, b.id);
    }

    const docs = await basePrisma.employee_documents.findMany({
      select: { id: true, company_id: true, doc_type: true, doc_number: true, employee_id: true },
    });
    const docMap = new Map();
    for (const d of docs) {
      if (d.doc_number) {
        const key = `${d.company_id}_${d.doc_type}_${d.doc_number.trim().toUpperCase()}`;
        if (docMap.has(key)) {
          failures.push(`Duplicate document detected: ${d.doc_type} '${d.doc_number}' (Doc IDs: ${docMap.get(key)}, ${d.id})`);
        }
        docMap.set(key, d.id);
      }
    }
    console.log(`   Scanned ${bankAccounts.length} IBANs and ${docs.length} documents: OK`);

    // 3. Check duplicate separations per employee
    console.log('3. Checking for duplicate separations per employee...');
    const separations = await basePrisma.separations.findMany({
      select: { id: true, employee_id: true, status: true },
    });
    const sepMap = new Map();
    for (const s of separations) {
      if (sepMap.has(s.employee_id)) {
        failures.push(`Duplicate separation detected for employee_id: '${s.employee_id}' (Separation IDs: ${sepMap.get(s.employee_id)}, ${s.id})`);
      }
      sepMap.set(s.employee_id, s.id);
    }
    console.log(`   Scanned ${separations.length} separations: OK`);

    // 4. Check duplicate payslips per employee per pay run
    console.log('4. Checking for duplicate payslips per employee per run...');
    const payslips = await basePrisma.payslips.findMany({
      select: { id: true, pay_run_id: true, employee_id: true },
    });
    const psMap = new Map();
    for (const ps of payslips) {
      const key = `${ps.pay_run_id}_${ps.employee_id}`;
      if (psMap.has(key)) {
        failures.push(`Duplicate payslip detected for pay_run ${ps.pay_run_id} and employee ${ps.employee_id}`);
      }
      psMap.set(key, ps.id);
    }
    console.log(`   Scanned ${payslips.length} payslips: OK`);

    // 5. Check duplicate pay runs per visa per month
    console.log('5. Checking for duplicate pay runs per visa per month...');
    const payRuns = await basePrisma.pay_runs.findMany({
      select: { id: true, company_visa_id: true, period_month: true },
    });
    const prMap = new Map();
    for (const pr of payRuns) {
      const key = `${pr.company_visa_id}_${pr.period_month.toISOString().slice(0, 7)}`;
      if (prMap.has(key)) {
        failures.push(`Duplicate pay run detected for visa ${pr.company_visa_id} in month ${key}`);
      }
      prMap.set(key, pr.id);
    }
    console.log(`   Scanned ${payRuns.length} pay runs: OK`);

    // 6. Check test-created users or companies
    console.log('6. Checking for test-created users or companies...');
    const companies = await basePrisma.companies.findMany({ select: { id: true, name: true } });
    for (const c of companies) {
      if (c.name.toLowerCase().includes('test') || c.name.toLowerCase().includes('isolated')) {
        failures.push(`Test company leaked into demo DB: '${c.name}' (${c.id})`);
      }
    }

    const users = await basePrisma.users.findMany({ select: { id: true, email: true } });
    for (const u of users) {
      if (u.email.toLowerCase().includes('test') || u.email.toLowerCase().includes('mock')) {
        failures.push(`Test user leaked into demo DB: '${u.email}' (${u.id})`);
      }
    }
    console.log(`   Scanned ${companies.length} companies and ${users.length} users: OK`);

    // 7. Check audit rows from test runs
    console.log('7. Checking for audit rows from test runs...');
    const auditLogs = await basePrisma.audit_logs.findMany({
      select: { id: true, action: true, table_name: true, ip_address: true, new_values: true },
    });
    for (const log of auditLogs) {
      const raw = JSON.stringify(log, (key, value) => typeof value === 'bigint' ? value.toString() : value).toLowerCase();
      if (raw.includes('supertest') || raw.includes('playwright') || raw.includes('mocha') || raw.includes('jest')) {
        failures.push(`Test audit log leaked into demo DB (ID: ${log.id}, action: ${log.action})`);
      }
    }
    console.log(`   Scanned ${auditLogs.length} audit logs: OK`);

    console.log('\n-----------------------------------------------------');
    if (failures.length > 0) {
      console.error(`FAILED: Found ${failures.length} integrity violations:`);
      failures.forEach((f, idx) => console.error(`  [${idx + 1}] ${f}`));
      process.exit(1);
    } else {
      console.log('PASS: Demo database integrity verified with ZERO violations.');
      console.log(`Summary:
  Companies      : ${companies.length}
  Employees      : ${employees.length}
  Bank Accounts  : ${bankAccounts.length}
  Documents      : ${docs.length}
  Separations    : ${separations.length}
  Pay Runs       : ${payRuns.length}
  Payslips       : ${payslips.length}
  Audit Logs     : ${auditLogs.length}`);
      process.exit(0);
    }
  } catch (err) {
    console.error('Integrity check script error:', err);
    process.exit(1);
  } finally {
    await prisma.$base().$disconnect();
  }
}

main();
