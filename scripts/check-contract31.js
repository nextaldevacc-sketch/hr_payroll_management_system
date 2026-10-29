import prisma from '../backend/src/lib/prisma.js';

async function run() {
  const comp = await prisma.$base().companies.findFirst({ where: { name: 'Gulf Tech Logistics LLC' } });
  const emp31 = await prisma.$base().employees.findFirst({
    where: { company_id: comp.id, employee_code: 'EMP-DXB-031' },
    include: { contracts: true }
  });
  console.log('EMP-DXB-031 contract:', emp31.contracts[0]);
}

run().catch(console.error).finally(() => process.exit(0));

