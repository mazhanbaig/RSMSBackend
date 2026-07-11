const { db, auth } = require("../config/firebase");

/**
 * Save or update a user record in Firebase RTDB after login.
 * @param {string} uid - Firebase Auth UID
 * @param {string} name - User display name
 * @param {string} email - User email
 * @param {string} picture - User photo URL
 * @returns {Promise<void>}
 */
async function saveUser(uid, name, email, picture) {
    await db.ref("users/" + uid).update({
        uid,
        name,
        email,
        photoURL: picture,
        provider: "google",
        createdAt: new Date().toISOString(),
    });
}

/**
 * Revoke all refresh tokens for a user, forcing logout on all devices.
 * @param {string} uid - Firebase Auth UID
 * @returns {Promise<void>}
 */
async function revokeUserTokens(uid) {
    await auth.revokeRefreshTokens(uid);
}

module.exports = { saveUser, revokeUserTokens };
