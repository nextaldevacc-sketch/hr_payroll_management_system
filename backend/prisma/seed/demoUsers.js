import bcrypt from 'bcrypt';

/**
 * Seed Module: Demo Users & Roles
 */
export async function seedDemoUsers(prisma, { company1, company2, depts1 }) {
  console.log('Seeding roles catalog...');
  const roleDefs = [
    { code: 'EMPLOYEE', name: 'Employee', sees_salary: false },
    { code: 'DEPT_MANAGER', name: 'Department Manager', sees_salary: false },
    { code: 'HR_OFFICER', name: 'HR Officer', sees_salary: false },
    { code: 'PAYROLL_OFFICER', name: 'Payroll Officer', sees_salary: true },
    { code: 'HR_MANAGER', name: 'HR Manager', sees_salary: true },
    { code: 'GM', name: 'General Manager', sees_salary: true },
    { code: 'FINANCE', name: 'Finance / Accounts', sees_salary: true },
    { code: 'COMPANY_ADMIN', name: 'Company Administrator', sees_salary: false },
  ];

  const rolesMap = {};
  for (const r of roleDefs) {
    const role = await prisma.roles.create({
      data: { code: r.code, name: r.name, sees_salary: r.sees_salary },
    });
    rolesMap[r.code] = role;
  }

  const passwordHash = await bcrypt.hash('Nextal@2026!', 10);

  // Platform Admin
  console.log('Seeding Platform Admin user...');
  const userPlatformAdmin = await prisma.users.create({
    data: {
      email: 'platform@nextal.ae',
      password_hash: passwordHash,
      is_platform_admin: true,
      status: 'Active',
    },
  });

  // Users for Company 1
  console.log('Seeding demo users for Company 1...');
  const demoUsersMap = {};

  const demoAccounts = [
    { email: 'admin@gulftech.ae', roleCode: 'COMPANY_ADMIN', scopeType: 'Company' },
    { email: 'hr.mgr@gulftech.ae', roleCode: 'HR_MANAGER', scopeType: 'Company' },
    { email: 'hr.officer@gulftech.ae', roleCode: 'HR_OFFICER', scopeType: 'Company' },
    { email: 'payroll@gulftech.ae', roleCode: 'PAYROLL_OFFICER', scopeType: 'Company' },
    { email: 'dept.mgr@gulftech.ae', roleCode: 'DEPT_MANAGER', scopeType: 'Department', deptName: 'Operations' },
    { email: 'gm@gulftech.ae', roleCode: 'GM', scopeType: 'Company' },
    { email: 'finance@gulftech.ae', roleCode: 'FINANCE', scopeType: 'Company' },
    { email: 'employee@gulftech.ae', roleCode: 'EMPLOYEE', scopeType: 'Company' },
  ];

  for (const acc of demoAccounts) {
    const user = await prisma.users.create({
      data: {
        company_id: company1.id,
        email: acc.email,
        password_hash: passwordHash,
        status: 'Active',
      },
    });
    demoUsersMap[acc.email] = user;

    const targetDept = acc.deptName ? depts1[acc.deptName] : depts1['Operations'];

    await prisma.user_roles.create({
      data: {
        company_id: company1.id,
        user_id: user.id,
        role_id: rolesMap[acc.roleCode].id,
        scope_type: acc.scopeType,
        scope_id: acc.scopeType === 'Department' ? targetDept.id : null,
      },
    });
  }

  // Users for Company 2
  const userAdmin2 = await prisma.users.create({
    data: {
      company_id: company2.id,
      email: 'admin@horizon.ae',
      password_hash: passwordHash,
      status: 'Active',
    },
  });
  await prisma.user_roles.create({
    data: { company_id: company2.id, user_id: userAdmin2.id, role_id: rolesMap['COMPANY_ADMIN'].id },
  });

  const userHR2 = await prisma.users.create({
    data: {
      company_id: company2.id,
      email: 'hr@horizon.ae',
      password_hash: passwordHash,
      status: 'Active',
    },
  });
  await prisma.user_roles.create({
    data: { company_id: company2.id, user_id: userHR2.id, role_id: rolesMap['HR_MANAGER'].id },
  });

  return {
    rolesMap,
    demoUsersMap,
    userPlatformAdmin,
    userAdmin2,
    userHR2,
  };
}

export default seedDemoUsers;
