const Sentry = require('@sentry/node');
const adminService = require('../services/adminService');

const requireSuperAdmin = async (req, res, next) => {
    try {
        const firebaseUid = req.user.uid;
        const adminUserId = await adminService.checkSuperAdmin(firebaseUid);

        if (!adminUserId) {
            await adminService.logAdminAction(
                'unknown',
                'unauthorized_admin_access_attempt',
                null,
                null,
                { attemptedUid: firebaseUid },
                req.ip
            );
            return res.status(403).json({
                success: false,
                message: 'Forbidden: Super-admin access required',
                data: null,
                error: null,
            });
        }

        // MFA check — Firebase multi_factor claim must be present
        const multiFactor = req.user.firebase?.multi_factor;
        if (!multiFactor || multiFactor.length === 0) {
            await adminService.logAdminAction(
                adminUserId,
                'mfa_required_for_admin_access',
                null,
                null,
                { message: 'Admin user attempted access without MFA' },
                req.ip
            );
            return res.status(403).json({
                success: false,
                message: 'Multi-factor authentication required. Please complete MFA setup in your Firebase account settings.',
                data: null,
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
            data: null,
            error: null,
        });
    }
};

module.exports = requireSuperAdmin;
