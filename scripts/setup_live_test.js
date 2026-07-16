require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const TEMP = process.env.TEMP || 'C:\\Users\\kk\\AppData\\Local\\Temp';

function signIn(email, password, label) {
  return new Promise((resolve) => {
    const data = JSON.stringify({ email, password, returnSecureToken: true });
    const req = https.request({
      hostname: 'identitytoolkit.googleapis.com',
      path: '/v1/accounts:signInWithPassword?key=' + process.env.FIREBASE_WEB_API_KEY,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        const parsed = JSON.parse(body);
        if (parsed.idToken) {
          fs.writeFileSync(path.join(TEMP, 'token_' + label + '.txt'), parsed.idToken);
          console.log('OK ' + label + ' uid=' + parsed.localId);
        } else {
          console.log('FAIL ' + label + ': ' + JSON.stringify(parsed));
        }
        resolve(parsed);
      });
    });
    req.write(data);
    req.end();
  });
}

function callApi(method, pathname, token, body) {
  return new Promise((resolve) => {
    const opts = { hostname: 'localhost', port: 5000, path: pathname, method: method };
    opts.headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data, headers: res.headers });
      });
    });
    req.on('error', (e) => resolve({ status: 0, body: e.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('=== Signing in test accounts ===');
  const a = await signIn('test-agent-a@rsms-test.com', 'TestPass123!', 'a');
  const b = await signIn('test-agent-b@rsms-test.com', 'TestPass123!', 'b');
  const c = await signIn('test-agent-c@rsms-test.com', 'TestPass123!', 'c');

  const tokenA = fs.readFileSync(path.join(TEMP, 'token_a.txt'), 'utf8').trim();
  const tokenB = fs.readFileSync(path.join(TEMP, 'token_b.txt'), 'utf8').trim();
  const tokenC = fs.readFileSync(path.join(TEMP, 'token_c.txt'), 'utf8').trim();

  // Call backend /api/auth to create Postgres records
  console.log('\n=== Creating Postgres User records via /api/auth ===');
  const r1 = await callApi('POST', '/api/auth', tokenA, {});
  console.log('POST /api/auth A: ' + r1.status + ' ' + r1.body.substring(0, 100));
  const r2 = await callApi('POST', '/api/auth', tokenB, {});
  console.log('POST /api/auth B: ' + r2.status + ' ' + r2.body.substring(0, 100));
  const r3 = await callApi('POST', '/api/auth', tokenC, {});
  console.log('POST /api/auth C: ' + r3.status + ' ' + r3.body.substring(0, 100));

  // Set roles in Postgres
  console.log('\n=== Setting roles in Postgres ===');
  const userA = await prisma.user.findUnique({ where: { email: 'test-agent-a@rsms-test.com' } });
  const userB = await prisma.user.findUnique({ where: { email: 'test-agent-b@rsms-test.com' } });
  const userC = await prisma.user.findUnique({ where: { email: 'test-agent-c@rsms-test.com' } });

  if (userA) {
    await prisma.user.update({ where: { id: userA.id }, data: { isSuperAdmin: true, role: 'owner' } });
    console.log('A: ' + userA.email + ' -> super-admin + owner');
  }
  if (userB) {
    await prisma.user.update({ where: { id: userB.id }, data: { role: 'agent' } });
    console.log('B: ' + userB.email + ' -> agent');
  }
  if (userC) {
    await prisma.user.update({ where: { id: userC.id }, data: { role: 'agent' } });
    console.log('C: ' + userC.email + ' -> agent');
  }

  // Save tokens to project for easy access
  fs.writeFileSync(path.join(__dirname, '..', 'token_a.txt'), tokenA);
  fs.writeFileSync(path.join(__dirname, '..', 'token_b.txt'), tokenB);
  fs.writeFileSync(path.join(__dirname, '..', 'token_c.txt'), tokenC);
  console.log('\n=== Tokens saved to project root ===');

  console.log('\n=== READY FOR LIVE API TESTING ===');
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
