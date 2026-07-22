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
try {
    db = getDatabase();
    auth = getAuth();
} catch (err) {
    console.error("Firebase getDatabase/getAuth error:", err.message);
}

module.exports = { admin, db, auth };
