require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const TEMP = process.env.TEMP;
const BASE = { hostname: 'localhost', port: 5000 };
const DELAY = 150; // ms between requests to avoid rate limiting

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function loadToken(label) {
  return fs.readFileSync(path.join(TEMP, 'token_' + label + '.txt'), 'utf8').trim();
}

const TOKENS = { a: loadToken('a'), b: loadToken('b'), c: loadToken('c') };
const UIDS = {
  a: 'TGNUnibIZkXDcunYwakPvyNJqa63',
  b: '93b4TM0Z56bMI5Ldo6bswzQsY9C2',
  c: 'cXObNk1SRvOThhmswMkaMvgiGH92',
};

function api(method, p, token, body, extraHeaders) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = { ...BASE, path: p, method, headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', ...extraHeaders } };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const req = http.request(opts, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: safeParse(b) }));
    });
    req.on('error', e => resolve({ status: 0, body: e.message }));
    if (data) req.write(data);
    req.end();
  });
}

function safeParse(s) { try { return JSON.parse(s); } catch(e) { return s; } }

let passed = 0, failed = 0;
const failures = [];

function check(label, condition, detail) {
  if (condition) { passed++; process.stdout.write('.'); }
  else { failed++; console.log('\nFAIL: ' + label + (detail ? ' - ' + JSON.stringify(detail).substring(0,200) : '')); failures.push({ label, detail }); }
}

function notEmpty(v) { return v && typeof v === 'object' && Object.keys(v).length > 0; }

function getData(r) { return r.body?.data || r.body; }

async function testSection(label, fn) {
  console.log('\n' + label);
  try { await fn(); } catch(e) { console.error('\nCRASH in ' + label + ': ' + e.message); failed++; failures.push({ label: 'CRASH', detail: e.message }); }
}

// Sign in fresh and save token
async function freshSignIn(email, password, label) {
  const r = await new Promise(resolve => {
    const data = JSON.stringify({ email, password, returnSecureToken: true });
    const req = https.request({
      hostname: 'identitytoolkit.googleapis.com',
      path: '/v1/accounts:signInWithPassword?key=' + process.env.FIREBASE_WEB_API_KEY,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => resolve(JSON.parse(b))); });
    req.write(data); req.end();
  });
  if (r.idToken) {
    fs.writeFileSync(path.join(TEMP, 'token_' + label + '.txt'), r.idToken);
    TOKENS[label] = r.idToken;
  }
  return r;
}

// ══════════════════════════════════════════════════
// SECTION 1: AUTH
// ══════════════════════════════════════════════════
async function section1() {
  let r;

  // Already tested login during bootstrap. Test logout:
  r = await api('POST', '/api/auth/logout', TOKENS.a);
  check('logout returns 200', r.status === 200, r);
  await sleep(DELAY);

  // Token revocation: Firebase revokeRefreshTokens invalidates the refresh token,
  // but existing ID tokens remain valid until expiry (1 hour). This is expected Firebase behavior.
  r = await api('GET', '/api/clients', TOKENS.a);
  check('token still works after logout (Firebase ID tokens have 1hr TTL - expected)', r.status === 200, r);
  await sleep(DELAY);

  // Re-sign User A
  await freshSignIn('test-agent-a@rsms-test.com', 'TestPass123!', 'a');
  await sleep(DELAY);
  r = await api('POST', '/api/auth', TOKENS.a, { uid: UIDS.a });
  check('POST /api/auth after fresh sign-in works', r.status === 200, r);
  await sleep(DELAY);
}

// ══════════════════════════════════════════════════
// Full CRUD test for an entity
// ══════════════════════════════════════════════════
async function testFullCRUD(entity, plural) {
  const p = '/api/' + plural;
  let createdId = null;

  // GET list (empty)
  let r = await api('GET', p, TOKENS.a); await sleep(DELAY);
  // If there are existing records, create/delete test ones
  let existingCount = Array.isArray(r.body) ? r.body.length : (r.body?.data?.length || 0);

  // POST create
  const body = entity === 'event' ? { title: 'Test ' + entity, startTime: new Date().toISOString() } :
               entity === 'task' ? { title: 'Test ' + entity, priority: 'medium' } :
               entity === 'property' ? { title: 'Test ' + entity } :
               { name: 'Test ' + entity };
  r = await api('POST', p, TOKENS.a, body); await sleep(DELAY);
  check('POST ' + p + ' creates', r.status === 200 || r.status === 201, r);
  if (r.status < 300) {
    createdId = getData(r)?.id;
    check('created record has id', !!createdId, r);

    // GET by ID
    r = await api('GET', p + '/' + createdId, TOKENS.a); await sleep(DELAY);
    check('GET /:id returns record', r.status === 200 && notEmpty(getData(r)), r);

    // User B cannot access User A's record
    r = await api('GET', p + '/' + createdId, TOKENS.b); await sleep(DELAY);
    check('User B gets 404 for User A record', r.status === 404, r);

    // PUT update
    r = await api('PUT', p + '/' + createdId, TOKENS.a, body); await sleep(DELAY);
    check('PUT /:id updates', r.status === 200, r);

    // User B cannot update
    r = await api('PUT', p + '/' + createdId, TOKENS.b, body); await sleep(DELAY);
    check('User B gets 404 updating User A record', r.status === 404, r);

    // DELETE
    r = await api('DELETE', p + '/' + createdId, TOKENS.a); await sleep(DELAY);
    check('DELETE /:id removes', r.status === 200, r);

    // Confirm deleted
    r = await api('GET', p + '/' + createdId, TOKENS.a); await sleep(DELAY);
    check('GET after delete returns 404', r.status === 404, r);
  }

  // No auth → 401
  r = await api('GET', p, null); await sleep(DELAY);
  check('No auth → 401', r.status === 401, r);

  // Agent (User C) can read and write
  r = await api('GET', p, TOKENS.c); await sleep(DELAY);
  check('Agent GET works', r.status === 200, r);

  r = await api('POST', p, TOKENS.c, body); await sleep(DELAY);
  check('Agent POST works', r.status === 200 || r.status === 201, r);

  // Invalid POST → 400
  r = await api('POST', p, TOKENS.a, {}); await sleep(DELAY);
  check('Invalid POST → 400', r.status === 400, r);
}

// ══════════════════════════════════════════════════
// RUN
// ══════════════════════════════════════════════════
async function main() {
  console.log('=== FULL LIVE API TESTING ===');

  await testSection('S1: AUTH', section1);
  await testSection('S2a: CLIENTS', () => testFullCRUD('client', 'clients'));
  await testSection('S2b: OWNERS', () => testFullCRUD('owner', 'owners'));
  await testSection('S2c: PROPERTIES', () => testFullCRUD('property', 'properties'));
  await testSection('S2d: EVENTS', () => testFullCRUD('event', 'events'));
  await testSection('S2e: TASKS', () => testFullCRUD('task', 'tasks'));

  console.log('\n\n=== RESULTS: ' + passed + ' passed, ' + failed + ' failed ===');
  if (failures.length > 0) {
    console.log('\nFAILURES:');
    failures.forEach(f => console.log('  - ' + f.label + ': ' + JSON.stringify(f.detail).substring(0, 200)));
  }
}
main().catch(console.error);
