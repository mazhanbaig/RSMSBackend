require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const UIDS = {
  a: 'TGNUnibIZkXDcunYwakPvyNJqa63',
  b: '93b4TM0Z56bMI5Ldo6bswzQsY9C2',
  c: 'cXObNk1SRvOThhmswMkaMvgiGH92',
};

function callApi(method, p, token, body) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 5000, path: p, method,
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const req = http.request(opts, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    req.on('error', e => resolve({ status: 0, body: e.message }));
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const tokenA = fs.readFileSync(path.join(process.env.TEMP, 'token_a.txt'), 'utf8').trim();
  const tokenB = fs.readFileSync(path.join(process.env.TEMP, 'token_b.txt'), 'utf8').trim();
  const tokenC = fs.readFileSync(path.join(process.env.TEMP, 'token_c.txt'), 'utf8').trim();

  // Create Postgres User records
  console.log('=== Creating Postgres Users via /api/auth ===');
  for (const [label, uid] of Object.entries(UIDS)) {
    const token = { a: tokenA, b: tokenB, c: tokenC }[label];
    const r = await callApi('POST', '/api/auth', token, { uid });
    console.log(label + ': ' + r.status + ' ' + r.body.substring(0, 80));
  }

  // Set roles via direct DB
  console.log('\n=== Setting Roles in Postgres ===');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const userA = await prisma.user.findUnique({ where: { email: 'test-agent-a@rsms-test.com' } });
  const userB = await prisma.user.findUnique({ where: { email: 'test-agent-b@rsms-test.com' } });
  const userC = await prisma.user.findUnique({ where: { email: 'test-agent-c@rsms-test.com' } });

  if (userA) { await prisma.user.update({ where: { id: userA.id }, data: { isSuperAdmin: true, role: 'owner' } }); console.log('A: super-admin + owner'); }
  else { console.log('A: NOT FOUND'); }

  if (userB) { await prisma.user.update({ where: { id: userB.id }, data: { role: 'agent' } }); console.log('B: agent'); }
  else { console.log('B: NOT FOUND'); }

  if (userC) { await prisma.user.update({ where: { id: userC.id }, data: { role: 'agent' } }); console.log('C: agent'); }
  else { console.log('C: NOT FOUND'); }

  await prisma.$disconnect();

  // Test that the server recognizes users
  console.log('\n=== Testing API access ===');
  for (const [label, uid] of Object.entries(UIDS)) {
    const token = { a: tokenA, b: tokenB, c: tokenC }[label];
    const r = await callApi('GET', '/api/clients', token);
    console.log(label + ' GET /api/clients: ' + r.status);
  }

  console.log('\n=== BOOTSTRAP COMPLETE ===');
}
main().catch(e => { console.error(e); process.exit(1); });
