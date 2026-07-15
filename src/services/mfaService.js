const otplib = require('otplib');
const { getPrisma, resolveUserId } = require('../config/database');
const { encrypt, decrypt } = require('../utils/encryption');

async function generateSecret(uid) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const secret = otplib.generateSecret();
    const encrypted = encrypt(secret);

    await prisma.user.update({
        where: { id: userId },
        data: { totpSecret: encrypted },
    });

    const serviceName = 'RSMS Admin';
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    const otpauth = otplib.generateURI({
        issuer: serviceName,
        label: user.email,
        secret,
    });

    return {
        data: {
            secret,
            otpauthUrl: otpauth,
            message: 'Add this secret to your authenticator app, then call verify-enrollment with a 6-digit code.',
        },
    };
}

async function verifyEnrollment(uid, token) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { totpSecret: true } });
    if (!user.totpSecret) return { error: 'No TOTP secret found. Call /api/admin/mfa/enroll first.', status: 400 };

    const secret = decrypt(user.totpSecret);
    const result = await otplib.verify({ token, secret });

    if (!result.valid) return { error: 'Invalid code. Try again with the current 6-digit code from your authenticator app.', status: 400 };

    await prisma.user.update({
        where: { id: userId },
        data: { totpEnabled: true },
    });

    return { data: { message: 'TOTP enrollment verified and enabled. All future admin requests require an X-TOTP-Code header.' } };
}

async function verifyCode(uid, token) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { valid: false, reason: 'User not found' };

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { totpSecret: true, totpEnabled: true } });
    if (!user || !user.totpEnabled || !user.totpSecret) return { valid: false, reason: 'TOTP not enabled' };

    const secret = decrypt(user.totpSecret);
    const result = await otplib.verify({ token, secret });

    return { valid: result.valid };
}

async function getStatus(uid) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { totpEnabled: true, totpSecret: true },
    });

    return {
        data: {
            totpEnabled: user.totpEnabled,
            totpEnrolled: user.totpSecret !== null,
        },
    };
}

module.exports = { generateSecret, verifyEnrollment, verifyCode, getStatus };
