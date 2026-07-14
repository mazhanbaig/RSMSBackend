const { auth } = require('../../src/config/firebase');
const adminService = require('../../src/services/adminService');

jest.mock('../../src/config/firebase', () => ({
    auth: {
        getUser: jest.fn(),
    },
}));

jest.mock('../../src/services/adminService', () => ({
    checkSuperAdmin: jest.fn(),
    logAdminAction: jest.fn(),
}));

const requireSuperAdmin = require('../../src/middlewares/requireSuperAdmin');

describe('requireSuperAdmin', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            user: {
                uid: 'admin-uid',
                firebase: {},
            },
            ip: '127.0.0.1',
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    test('passes when user is super admin with TOTP factor enrolled and used in session', async () => {
        adminService.checkSuperAdmin.mockResolvedValue('admin-postgres-id');
        auth.getUser.mockResolvedValue({
            mfaInfo: [
                {
                    uid: 'totp-factor-1',
                    factorId: 'totp',
                    displayName: 'My Authenticator',
                    enrollmentTime: new Date().toISOString(),
                },
            ],
        });
        req.user.firebase = { multi_factor: [{ id: 'totp-factor-1' }] };

        await requireSuperAdmin(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.adminUserId).toBe('admin-postgres-id');
    });

    test('passes when user is super admin with phone factor enrolled and used in session', async () => {
        adminService.checkSuperAdmin.mockResolvedValue('admin-postgres-id');
        auth.getUser.mockResolvedValue({
            mfaInfo: [
                {
                    uid: 'phone-factor-1',
                    factorId: 'phone',
                    displayName: null,
                    phoneNumber: '+1234567890',
                    enrollmentTime: new Date().toISOString(),
                },
            ],
        });
        req.user.firebase = { multi_factor: [{ id: 'phone-factor-1' }] };

        await requireSuperAdmin(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    test('rejects with 403 when user is not super admin', async () => {
        adminService.checkSuperAdmin.mockResolvedValue(null);

        await requireSuperAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('Super-admin access required') })
        );
        expect(next).not.toHaveBeenCalled();
        expect(adminService.logAdminAction).toHaveBeenCalled();
    });

    test('rejects with 403 when user has no MFA factors enrolled', async () => {
        adminService.checkSuperAdmin.mockResolvedValue('admin-postgres-id');
        auth.getUser.mockResolvedValue({ mfaInfo: [] });

        await requireSuperAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        const body = res.json.mock.calls[0][0];
        expect(body.message).toContain('Multi-factor authentication is required');
        expect(body.data.mfaEnrolled).toBe(false);
        expect(next).not.toHaveBeenCalled();
    });

    test('rejects with 403 when MFA enrolled but not used in current session', async () => {
        adminService.checkSuperAdmin.mockResolvedValue('admin-postgres-id');
        auth.getUser.mockResolvedValue({
            mfaInfo: [
                {
                    uid: 'totp-factor-1',
                    factorId: 'totp',
                    displayName: 'My Authenticator',
                },
            ],
        });
        req.user.firebase = { multi_factor: [] };

        await requireSuperAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        const body = res.json.mock.calls[0][0];
        expect(body.data.mfaEnrolled).toBe(true);
        expect(body.data.mfaUsedInSession).toBe(false);
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 500 when Firebase auth.getUser fails', async () => {
        adminService.checkSuperAdmin.mockResolvedValue('admin-postgres-id');
        auth.getUser.mockRejectedValue(new Error('Network error'));

        await requireSuperAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(next).not.toHaveBeenCalled();
    });

    test('error message references authenticator app, not phone number', async () => {
        adminService.checkSuperAdmin.mockResolvedValue('admin-postgres-id');
        auth.getUser.mockResolvedValue({ mfaInfo: [] });

        await requireSuperAdmin(req, res, next);

        const body = res.json.mock.calls[0][0];
        expect(body.message).toContain('authenticator app');
        expect(body.message).not.toContain('phone number');
    });

    test('response data for enrolled factors uses factorType, not phoneNumber', async () => {
        adminService.checkSuperAdmin.mockResolvedValue('admin-postgres-id');
        auth.getUser.mockResolvedValue({
            mfaInfo: [
                {
                    uid: 'totp-factor-1',
                    factorId: 'totp',
                    displayName: 'My Authenticator',
                },
            ],
        });
        req.user.firebase = { multi_factor: [] };

        await requireSuperAdmin(req, res, next);

        const body = res.json.mock.calls[0][0];
        expect(body.data.enrolledFactors[0].factorType).toBe('totp');
        expect(body.data.enrolledFactors[0].factorId).toBe('totp-factor-1');
        expect(body.data.enrolledFactors[0]).not.toHaveProperty('phoneNumber');
    });
});
