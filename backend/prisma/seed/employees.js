import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DOCS = path.resolve(__dirname, '../../storage/documents');

function ensureDemoPlaceholderPdf() {
  if (!fs.existsSync(STORAGE_DOCS)) {
    fs.mkdirSync(STORAGE_DOCS, { recursive: true });
  }
  const placeholderPath = path.join(STORAGE_DOCS, 'seed_placeholder.pdf');
  if (!fs.existsSync(placeholderPath)) {
    const minimalPdf = Buffer.from(
      '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n160\n%%EOF'
    );
    fs.writeFileSync(placeholderPath, minimalPdf);
  }
  return '/storage/documents/seed_placeholder.pdf';
}

/**
 * Generate a valid ISO 7064 Mod-97 UAE IBAN (23 characters: AE + 2 check digits + 3 bank code + 16 account)
 */
export function generateValidUaeIban(bankCode, accountSeq) {
  const b = String(bankCode).padStart(3, '0');
  const a = String(accountSeq).padStart(16, '0');
  const checkStr = b + a + '101400';
  const rem = BigInt(checkStr) % 97n;
  const cd = String(98n - rem).padStart(2, '0');
  return 'AE' + cd + b + a;
}

/**
 * Validate a UAE IBAN according to ISO 7064 Mod-97
 */
export function validateUaeIban(iban) {
  if (!iban || typeof iban !== 'string') return false;
  const clean = iban.replace(/[\s-]/g, '').toUpperCase();
  if (!/^AE\d{21}$/.test(clean)) return false;
  const rearranged = clean.slice(4) + '1014' + clean.slice(2, 4);
  return BigInt(rearranged) % 97n === 1n;
}

/**
 * Seed Module: Employees
 * Seeds 42 employees for Company 1 and 10 employees for Company 2
 */
export async function seedEmployees(prisma, {
  company1,
  visas1,
  branches1,
  depts1,
  jobs1,
  shift1,
  policy1,
  salaryStructure1,
  leaveTypesMap1,
  accrualPlan1,
  demoUsersMap,
  rolesMap,
  company2,
  visa2,
  branch2,
  dept2,
  job2,
  shift2,
  policy2,
  salaryStructure2,
  leaveType2,
  accrualPlan2,
}) {
  console.log('Seeding 45 employees for Company 1...');
  const userHR1 = demoUsersMap['hr.mgr@gulftech.ae'];
  const placeholderUrl = ensureDemoPlaceholderPdf();

  const employeeNames = [
    { name: 'Rashid Al-Falasi', name_ar: 'راشد الفلاسي', nat: 'ARE', gender: 'Male', uae: true, job: jobs1.jobHR, dept: depts1['HR & Admin'], gross: 25000 },
    { name: 'Fatima Al-Mazrouei', name_ar: 'فاطمة المزروعي', nat: 'ARE', gender: 'Female', uae: true, job: jobs1.jobEng, dept: depts1['Engineering'], gross: 22000 },
    { name: 'Mansour Al-Ketbi', name_ar: 'منصور الكتبي', nat: 'ARE', gender: 'Male', uae: true, job: jobs1.jobOps, dept: depts1['Operations'], gross: 18000 },
    { name: 'Mariam Al-Zaabi', name_ar: 'مريم الزعابي', nat: 'ARE', gender: 'Female', uae: true, job: jobs1.jobSales, dept: depts1['Sales & Support'], gross: 19000 },
    { name: 'Alexander Wright', name_ar: 'ألكسندر رايت', nat: 'GBR', gender: 'Male', uae: false, job: jobs1.jobEng, dept: depts1['Engineering'], gross: 16000 },
    { name: 'Rajesh Sharma', name_ar: 'راجيش شارما', nat: 'IND', gender: 'Male', uae: false, job: jobs1.jobFin, dept: depts1['Finance'], gross: 14000 },
    { name: 'Sarah Jenkins', name_ar: 'سارة جينكينز', nat: 'GBR', gender: 'Female', uae: false, job: jobs1.jobFin, dept: depts1['Finance'], gross: 15500 },
    { name: 'Muhammad Tariq', name_ar: 'محمد طارق', nat: 'PAK', gender: 'Male', uae: false, job: jobs1.jobOps, dept: depts1['Operations'], gross: 7500 },
    { name: 'Omar Farooq', name_ar: 'عمر فاروق', nat: 'EGY', gender: 'Male', uae: false, job: jobs1.jobOps, dept: depts1['Operations'], gross: 8000 },
    { name: 'Kareem Abdelaziz', name_ar: 'كريم عبدالعزيز', nat: 'EGY', gender: 'Male', uae: false, job: jobs1.jobSales, dept: depts1['Sales & Support'], gross: 8500 },
    { name: 'Vikram Patel', name_ar: 'فيكرام باتيل', nat: 'IND', gender: 'Male', uae: false, job: jobs1.jobFleet, dept: depts1['Logistics & Fleet'], gross: 6500 },
    { name: 'Anil Kumar', name_ar: 'أنيل كومار', nat: 'IND', gender: 'Male', uae: false, job: jobs1.jobFleet, dept: depts1['Logistics & Fleet'], gross: 6000 },
  ];

  const deptCycle = [
    { dept: depts1['Operations'], job: jobs1.jobOps },
    { dept: depts1['Engineering'], job: jobs1.jobEng },
    { dept: depts1['Logistics & Fleet'], job: jobs1.jobFleet },
    { dept: depts1['Sales & Support'], job: jobs1.jobSales },
    { dept: depts1['Finance'], job: jobs1.jobFin },
    { dept: depts1['HR & Admin'], job: jobs1.jobHR },
  ];

  const seededEmployees = [];
  const seededContracts = [];
  let totalSeededGross = 0;

  for (let i = 1; i <= 45; i++) {
    const code = `EMP-DXB-${String(i).padStart(3, '0')}`;
    const targetVisa = (i <= 30 || i === 43 || i === 45) ? visas1.visa1_01 : visas1.visa1_02;
    const targetBranch = (i <= 30 || i === 43 || i === 45) ? branches1.branch1_main : branches1.branch1_difc;

    let baseInfo;
    if (i <= employeeNames.length) {
      baseInfo = employeeNames[i - 1];
    } else if (i === 42) {
      baseInfo = {
        name: 'Omar Al-Hashimi',
        name_ar: 'عمر الهاشمي',
        nat: 'ARE',
        gender: 'Male',
        uae: true,
        job: jobs1.jobOps,
        dept: depts1['Operations'],
        gross: 10000,
        basic: 6000,
        housing: 3000,
        trans: 1000,
        oth: 0,
        joining_date: new Date('2019-11-03'),
      };
    } else if (i === 43) {
      baseInfo = {
        name: 'Ahmed Al-Mansoori',
        name_ar: 'أحمد المنصوري',
        nat: 'EGY',
        gender: 'Male',
        uae: false,
        job: jobs1.jobOps,
        dept: depts1['Operations'],
        gross: 8000,
        basic: 5000,
        housing: 2000,
        trans: 500,
        oth: 500,
        joining_date: new Date('2024-01-15'),
      };
    } else if (i === 44) {
      baseInfo = {
        name: 'Sara Al-Nuaimi',
        name_ar: 'سارة النعيمي',
        nat: 'GBR',
        gender: 'Female',
        uae: false,
        job: jobs1.jobSales,
        dept: depts1['Sales & Support'],
        gross: 8000,
        basic: 5000,
        housing: 2000,
        trans: 500,
        oth: 500,
        joining_date: new Date('2023-05-01'), // 3 yrs 6 mos to 2026-10-31
      };
    } else if (i === 45) {
      baseInfo = {
        name: 'Tariq Mansoor',
        name_ar: 'طارق منصور',
        nat: 'ARE',
        gender: 'Male',
        uae: true,
        job: jobs1.jobOps,
        dept: depts1['Operations'],
        gross: 7000,
        basic: 4200,
        housing: 2100,
        trans: 350,
        oth: 350,
        joining_date: new Date('2026-11-01'), // Joins Nov 1, 2026 -> excluded from Sep & Oct pay runs, included in Nov pay run without bank account (T28)
      };
    } else {
      const cycleItem = deptCycle[(i - 13) % deptCycle.length];
      baseInfo = {
        name: `Logistics Associate ${i}`,
        name_ar: `مساعد لوجستي ${i}`,
        nat: i % 3 === 0 ? 'PHL' : i % 2 === 0 ? 'IND' : 'PAK',
        gender: i % 4 === 0 ? 'Female' : 'Male',
        uae: false,
        job: cycleItem.job,
        dept: cycleItem.dept,
        gross: i <= 32 ? 5500 : 6000,
      };
    }

    const basic = baseInfo.basic !== undefined ? baseInfo.basic : Math.round(baseInfo.gross * 0.60);
    const housing = baseInfo.housing !== undefined ? baseInfo.housing : Math.round(baseInfo.gross * 0.30);
    const trans = baseInfo.trans !== undefined ? baseInfo.trans : Math.round(baseInfo.gross * 0.05);
    const oth = baseInfo.oth !== undefined ? baseInfo.oth : (baseInfo.gross - (basic + housing + trans));
    const empGross = basic + housing + trans + oth;

    const emp = await prisma.employees.create({
      data: {
        company_id: company1.id,
        employee_code: code,
        name: baseInfo.name,
        arabic_name: baseInfo.name_ar,
        legal_name: baseInfo.name,
        status: 'Active',
        joining_date: baseInfo.joining_date || (i >= 40 && i <= 42 ? new Date('2026-10-01') : new Date('2024-01-15')),
        residency_type: (i <= 4 || baseInfo.uae) ? 'UAENational' : 'Expat',
        nationality: baseInfo.nat,
        gender: baseInfo.gender,
        birth_date: new Date('1990-05-15'),
        mohre_person_id: `MOHRE${String(1000000 + i)}`,
        company_visa_id: targetVisa.id,
        branch_id: targetBranch.id,
        work_email: i === 42 ? 'omar.alhashimi@gulftech.ae' : i === 43 ? 'ahmed.mansoori@gulftech.ae' : i === 44 ? 'sara.nuaimi@gulftech.ae' : `emp${i}@gulftech.ae`,
        mobile: `+97150${String(1000000 + i).substring(1)}`,
      },
    });
    seededEmployees.push(emp);

    // Contract (Versioned contracts, 2 versions for 5 employees)
    const isRaisedEmployee = i <= 5; // Exactly 5 employees (i = 1..5)
    let activeContract;

    if (isRaisedEmployee) {
      const priorGross = Math.round(empGross * 0.85);
      const pBasic = Math.round(priorGross * 0.60);
      const pHousing = Math.round(priorGross * 0.30);
      const pTrans = Math.round(priorGross * 0.05);
      const pOth = priorGross - (pBasic + pHousing + pTrans);

      // Contract 1: active from 2024-01-15
      await prisma.contracts.create({
        data: {
          company_id: company1.id,
          employee_id: emp.id,
          version_no: 1,
          effective_date: new Date('2024-01-15'),
          contract_type: 'Limited',
          start_date: new Date('2024-01-15'),
          job_id: baseInfo.job.id,
          department_id: baseInfo.dept.id,
          shift_id: shift1.id,
          attendance_policy_id: policy1.id,
          structure_id: salaryStructure1.id,
          basic: pBasic,
          housing: pHousing,
          transport: pTrans,
          other_allowances: pOth,
          gross: priorGross,
          status: 'Superseded',
        },
      });

      // Contract 2: Raise effective 2026-06-01 for employees 1-4, and 2026-10-01 for employee 5
      const raiseEffectiveDate = i === 5 ? new Date('2026-10-01') : new Date('2026-06-01');

      const contract2 = await prisma.contracts.create({
        data: {
          company_id: company1.id,
          employee_id: emp.id,
          version_no: 2,
          effective_date: raiseEffectiveDate,
          contract_type: 'Limited',
          start_date: raiseEffectiveDate,
          job_id: baseInfo.job.id,
          department_id: baseInfo.dept.id,
          shift_id: shift1.id,
          attendance_policy_id: policy1.id,
          structure_id: salaryStructure1.id,
          basic: basic,
          housing: housing,
          transport: trans,
          other_allowances: oth,
          gross: empGross,
          status: 'Approved',
        },
      });
      activeContract = contract2;
    } else {
      const contractStartDate = baseInfo.joining_date || (i >= 40 ? new Date('2026-10-01') : new Date('2024-01-15'));
      const contract1 = await prisma.contracts.create({
        data: {
          company_id: company1.id,
          employee_id: emp.id,
          version_no: 1,
          effective_date: contractStartDate,
          contract_type: i === 42 ? 'Unlimited' : 'Limited',
          start_date: contractStartDate,
          job_id: baseInfo.job.id,
          department_id: baseInfo.dept.id,
          shift_id: shift1.id,
          attendance_policy_id: policy1.id,
          structure_id: salaryStructure1.id,
          basic: basic,
          housing: housing,
          transport: trans,
          other_allowances: oth,
          gross: empGross,
          status: 'Approved',
        },
      });
      activeContract = contract1;
    }
    seededContracts.push(activeContract);
    totalSeededGross += empGross;

    // Bank accounts: all employees except EMP-DXB-045 (Tariq Mansoor, joins Nov 2026) have valid mod-97 UAE IBANs
    // EMP-DXB-045 is seeded with NO bank account as a natural fixture for T28 (missing IBAN in November pay run)
    if (i !== 45) {
      const iban = generateValidUaeIban('033', 1000000000 + i);
      if (!validateUaeIban(iban)) {
        throw new Error(`Invalid generated UAE IBAN for employee ${code}: ${iban}`);
      }

      await prisma.bank_accounts.create({
        data: {
          company_id: company1.id,
          employee_id: emp.id,
          bank_name: 'Emirates NBD',
          iban: iban,
          routing_code: 'ENBD001',
          salary_split_pct: 100.00,
          is_primary: true,
          is_active: true,
        },
      });
    }

    // Device mapping
    await prisma.device_mappings.create({
      data: {
        company_id: company1.id,
        device_code: `DEV-${String(i).padStart(3, '0')}`,
        employee_id: emp.id,
      },
    });

    // Realistic UAE Documents:
    // Target alerts: Total 10 (1 Expired, 2 <=30d, 4 <=60d, 3 <=90d)
    const baseNow = new Date();
    let eidDays = 180 + (i * 10);
    let passportDays = 365 + (i * 15);
    let labourDays = 250 + (i * 10);

    if (i === 10) eidDays = -2;
    else if (i === 11) labourDays = 14;
    else if (i === 12) passportDays = 25;
    else if (i === 13) eidDays = 40;
    else if (i === 14) labourDays = 45;
    else if (i === 15) passportDays = 50;
    else if (i === 16) eidDays = 55;
    else if (i === 17) labourDays = 70;
    else if (i === 18) passportDays = 75;
    else if (i === 19) eidDays = 85;

    const calcStatus = (days) => (days < 0 ? 'Expired' : days <= 90 ? 'Expiring Soon' : 'Valid');

    // 1. Emirates ID
    const eidExpiry = new Date(baseNow);
    eidExpiry.setDate(eidExpiry.getDate() + eidDays);
    await prisma.employee_documents.create({
      data: {
        company_id: company1.id,
        employee_id: emp.id,
        doc_type: 'EMIRATES_ID',
        doc_number: `784-1990-${String(1000000 + i).substring(1)}-1`,
        expiry_date: eidExpiry,
        file_url: placeholderUrl,
        owner_id: userHR1.id,
        status: calcStatus(eidDays),
        verification_status: 'Verified',
      },
    });

    // 2. Passport
    const passportExpiry = new Date(baseNow);
    passportExpiry.setDate(passportExpiry.getDate() + passportDays);
    await prisma.employee_documents.create({
      data: {
        company_id: company1.id,
        employee_id: emp.id,
        doc_type: 'PASSPORT',
        doc_number: `A${String(1000000 + i)}`,
        expiry_date: passportExpiry,
        file_url: placeholderUrl,
        owner_id: userHR1.id,
        status: calcStatus(passportDays),
        verification_status: 'Verified',
      },
    });

    // 3. MOHRE Labour Card
    const labourExpiry = new Date(baseNow);
    labourExpiry.setDate(labourExpiry.getDate() + labourDays);
    await prisma.employee_documents.create({
      data: {
        company_id: company1.id,
        employee_id: emp.id,
        doc_type: 'LABOUR_CARD',
        doc_number: `LC-${String(2000000 + i)}`,
        expiry_date: labourExpiry,
        file_url: placeholderUrl,
        owner_id: userHR1.id,
        status: calcStatus(labourDays),
        verification_status: 'Verified',
      },
    });

    // Leave allocations
    await prisma.leave_allocations.create({
      data: {
        company_id: company1.id,
        employee_id: emp.id,
        leave_type_id: leaveTypesMap1['ANNUAL'].id,
        allocation_type: 'Regular',
        accrual_plan_id: accrualPlan1.id,
        days_allocated: 30.00,
        days_taken: emp.employee_code === 'EMP-DXB-043' ? 0.00 : (i % 5),
        valid_from: new Date('2026-01-01'),
        valid_to: new Date('2026-12-31'),
      },
    });
  }

  // Link staff logins to real seeded employee records (Spec 5.3 & RC3 Part 3 follow-up)
  const staffLinks = [
    { email: 'hr.mgr@gulftech.ae', code: 'EMP-DXB-001' },
    { email: 'hr.officer@gulftech.ae', code: 'EMP-DXB-002' },
    { email: 'dept.mgr@gulftech.ae', code: 'EMP-DXB-003' },
    { email: 'gm@gulftech.ae', code: 'EMP-DXB-005' },
    { email: 'payroll@gulftech.ae', code: 'EMP-DXB-006' },
    { email: 'finance@gulftech.ae', code: 'EMP-DXB-007' },
    { email: 'employee@gulftech.ae', code: 'EMP-DXB-043' }, // Ahmed Al-Mansoori
  ];

  for (const link of staffLinks) {
    const targetEmp = seededEmployees.find((e) => e.employee_code === link.code);
    const targetUser = demoUsersMap[link.email];
    if (targetEmp && targetUser) {
      await prisma.users.update({
        where: { id: targetUser.id },
        data: { employee_id: targetEmp.id },
      });
    }
  }

  // Set Operations department manager to EMP-DXB-003 (Mansour Al-Ketbi)
  const deptMgrEmp = seededEmployees.find((e) => e.employee_code === 'EMP-DXB-003');
  if (deptMgrEmp && depts1['Operations']) {
    await prisma.departments.update({
      where: { id: depts1['Operations'].id },
      data: { manager_id: deptMgrEmp.id },
    });
  }

  // Seed 10 Employees for Company 2
  console.log('Seeding 10 employees for Company 2...');
  for (let j = 1; j <= 10; j++) {
    const code2 = `EMP-AUH-${String(j).padStart(3, '0')}`;
    const emp2 = await prisma.employees.create({
      data: {
        company_id: company2.id,
        employee_code: code2,
        name: `Horizon Specialist ${j}`,
        arabic_name: `أخصائي أفق ${j}`,
        status: 'Active',
        joining_date: new Date('2025-03-01'),
        residency_type: 'Expat',
        nationality: 'JOR',
        gender: j % 2 === 0 ? 'Female' : 'Male',
        company_visa_id: visa2.id,
        branch_id: branch2.id,
        work_email: `emp${j}@horizon.ae`,
      },
    });

    await prisma.contracts.create({
      data: {
        company_id: company2.id,
        employee_id: emp2.id,
        version_no: 1,
        effective_date: new Date('2025-03-01'),
        contract_type: 'Limited',
        start_date: new Date('2025-03-01'),
        job_id: job2.id,
        department_id: dept2.id,
        shift_id: shift2.id,
        attendance_policy_id: policy2.id,
        structure_id: salaryStructure2.id,
        basic: 6000.00,
        housing: 2400.00,
        transport: 600.00,
        gross: 9000.00,
        status: 'Approved',
      },
    });

    await prisma.bank_accounts.create({
      data: {
        company_id: company2.id,
        employee_id: emp2.id,
        bank_name: 'Abu Dhabi Commercial Bank',
        iban: generateValidUaeIban('003', 2000000000 + j),
        routing_code: 'ADCB001',
        is_primary: true,
      },
    });

    await prisma.leave_allocations.create({
      data: {
        company_id: company2.id,
        employee_id: emp2.id,
        leave_type_id: leaveType2.id,
        allocation_type: 'Regular',
        accrual_plan_id: accrualPlan2.id,
        days_allocated: 30.00,
        days_taken: 0,
        valid_from: new Date('2026-01-01'),
        valid_to: new Date('2026-12-31'),
      },
    });
  }

  // Seed-time assertion: ALL employees with active bank accounts must have a valid mod-97 UAE IBAN, and no two employees share an IBAN
  const activeBankAccounts = await prisma.bank_accounts.findMany({
    where: { is_active: true },
    include: { employee: true },
  });
  const seenIbans = new Map();
  for (const acc of activeBankAccounts) {
    if (!acc.iban || !validateUaeIban(acc.iban)) {
      throw new Error(`Seed assertion failed: Invalid or missing mod-97 UAE IBAN '${acc.iban}' for employee ${acc.employee?.employee_code || acc.employee_id}`);
    }
    if (seenIbans.has(acc.iban)) {
      throw new Error(`Seed assertion failed: Duplicate IBAN '${acc.iban}' shared between employee ${seenIbans.get(acc.iban)} and ${acc.employee?.employee_code || acc.employee_id}`);
    }
    seenIbans.set(acc.iban, acc.employee?.employee_code || acc.employee_id);
  }
  console.log(`Validated ${activeBankAccounts.length} active UAE IBANs: 100% mod-97 valid, 0 duplicates.`);

  // Seed user logins for every active employee of both companies (RC3 Part 1 / Item 9)
  const employeeRole = rolesMap ? rolesMap['EMPLOYEE'] : await prisma.roles.findUnique({ where: { code: 'EMPLOYEE' } });
  const defaultPasswordHash = await bcrypt.hash('Nextal@2026!', 10);

  const allEmps = await prisma.employees.findMany({
    where: { company_id: { in: [company1.id, company2.id] } },
  });

  for (const emp of allEmps) {
    // If this employee is already linked to a user (e.g. employee@gulftech.ae), skip to maintain unique constraint
    const existingWithEmployeeId = await prisma.users.findUnique({ where: { employee_id: emp.id } });
    if (existingWithEmployeeId) {
      continue;
    }

    const domain = emp.company_id === company1.id ? 'gulftech.ae' : 'horizon.ae';
    const email = `${emp.employee_code.toLowerCase()}@${domain}`;

    const existing = await prisma.users.findUnique({ where: { email } });
    if (!existing) {
      const user = await prisma.users.create({
        data: {
          company_id: emp.company_id,
          email,
          password_hash: defaultPasswordHash,
          status: emp.status === 'Archived' ? 'Archived' : 'Active',
          employee_id: emp.id,
        },
      });
      if (employeeRole) {
        await prisma.user_roles.create({
          data: {
            company_id: emp.company_id,
            user_id: user.id,
            role_id: employeeRole.id,
            scope_type: 'Self',
          },
        });
      }
    } else if (!existing.employee_id) {
      await prisma.users.update({
        where: { id: existing.id },
        data: { employee_id: emp.id },
      });
    }
  }

  return {
    seededEmployees,
    seededContracts,
    totalSeededGross,
  };
}

export default seedEmployees;
