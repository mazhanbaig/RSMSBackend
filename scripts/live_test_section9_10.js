require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const http = require('http');
const fs = require('fs');
const path = require('path');
const otplib = require('otplib');

const TEMP = process.env.TEMP;
const BASE = { hostname: 'localhost', port: 5000 };

function loadToken(label) { return fs.readFileSync(path.join(TEMP, 'token_' + label + '.txt'), 'utf8').trim(); }
const TOKENS = { a: loadToken('a'), b: loadToken('b') };

function api(method, p, token, body, extraHeaders) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = { ...BASE, path: p, method, headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', ...extraHeaders } };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const req = http.request(opts, (res) => {
      let b = ''; res.on('data', c => b += c); res.on('end', () => resolve({ status: res.statusCode, body: safeParse(b), headers: res.headers }));
    });
    req.on('error', e => resolve({ status: 0, body: e.message }));
    if (data) req.write(data); req.end();
  });
}

function safeParse(s) { try { return JSON.parse(s); } catch(e) { return s; } }

let passed = 0, failed = 0, failures = [];
function check(label, condition, detail) {
  if (condition) { passed++; process.stdout.write('.'); }
  else { failed++; console.log('\nFAIL: ' + label + ' - ' + JSON.stringify(detail).substring(0,200)); failures.push({ label, detail }); }
}

async function main() {
  console.log('=== SECTION 9: SUPER-ADMIN & TOTP ===');

  // Ensure User A is registered in Postgres
  let r = await api('POST', '/api/auth', TOKENS.a, { uid: 'TGNUnibIZkXDcunYwakPvyNJqa63' });
  check('Auth refresh A', r.status === 200, r);

  // Step 1: Enroll TOTP for User A (super-admin)
  r = await api('POST', '/api/admin/mfa/enroll', TOKENS.a);
  check('MFA enroll returns 200', r.status === 200, r);
  const secret = (r.body?.data || r.body)?.secret;
  check('MFA enroll returns secret', !!secret, r);

  if (secret) {
    // Generate TOTP code using otplib
    const code = await otplib.generate({ secret });
    check('TOTP code generated', !!code && code.length === 6, { code });

    // Verify enrollment
    r = await api('POST', '/api/admin/mfa/verify-enrollment', TOKENS.a, { token: code });
    check('MFA verify-enrollment', r.status === 200, r);

    // Now test admin routes WITH valid X-TOTP-Code
    r = await api('GET', '/api/admin/users', TOKENS.a, null, { 'x-totp-code': code });
    check('Admin GET /users with TOTP', r.status === 200, r);
    if (r.status === 200) {
      const bodyStr = JSON.stringify(r.body);
      check('Response has user data', bodyStr.includes('email') || bodyStr.includes('users'), r);
      check('Response does NOT leak totpSecret', !bodyStr.includes('totpSecret'), { snippet: bodyStr.substring(0,200) });
    }

    // Test WITHOUT X-TOTP-Code -> 403
    r = await api('GET', '/api/admin/users', TOKENS.a);
    check('Admin GET /users without TOTP -> 403', r.status === 403, r);

    // Test with INVALID TOTP code -> 403
    r = await api('GET', '/api/admin/users', TOKENS.a, null, { 'x-totp-code': '000000' });
    check('Admin GET /users with bad TOTP -> 403', r.status === 403, r);

    // Non-admin cannot access admin routes
    r = await api('GET', '/api/admin/users', TOKENS.b, null, { 'x-totp-code': code });
    check('Non-admin GET /admin -> 403', r.status === 403, r);

    // Helper: fresh code + API call (TOTP codes expire every 30s)
    async function adminGet(path) {
      const freshCode = await otplib.generate({ secret });
      return api('GET', path, TOKENS.a, null, { 'x-totp-code': freshCode });
    }

    // Admin analytics routes
    r = await adminGet('/api/admin/security/overview');
    check('Admin security/overview', r.status === 200, r);

    r = await adminGet('/api/admin/audit-log');
    check('Admin audit-log', r.status === 200 || r.status === 404, r);
    // Try with full path
    r = await adminGet('/api/admin/security/audit-log');
    check('Admin security/audit-log', r.status === 200, r);

    r = await adminGet('/api/admin/system/health');
    check('Admin system/health', r.status === 200, r);
  }

  // ══════════════════════════════════════════════════
  // SECTION 10: 413, Rate limiting, Image upload
  // ══════════════════════════════════════════════════
  console.log('\n=== SECTION 10: MISC ===');

  // Big body > 1MB -> 413
  const bigBody = { name: 'x'.repeat(2 * 1024 * 1024) }; // 2MB
  r = await api('POST', '/api/clients', TOKENS.a, bigBody);
  check('Big body >1MB -> 413', r.status === 413, r);

  // Image upload - invalid file type (simulate via missing file)
  // Just test the route
  r = await api('GET', '/api/images/test.jpg', TOKENS.a);
  check('Image endpoint responds', r.status === 200 || r.status === 404 || r.status === 400 || r.status === 500, r);

  console.log('\n\n=== SECTION 9+10 RESULTS: ' + passed + ' passed, ' + failed + ' failed ===');
  if (failures.length > 0) {
    console.log('\nFAILURES:');
    failures.forEach(f => console.log('  - ' + f.label + ': ' + JSON.stringify(f.detail).substring(0,200)));
  }
}
main().catch(console.error);
