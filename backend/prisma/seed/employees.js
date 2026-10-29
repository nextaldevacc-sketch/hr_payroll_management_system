import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  console.log('Seeding 42 employees for Company 1...');
  const userHR1 = demoUsersMap['hr.mgr@gulftech.ae'];
  const placeholderUrl = ensureDemoPlaceholderPdf();

  const employeeNames = [
    { name: 'Rashid Al-Falasi', name_ar: 'راشد الفلاسي', nat: 'Emirati', gender: 'Male', uae: true, job: jobs1.jobHR, dept: depts1['HR & Admin'], gross: 25000 },
    { name: 'Fatima Al-Mazrouei', name_ar: 'فاطمة المزروعي', nat: 'Emirati', gender: 'Female', uae: true, job: jobs1.jobEng, dept: depts1['Engineering'], gross: 22000 },
    { name: 'Mansour Al-Ketbi', name_ar: 'منصور الكتبي', nat: 'Emirati', gender: 'Male', uae: true, job: jobs1.jobOps, dept: depts1['Operations'], gross: 18000 },
    { name: 'Mariam Al-Zaabi', name_ar: 'مريم الزعابي', nat: 'Emirati', gender: 'Female', uae: true, job: jobs1.jobSales, dept: depts1['Sales & Support'], gross: 19000 },
    { name: 'Alexander Wright', name_ar: 'ألكسندر رايت', nat: 'British', gender: 'Male', uae: false, job: jobs1.jobEng, dept: depts1['Engineering'], gross: 16000 },
    { name: 'Rajesh Sharma', name_ar: 'راجيش شارما', nat: 'Indian', gender: 'Male', uae: false, job: jobs1.jobEng, dept: depts1['Engineering'], gross: 14000 },
    { name: 'Sarah Jenkins', name_ar: 'سارة جينكينز', nat: 'British', gender: 'Female', uae: false, job: jobs1.jobEng, dept: depts1['Engineering'], gross: 15500 },
    { name: 'Muhammad Tariq', name_ar: 'محمد طارق', nat: 'Pakistani', gender: 'Male', uae: false, job: jobs1.jobOps, dept: depts1['Operations'], gross: 7500 },
    { name: 'Omar Farooq', name_ar: 'عمر فاروق', nat: 'Egyptian', gender: 'Male', uae: false, job: jobs1.jobOps, dept: depts1['Operations'], gross: 8000 },
    { name: 'Kareem Abdelaziz', name_ar: 'كريم عبدالعزيز', nat: 'Egyptian', gender: 'Male', uae: false, job: jobs1.jobSales, dept: depts1['Sales & Support'], gross: 8500 },
    { name: 'Vikram Patel', name_ar: 'فيكرام باتيل', nat: 'Indian', gender: 'Male', uae: false, job: jobs1.jobFleet, dept: depts1['Logistics & Fleet'], gross: 6500 },
    { name: 'Anil Kumar', name_ar: 'أنيل كومار', nat: 'Indian', gender: 'Male', uae: false, job: jobs1.jobFleet, dept: depts1['Logistics & Fleet'], gross: 6000 },
  ];

  const seededEmployees = [];
  const seededContracts = [];
  let totalSeededGross = 0;

  for (let i = 1; i <= 42; i++) {
    const code = `EMP-DXB-${String(i).padStart(3, '0')}`;
    const targetVisa = i <= 30 ? visas1.visa1_01 : visas1.visa1_02;
    const targetBranch = i <= 30 ? branches1.branch1_main : branches1.branch1_difc;

    const baseInfo = i <= employeeNames.length
      ? employeeNames[i - 1]
      : {
          name: `Logistics Associate ${i}`,
          name_ar: `مساعد لوجستي ${i}`,
          nat: i % 3 === 0 ? 'Filipino' : i % 2 === 0 ? 'Indian' : 'Pakistani',
          gender: i % 4 === 0 ? 'Female' : 'Male',
          uae: false,
          job: i % 2 === 0 ? jobs1.jobFleet : jobs1.jobOps,
          dept: i % 2 === 0 ? depts1['Logistics & Fleet'] : depts1['Operations'],
          gross: i <= 32 ? 5500 : 6000,
        };

    const basic = Math.round(baseInfo.gross * 0.60);
    const housing = Math.round(baseInfo.gross * 0.30);
    const trans = Math.round(baseInfo.gross * 0.05);
    const oth = baseInfo.gross - (basic + housing + trans);
    const empGross = basic + housing + trans + oth;

    const emp = await prisma.employees.create({
      data: {
        company_id: company1.id,
        employee_code: code,
        name: baseInfo.name,
        arabic_name: baseInfo.name_ar,
        legal_name: baseInfo.name,
        status: i === 42 ? 'Archived' : 'Active', // 1 leaver
        joining_date: i >= 40 ? new Date('2026-10-01') : new Date('2024-01-15'), // 3 joiners in Oct 2026
        residency_type: (i <= 4 || baseInfo.uae) ? 'UAENational' : 'Expat',
        nationality: baseInfo.nat,
        gender: baseInfo.gender,
        birth_date: new Date('1990-05-15'),
        mohre_person_id: `MOHRE${String(1000000 + i)}`,
        company_visa_id: targetVisa.id,
        branch_id: targetBranch.id,
        work_email: `emp${i}@gulftech.ae`,
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
      const contract1 = await prisma.contracts.create({
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

    // Bank accounts: 40 valid, 1 missing IBAN (emp 41), 1 missing routing code (emp 42)
    const hasIban = i !== 41;
    const hasRouting = i !== 42;

    await prisma.bank_accounts.create({
      data: {
        company_id: company1.id,
        employee_id: emp.id,
        bank_name: 'Emirates NBD',
        iban: hasIban ? `AE${String(i).padStart(2, '0')}0331234567890123456` : '',
        routing_code: hasRouting ? 'ENBD001' : '',
        salary_split_pct: 100.00,
        is_primary: true,
        is_active: true,
      },
    });

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
        days_taken: (i % 5),
        valid_from: new Date('2026-01-01'),
        valid_to: new Date('2026-12-31'),
      },
    });
  }

  // Link demo employee account to Employee 1
  if (seededEmployees[0] && demoUsersMap['employee@gulftech.ae']) {
    await prisma.users.update({
      where: { id: demoUsersMap['employee@gulftech.ae'].id },
      data: { employee_id: seededEmployees[0].id },
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
        nationality: 'Jordanian',
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
        iban: `AE${String(j).padStart(2, '0')}0031234567890123456`,
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

  return {
    seededEmployees,
    seededContracts,
    totalSeededGross,
  };
}

export default seedEmployees;
