const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');
const { getDatabase } = require('firebase-admin/database');

if (admin.getApps().length === 0) {
    try {
        const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
        const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        };

        admin.initializeApp({
            credential: admin.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL,
        });
    } catch (err) {
        console.error("Firebase Admin initialization error:", err.message);
    }
}

let db, auth;
let firebaseInitialized = false;

try {
    db = getDatabase();
    auth = getAuth();
    firebaseInitialized = true;
    console.log("Firebase Admin initialized successfully. auth:", !!auth);
} catch (err) {
    console.error("Firebase getDatabase/getAuth error:", err.message);
    console.error("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
    console.error("FIREBASE_CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL);
    console.error("FIREBASE_PRIVATE_KEY exists:", !!process.env.FIREBASE_PRIVATE_KEY);
}

module.exports = { admin, db, auth, firebaseInitialized };
