const admin = require('firebase-admin');
const { cert } = require('firebase-admin/app');
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

if (admin.apps.length === 0) {
    try {
        let rawKey = process.env.FIREBASE_PRIVATE_KEY || '';

        if (!rawKey || typeof rawKey !== 'string') {
            throw new Error('FIREBASE_PRIVATE_KEY environment variable is missing or not a string');
        }

        const trimmedKey = rawKey.trim();
        if (!trimmedKey.includes('-----BEGIN PRIVATE KEY-----') || !trimmedKey.includes('-----END PRIVATE KEY-----')) {
            throw new Error('FIREBASE_PRIVATE_KEY does not contain valid PEM headers');
        }

        rawKey = trimmedKey
            .replace(/\\n/g, '\n')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');

        const projectId = resolveFirebaseProjectId();
        if (!projectId) {
            throw new Error(
                'FIREBASE_PROJECT_ID is missing and could not be derived from FIREBASE_CLIENT_EMAIL'
            );
        }

        admin.initializeApp({
            credential: cert({
                projectId,
                privateKey: rawKey,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            }),
            databaseURL: process.env.FIREBASE_DATABASE_URL,
        });
    } catch (err) {
        firebaseInitError = err.message;
    }
}

try {
    db = getDatabase();
    auth = getAuth();
    firebaseInitialized = true;
} catch (err) {
    firebaseAuthError = err.message;
}

module.exports = { admin, db, auth, firebaseInitialized, firebaseInitError, firebaseAuthError };
