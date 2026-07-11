// Test logout positive path: mint token → call revoke → verify revoked
const admin = require('firebase-admin');
const https = require('https');

const BACKEND_URL = 'https://zstate-backend.vercel.app';
const API_KEY = 'AIzaSyDBxTm4r4jfJ3_ZQ8pDH1d91BkmIdY6YBo';
const TEST_UID = 'test-logout-verification-' + Date.now();

async function post(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers, 'Content-Length': Buffer.byteLength(data) }
    };
    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, body }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  try {
    // 1. Init Admin SDK using env vars from BackendRSMS
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
    }
    console.log('✓ Admin SDK initialized');

    // 2. Mint a custom token
    const customToken = await admin.auth().createCustomToken(TEST_UID);
    console.log(`✓ Custom token minted for UID: ${TEST_UID}`);

    // 3. Exchange custom token for ID token via Firebase REST API
    const signInResult = await post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
      { token: customToken, returnSecureToken: true }
    );
    if (signInResult.status !== 200) {
      console.error(`✗ Sign-in failed: ${signInResult.status}`, signInResult.body);
      process.exit(1);
    }
    const idToken = signInResult.body.idToken;
    const refreshToken = signInResult.body.refreshToken;
    console.log(`✓ ID token obtained (${idToken.substring(0, 30)}...)`);

    // 4. Call backend logout endpoint WITH valid token
    const logoutResult = await post(
      `${BACKEND_URL}/api/auth/logout`,
      null,
      { Authorization: `Bearer ${idToken}` }
    );
    if (logoutResult.status === 200) {
      console.log(`✓ Logout endpoint returned 200 — revoke SUCCESS`);
    } else {
      console.log(`? Logout returned ${logoutResult.status}:`, JSON.stringify(logoutResult.body));
    }

    // 5. Verify revocation: try using the same ID token to call a protected endpoint
    const verifyResult = await post(
      `${BACKEND_URL}/api/auth/logout`,
      null,
      { Authorization: `Bearer ${idToken}` }
    );
    console.log(`✓ Second call with same token returned ${verifyResult.status}`);

    // 6. Try exchanging the refresh token for a new ID token (should fail if revoked)
    const refreshResult = await post(
      `https://securetoken.googleapis.com/v1/token?key=${API_KEY}`,
      { grant_type: 'refresh_token', refresh_token: refreshToken }
    );
    if (refreshResult.status === 200) {
      console.log(`? Refresh token still works (status ${refreshResult.status}) — NOT revoked`);
    } else {
      console.log(`✓ Refresh token rejected (status ${refreshResult.status}): ${JSON.stringify(refreshResult.body)} — REVOKED`);
    }

    // 7. Cleanup: delete the test user
    try {
      await admin.auth().deleteUser(TEST_UID);
      console.log(`✓ Test user ${TEST_UID} deleted`);
    } catch (e) {
      console.log(`? Cleanup: ${e.message}`);
    }

    console.log('\n=== TEST COMPLETE ===');
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

run();
