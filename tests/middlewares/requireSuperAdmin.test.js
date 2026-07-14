const adminService = require('../../src/services/adminService');
const mfaService = require('../../src/services/mfaService');
const { getPrisma } = require('../../src/config/database');

jest.mock('../../src/services/adminService', () => ({
    checkSuperAdmin: jest.fn(),
    logAdminAction: jest.fn(),
}));

jest.mock('../../src/services/mfaService', () => ({
    verifyCode: jest.fn(),
}));

jest.mock('../../src/config/database', () => ({
    getPrisma: jest.fn(),
}));

const requireSuperAdmin = require('../../src/middlewares/requireSuperAdmin');

describe('requireSuperAdmin', () => {
    let req, res, next;
    let mockPrisma;

    beforeEach(() => {
        mockPrisma = {
            user: {
                findUnique: jest.fn(),
            },
        };
        getPrisma.mockReturnValue(mockPrisma);

        req = {
            user: { uid: 'admin-uid' },
            ip: '127.0.0.1',
            headers: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    test('passes when user is super admin with valid TOTP code', async () => {
        adminService.checkSuperAdmin.mockResolvedValue('admin-postgres-id');
        mockPrisma.user.findUnique.mockResolvedValue({
            totpEnabled: true,
            totpSecret: 'encrypted:secret:here',
        });
        mfaService.verifyCode.mockResolvedValue({ valid: true });
        req.headers['x-totp-code'] = '123456';

        await requireSuperAdmin(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.adminUserId).toBe('admin-postgres-id');
        expect(mfaService.verifyCode).toHaveBeenCalledWith('admin-uid', '123456');
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

    test('rejects with 403 when TOTP is not enabled', async () => {
        adminService.checkSuperAdmin.mockResolvedValue('admin-postgres-id');
        mockPrisma.user.findUnique.mockResolvedValue({
            totpEnabled: false,
            totpSecret: null,
        });

        await requireSuperAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        const body = res.json.mock.calls[0][0];
        expect(body.message).toContain('Multi-factor authentication is required');
        expect(body.data.totpEnabled).toBe(false);
        expect(body.data.totpEnrolled).toBe(false);
        expect(next).not.toHaveBeenCalled();
    });

    test('rejects with 403 when TOTP is enrolled but not yet enabled', async () => {
        adminService.checkSuperAdmin.mockResolvedValue('admin-postgres-id');
        mockPrisma.user.findUnique.mockResolvedValue({
            totpEnabled: false,
            totpSecret: 'encrypted:secret',
        });

        await requireSuperAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        const body = res.json.mock.calls[0][0];
        expect(body.message).toContain('Multi-factor authentication is required');
        expect(body.data.totpEnabled).toBe(false);
        expect(body.data.totpEnrolled).toBe(true);
        expect(next).not.toHaveBeenCalled();
    });

    test('rejects with 403 when TOTP enabled but X-TOTP-Code header missing', async () => {
        adminService.checkSuperAdmin.mockResolvedValue('admin-postgres-id');
        mockPrisma.user.findUnique.mockResolvedValue({
            totpEnabled: true,
            totpSecret: 'encrypted:secret',
        });

        await requireSuperAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        const body = res.json.mock.calls[0][0];
        expect(body.message).toContain('X-TOTP-Code header is required');
        expect(body.data.totpCodeMissing).toBe(true);
        expect(next).not.toHaveBeenCalled();
    });

    test('rejects with 403 when TOTP code is invalid', async () => {
        adminService.checkSuperAdmin.mockResolvedValue('admin-postgres-id');
        mockPrisma.user.findUnique.mockResolvedValue({
            totpEnabled: true,
            totpSecret: 'encrypted:secret',
        });
        mfaService.verifyCode.mockResolvedValue({ valid: false });
        req.headers['x-totp-code'] = '000000';

        await requireSuperAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        const body = res.json.mock.calls[0][0];
        expect(body.message).toContain('Invalid TOTP code');
        expect(body.data.totpCodeInvalid).toBe(true);
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 500 when Prisma fails', async () => {
        adminService.checkSuperAdmin.mockResolvedValue('admin-postgres-id');
        mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

        await requireSuperAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(next).not.toHaveBeenCalled();
    });

    test('error message references authenticator app, not phone number', async () => {
        adminService.checkSuperAdmin.mockResolvedValue('admin-postgres-id');
        mockPrisma.user.findUnique.mockResolvedValue({
            totpEnabled: false,
            totpSecret: null,
        });

        await requireSuperAdmin(req, res, next);

        const body = res.json.mock.calls[0][0];
        expect(body.message).toContain('authenticator app');
        expect(body.message).not.toContain('phone number');
    });
});
