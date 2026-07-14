const Sentry = require('@sentry/node');
const { auth } = require('../config/firebase');
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

        // ─── MFA Verification ───────────────────────────────────────
        // Query Firebase Auth for the user's actual MFA enrollment status.
        // This is authoritative — checks the server-side record, not just the token.
        let firebaseUser;
        try {
            firebaseUser = await auth.getUser(firebaseUid);
        } catch (fbErr) {
            console.error('requireSuperAdmin: Failed to fetch Firebase user:', fbErr.message);
            return res.status(500).json({
                success: false,
                message: 'Failed to verify MFA status. Please try again.',
                data: null,
                error: null,
            });
        }

        const enrolledFactors = firebaseUser.mfaInfo || [];
        const hasEnrolledMfa = enrolledFactors.length > 0;
        const sessionHasMfa = req.user.firebase?.multi_factor?.length > 0;

        if (!hasEnrolledMfa) {
            // User has no MFA factors enrolled at all
            await adminService.logAdminAction(
                adminUserId,
                'mfa_not_enrolled',
                null,
                null,
                { message: 'Admin user has no MFA factors enrolled' },
                req.ip
            );
            return res.status(403).json({
                success: false,
                message: 'Multi-factor authentication is required for admin access. Please enroll in MFA first:\n\n' +
                    '1. Install an authenticator app (Google Authenticator, Authy, etc.)\n' +
                    '2. Sign out of RSMS, then sign back in\n' +
                    '3. When prompted, enroll by scanning the QR code with your authenticator app\n' +
                    '4. Enter the 6-digit code it generates to complete enrollment\n' +
                    '5. Retry this request',
                data: {
                    mfaEnrolled: false,
                    mfaUsedInSession: false,
                    enrolledFactors: [],
                },
                error: null,
            });
        }

        if (!sessionHasMfa) {
            // User has MFA enrolled but didn't use it in this session
            await adminService.logAdminAction(
                adminUserId,
                'mfa_required_for_current_session',
                null,
                null,
                {
                    message: 'Admin has MFA enrolled but current session lacks MFA claim',
                    enrolledFactors: enrolledFactors.map(f => ({ factorId: f.uid, displayName: f.displayName })),
                },
                req.ip
            );
            return res.status(403).json({
                success: false,
                message: 'This session has not passed multi-factor authentication. Please sign out and sign in again with MFA:\n\n' +
                    '1. Sign out of the application\n' +
                    '2. Sign in again — you will be prompted for your MFA code\n' +
                    '3. Retry this request',
                data: {
                    mfaEnrolled: true,
                    mfaUsedInSession: false,
                    enrolledFactors: enrolledFactors.map(f => ({ factorId: f.uid, factorType: f.factorId, displayName: f.displayName })),
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
            data: null,
            error: null,
        });
    }
};

module.exports = requireSuperAdmin;
