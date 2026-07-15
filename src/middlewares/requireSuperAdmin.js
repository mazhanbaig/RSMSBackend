const Sentry = require('@sentry/node');
const { getPrisma } = require('../config/database');
const adminService = require('../services/adminService');
const mfaService = require('../services/mfaService');

async function checkSuperAdminOnly(req, res, next) {
    try {
        const adminUserId = await adminService.checkSuperAdmin(req.user.uid);
        if (!adminUserId) {
            try {
                const userRecord = await getPrisma().user.findUnique({
                    where: { uid: req.user.uid },
                    select: { id: true },
                });
                await adminService.logAdminAction(
                    userRecord?.id || 'unknown',
                    'unauthorized_admin_access_attempt',
                    null, null,
                    { attemptedUid: req.user.uid },
                    req.ip
                );
            } catch (logErr) {
                console.error('Failed to log admin access attempt:', logErr.message);
            }
            return res.status(403).json({
                success: false,
                message: 'Forbidden: Super-admin access required',
                data: null, error: null,
            });
        }
        req.adminUserId = adminUserId;
        next();
    } catch (err) {
        Sentry.captureException(err);
        console.error('requireSuperAdmin error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error during admin authorization',
            data: null, error: null,
        });
    }
}

async function requireSuperAdmin(req, res, next) {
    try {
        const firebaseUid = req.user.uid;
        const adminUserId = await adminService.checkSuperAdmin(firebaseUid);

        if (!adminUserId) {
            try {
                const userRecord = await getPrisma().user.findUnique({
                    where: { uid: firebaseUid },
                    select: { id: true },
                });
                await adminService.logAdminAction(
                    userRecord?.id || 'unknown',
                    'unauthorized_admin_access_attempt',
                    null, null,
                    { attemptedUid: firebaseUid },
                    req.ip
                );
            } catch (logErr) {
                console.error('Failed to log admin access attempt:', logErr.message);
            }
            return res.status(403).json({
                success: false,
                message: 'Forbidden: Super-admin access required',
                data: null, error: null,
            });
        }

        // ─── TOTP Verification ─────────────────────────────────────
        const prisma = getPrisma();
        const user = await prisma.user.findUnique({
            where: { id: adminUserId },
            select: { totpEnabled: true, totpSecret: true },
        });

        if (!user.totpEnabled) {
            return res.status(403).json({
                success: false,
                message: 'Multi-factor authentication is required for admin access. Please enroll first:\n\n' +
                    '1. Call POST /api/admin/mfa/enroll with your auth token\n' +
                    '2. Add the returned secret to an authenticator app (Google Authenticator, Authy, etc.)\n' +
                    '3. Call POST /api/admin/mfa/verify-enrollment with the 6-digit code\n' +
                    '4. After enrollment, all admin requests need an X-TOTP-Code header',
                data: {
                    totpEnabled: false,
                    totpEnrolled: user.totpSecret !== null,
                },
                error: null,
            });
        }

        const totpCode = req.headers['x-totp-code'];
        if (!totpCode) {
            return res.status(403).json({
                success: false,
                message: 'X-TOTP-Code header is required for admin access. ' +
                    'Enter the current 6-digit code from your authenticator app.',
                data: {
                    totpEnabled: true,
                    totpCodeMissing: true,
                },
                error: null,
            });
        }

        const result = await mfaService.verifyCode(firebaseUid, totpCode);
        if (!result.valid) {
            return res.status(403).json({
                success: false,
                message: 'Invalid TOTP code. Enter the current 6-digit code from your authenticator app.',
                data: {
                    totpEnabled: true,
                    totpCodeInvalid: true,
                },
                error: null,
            });
        }

        req.adminUserId = adminUserId;
        next();
    } catch (err) {
        Sentry.captureException(err);
        console.error('requireSuperAdmin error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error during admin authorization',
            data: null, error: null,
        });
    }
}

module.exports = requireSuperAdmin;
module.exports.requireSuperAdmin = requireSuperAdmin;
module.exports.checkSuperAdminOnly = checkSuperAdminOnly;
