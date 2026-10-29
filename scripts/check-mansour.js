import prisma from '../backend/src/lib/prisma.js';

async function run() {
  const mansour = await prisma.$base().employees.findFirst({
    where: { name: { contains: 'Mansour' } },
    include: { bank_accounts: true }
  });
  console.log('Mansour:', mansour.name, mansour.employee_code, mansour.bank_accounts);

  const emp41 = await prisma.$base().employees.findFirst({
    where: { employee_code: 'EMP-DXB-041' },
    include: { bank_accounts: true }
  });
  console.log('Emp 41:', emp41.name, emp41.employee_code, emp41.bank_accounts);
}

run().catch(console.error).finally(() => process.exit(0));
