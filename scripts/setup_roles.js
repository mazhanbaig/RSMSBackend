require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('=== Setting roles ===');
  const userA = await prisma.user.findUnique({ where: { email: 'test-agent-a@rsms-test.com' } });
  const userB = await prisma.user.findUnique({ where: { email: 'test-agent-b@rsms-test.com' } });
  const userC = await prisma.user.findUnique({ where: { email: 'test-agent-c@rsms-test.com' } });

  if (!userA) console.log('A not found'); else { await prisma.user.update({ where: { id: userA.id }, data: { isSuperAdmin: true, role: 'owner' } }); console.log('A -> super-admin + owner (' + userA.email + ')'); }
  if (!userB) console.log('B not found'); else { await prisma.user.update({ where: { id: userB.id }, data: { role: 'agent' } }); console.log('B -> agent (' + userB.email + ')'); }
  if (!userC) console.log('C not found'); else { await prisma.user.update({ where: { id: userC.id }, data: { role: 'agent' } }); console.log('C -> agent (' + userC.email + ')'); }

  await prisma.$disconnect();
  console.log('Done');
}
main().catch(e => { console.error(e.message); process.exit(1); });
