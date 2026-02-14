const admin = require('firebase-admin');

// Initialize Firebase
if (!admin.apps.length) {
    try {
        const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        };

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL,
        });

        console.log("✅ Firebase connected successfully!");
    } catch (error) {
        console.error("❌ Firebase connection failed:", error.message);
    }
}

const db = admin.database();
const auth = admin.auth();

module.exports = { admin, db, auth };