const { db, auth } = require("../config/firebase");
const { getPrisma } = require("../config/database");

/**
 * Save or update a user record in Postgres AND Firebase RTDB after login.
 * Postgres is the primary store; Firebase RTDB stays as rollback safety net.
 * @param {string} uid - Firebase Auth UID
 * @param {string} name - User display name
 * @param {string} email - User email
 * @param {string} picture - User photo URL
 * @returns {Promise<void>}
 */
async function saveUser(uid, name, email, picture) {
    // Write to Postgres (primary)
    const prisma = getPrisma();
    const displayName = name || uid;

    // Ensure Organization exists
    await prisma.organization.upsert({
        where: { id: uid },
        update: { name: displayName },
        create: { id: uid, name: displayName },
    });

    // Upsert user
    await prisma.user.upsert({
        where: { uid },
        update: {
            name: displayName,
            email: email || `${uid}@placeholder.local`,
            photoURL: picture || null,
            provider: "google",
        },
        create: {
            uid,
            orgId: uid,
            name: displayName,
            email: email || `${uid}@placeholder.local`,
            photoURL: picture || null,
            provider: "google",
        },
    });

    // Also write to Firebase RTDB as rollback safety net
    await db.ref("users/" + uid).update({
        uid,
        name: displayName,
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
