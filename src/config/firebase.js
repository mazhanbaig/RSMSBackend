const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');
const { getDatabase } = require('firebase-admin/database');

// Module-level state — declare before any reads/writes to avoid TDZ errors at init time
let db, auth;
let firebaseInitialized = false;
let firebaseInitError = null;
let firebaseAuthError = null;

function resolveFirebaseProjectId() {
    const explicit = process.env.FIREBASE_PROJECT_ID;
    if (explicit) return explicit;

    const email = process.env.FIREBASE_CLIENT_EMAIL || '';
    const match = email.match(/@([^.]+)\.iam\.gserviceaccount\.com$/);
    if (match) {
        console.warn(
            'FIREBASE_PROJECT_ID is not set; derived from FIREBASE_CLIENT_EMAIL:',
            match[1]
        );
        return match[1];
    }

    return undefined;
}

if (admin.getApps().length === 0) {
    try {
        let rawKey = process.env.FIREBASE_PRIVATE_KEY || '';

        // Vercel stores FIREBASE_PRIVATE_KEY with literal \n sequences when pasted
        // as a single line (the most common approach). Replace those with actual
        // newline characters so admin.cert() can parse the PEM correctly.
        // If the key already has real newlines this is a no-op.
        if (rawKey) {
            // Handle both \\n (local .env double-escape) and \n (Vercel single-escape)
            rawKey = rawKey.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n');
            // The second replace is a no-op if \\n was already handled above
        }

        const projectId = resolveFirebaseProjectId();
        const serviceAccount = {
            projectId,
            privateKey: rawKey,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        };

        console.log('Initializing Firebase with projectId:', projectId);
        console.log('Private key has correct format:', rawKey.includes('-----BEGIN PRIVATE KEY-----'));
        console.log('Private key length:', rawKey.length);

        if (!projectId) {
            throw new Error(
                'FIREBASE_PROJECT_ID is missing and could not be derived from FIREBASE_CLIENT_EMAIL'
            );
        }

        admin.initializeApp({
            credential: admin.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL,
        });
        console.log('Firebase Admin initialized successfully');
    } catch (err) {
        firebaseInitError = err.message;
        console.error('Firebase Admin initialization error:', err.message);
        console.error('Full error:', err);
    }
}

try {
    db = getDatabase();
    auth = getAuth();
    firebaseInitialized = true;
    console.log('Firebase Admin initialized successfully. auth:', !!auth);
} catch (err) {
    firebaseAuthError = err.message;
    console.error('Firebase getDatabase/getAuth error:', err.message);
    console.error('Full error:', err);
    console.error('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
    console.error('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL);
    console.error('FIREBASE_PRIVATE_KEY exists:', !!process.env.FIREBASE_PRIVATE_KEY);
    console.error('FIREBASE_DATABASE_URL:', process.env.FIREBASE_DATABASE_URL);
}

module.exports = { admin, db, auth, firebaseInitialized, firebaseInitError, firebaseAuthError };
