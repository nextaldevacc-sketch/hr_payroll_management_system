/**
 * Seed Module: Organisation
 * Companies, Visas, Branches, Departments, Jobs
 */
export async function seedOrganisation(prisma) {
  console.log('Seeding Company 1: Gulf Tech Logistics LLC...');
  const company1 = await prisma.companies.create({
    data: {
      name: 'Gulf Tech Logistics LLC',
      name_ar: 'شركة الخليج للتقنية اللوجستية ذ.م.م',
      trade_license_no: 'TL-DXB-98421',
      default_language: 'en',
      status: 'Active',
      default_cutoff_day: 25,
      variance_threshold_pct: 5.00,
      alert_days: [90, 60, 30],
    },
  });

  // Visas for Company 1 (Dual-visa setup: MOHRE Dubai & DIFC Freezone)
  const visa1_01 = await prisma.company_visas.create({
    data: {
      company_id: company1.id,
      name: 'Visa 01 (MOHRE Dubai)',
      mol_establishment_id: 'MOHRE-784-0129',
      bank_routing_code: 'ENBD001',
      emirate: 'Dubai',
    },
  });

  const visa1_02 = await prisma.company_visas.create({
    data: {
      company_id: company1.id,
      name: 'Visa 02 (DIFC Freezone)',
      mol_establishment_id: 'DIFC-892-4410',
      bank_routing_code: 'FAB002',
      emirate: 'Dubai',
    },
  });

  // Branches
  const branch1_main = await prisma.branches.create({
    data: {
      company_id: company1.id,
      company_visa_id: visa1_01.id,
      name: 'Dubai Headquarters (Al Quoz)',
      name_ar: 'المقر الرئيسي بدبي (القوز)',
      emirate: 'Dubai',
    },
  });

  const branch1_ad = await prisma.branches.create({
    data: {
      company_id: company1.id,
      company_visa_id: visa1_01.id,
      name: 'Abu Dhabi Corniche Branch',
      name_ar: 'فرع كورنيش أبوظبي',
      emirate: 'Abu Dhabi',
    },
  });

  const branch1_difc = await prisma.branches.create({
    data: {
      company_id: company1.id,
      company_visa_id: visa1_02.id,
      name: 'DIFC FinTech Hub',
      name_ar: 'مركز مركز دبي المالي العالمي للتقنية المالية',
      emirate: 'Dubai',
    },
  });

  // Departments (6 Real Departments with Cost Centres)
  const deptNames = [
    { name: 'Engineering', name_ar: 'الهندسة والبرمجيات', cost_centre: 'CC-ENG' },
    { name: 'Operations', name_ar: 'العمليات اللوجستية', cost_centre: 'CC-OPS' },
    { name: 'Logistics & Fleet', name_ar: 'الخدمات اللوجستية والأسطول', cost_centre: 'CC-LOG' },
    { name: 'HR & Admin', name_ar: 'الموارد البشرية والإدارة', cost_centre: 'CC-HR' },
    { name: 'Sales & Support', name_ar: 'المبيعات وخدمة العملاء', cost_centre: 'CC-SALES' },
    { name: 'Finance', name_ar: 'المالية والمحاسبة', cost_centre: 'CC-FIN' },
  ];

  const depts1 = {};
  for (const d of deptNames) {
    const dept = await prisma.departments.create({
      data: {
        company_id: company1.id,
        name: d.name,
        name_ar: d.name_ar,
        cost_centre: d.cost_centre,
      },
    });
    depts1[d.name] = dept;
  }

  // Jobs
  const jobEng = await prisma.jobs.create({
    data: { company_id: company1.id, department_id: depts1['Engineering'].id, title: 'Senior Software Engineer', title_ar: 'مهندس برمجيات أول', grade: 'L4' },
  });
  const jobOps = await prisma.jobs.create({
    data: { company_id: company1.id, department_id: depts1['Operations'].id, title: 'Operations Specialist', title_ar: 'أخصائي عمليات', grade: 'L3' },
  });
  const jobFleet = await prisma.jobs.create({
    data: { company_id: company1.id, department_id: depts1['Logistics & Fleet'].id, title: 'Fleet Supervisor', title_ar: 'مشرف أسطول', grade: 'L3' },
  });
  const jobHR = await prisma.jobs.create({
    data: { company_id: company1.id, department_id: depts1['HR & Admin'].id, title: 'HR Manager', title_ar: 'مدير الموارد البشرية', grade: 'M1' },
  });
  const jobSales = await prisma.jobs.create({
    data: { company_id: company1.id, department_id: depts1['Sales & Support'].id, title: 'Account Manager', title_ar: 'مدير حسابات', grade: 'L3' },
  });
  const jobFin = await prisma.jobs.create({
    data: { company_id: company1.id, department_id: depts1['Finance'].id, title: 'Senior Accountant', title_ar: 'محاسب أول', grade: 'L3' },
  });

  const jobs1 = { jobEng, jobOps, jobFleet, jobHR, jobSales, jobFin };

  // Company 2: Emirates Horizon Trading LLC
  console.log('Seeding Company 2: Emirates Horizon Trading LLC...');
  const company2 = await prisma.companies.create({
    data: {
      name: 'Emirates Horizon Trading LLC',
      name_ar: 'شركة أفق الإمارات للتجارة ذ.م.م',
      trade_license_no: 'TL-AUH-55412',
      default_language: 'ar',
      status: 'Active',
      default_cutoff_day: 20,
      variance_threshold_pct: 5.00,
      alert_days: [90, 60, 30],
    },
  });

  const visa2 = await prisma.company_visas.create({
    data: {
      company_id: company2.id,
      name: 'Abu Dhabi Mainland Visa',
      mol_establishment_id: 'MOHRE-AUH-8821',
      bank_routing_code: 'ADCB001',
      emirate: 'Abu Dhabi',
    },
  });

  const branch2 = await prisma.branches.create({
    data: {
      company_id: company2.id,
      company_visa_id: visa2.id,
      name: 'Abu Dhabi Corniche Branch',
      name_ar: 'فرع كورنيش أبوظبي',
      emirate: 'Abu Dhabi',
    },
  });

  const dept2 = await prisma.departments.create({
    data: {
      company_id: company2.id,
      name: 'General Trading',
      name_ar: 'التجارة العامة',
      cost_centre: 'CC-AUH-01',
    },
  });

  const job2 = await prisma.jobs.create({
    data: {
      company_id: company2.id,
      department_id: dept2.id,
      title: 'Commercial Executive',
      title_ar: 'تنفيذي تجاري',
    },
  });

  return {
    company1,
    visas1: { visa1_01, visa1_02 },
    branches1: { branch1_main, branch1_ad, branch1_difc },
    depts1,
    jobs1,
    company2,
    visa2,
    branch2,
    dept2,
    job2,
  };
}

export default seedOrganisation;
