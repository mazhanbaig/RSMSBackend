const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');
const { getDatabase } = require('firebase-admin/database');

if (!admin.apps.length) {
    try {
        const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        };

        admin.initializeApp({
            credential: admin.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL,
        });
    } catch (err) {
        console.error("Firebase Admin initialization error:", err);
        throw err;
    }
}

const db = getDatabase();
const auth = getAuth();

module.exports = { admin, db, auth };