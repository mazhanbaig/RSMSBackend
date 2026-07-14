const { authenticator } = require('otplib');

jest.mock('otplib', () => ({
    authenticator: {
        generateSecret: jest.fn(),
        keyuri: jest.fn(),
        verify: jest.fn(),
    },
}));

jest.mock('../../src/config/database', () => ({
    getPrisma: jest.fn(),
    resolveUserId: jest.fn(),
}));

jest.mock('../../src/utils/encryption', () => ({
    encrypt: jest.fn(),
    decrypt: jest.fn(),
}));

const { getPrisma, resolveUserId } = require('../../src/config/database');
const { encrypt, decrypt } = require('../../src/utils/encryption');
const mfaService = require('../../src/services/mfaService');

describe('mfaService', () => {
    let mockPrisma;

    beforeEach(() => {
        mockPrisma = {
            user: {
                findUnique: jest.fn(),
                update: jest.fn(),
            },
        };
        getPrisma.mockReturnValue(mockPrisma);
        jest.clearAllMocks();
    });

    // ─── generateSecret ───────────────────────────────────────────

    describe('generateSecret', () => {
        test('returns secret and otpauth URL', async () => {
            resolveUserId.mockResolvedValue('user-1');
            mockPrisma.user.findUnique.mockResolvedValue({ email: 'admin@test.com' });
            authenticator.generateSecret.mockReturnValue('JBSWY3DPEHPK3PXP');
            authenticator.keyuri.mockReturnValue('otpauth://totp/RSMS%20Admin:admin@test.com?secret=JBSWY3DPEHPK3PXP&issuer=RSMS%20Admin');
            encrypt.mockReturnValue('encrypted:secret');

            const result = await mfaService.generateSecret('firebase-uid');

            expect(result.data).toMatchObject({
                secret: 'JBSWY3DPEHPK3PXP',
                otpauthUrl: expect.stringContaining('otpauth://'),
            });
            expect(encrypt).toHaveBeenCalledWith('JBSWY3DPEHPK3PXP');
            expect(mockPrisma.user.update).toHaveBeenCalledWith({
                where: { id: 'user-1' },
                data: { totpSecret: 'encrypted:secret' },
            });
        });

        test('returns error when user not found', async () => {
            resolveUserId.mockResolvedValue(null);

            const result = await mfaService.generateSecret('nonexistent');

            expect(result.error).toBe('User not found');
            expect(result.status).toBe(404);
        });
    });

    // ─── verifyEnrollment ─────────────────────────────────────────

    describe('verifyEnrollment', () => {
        test('enables TOTP on valid code', async () => {
            resolveUserId.mockResolvedValue('user-1');
            mockPrisma.user.findUnique.mockResolvedValue({
                totpSecret: 'encrypted:stored-secret',
            });
            decrypt.mockReturnValue('JBSWY3DPEHPK3PXP');
            authenticator.verify.mockReturnValue(true);

            const result = await mfaService.verifyEnrollment('firebase-uid', '123456');

            expect(result.data.message).toContain('verified and enabled');
            expect(authenticator.verify).toHaveBeenCalledWith({ token: '123456', secret: 'JBSWY3DPEHPK3PXP' });
            expect(mockPrisma.user.update).toHaveBeenCalledWith({
                where: { id: 'user-1' },
                data: { totpEnabled: true },
            });
        });

        test('rejects invalid code', async () => {
            resolveUserId.mockResolvedValue('user-1');
            mockPrisma.user.findUnique.mockResolvedValue({
                totpSecret: 'encrypted:stored-secret',
            });
            decrypt.mockReturnValue('JBSWY3DPEHPK3PXP');
            authenticator.verify.mockReturnValue(false);

            const result = await mfaService.verifyEnrollment('firebase-uid', '000000');

            expect(result.error).toContain('Invalid code');
            expect(result.status).toBe(400);
            expect(mockPrisma.user.update).not.toHaveBeenCalled();
        });

        test('rejects when no secret exists', async () => {
            resolveUserId.mockResolvedValue('user-1');
            mockPrisma.user.findUnique.mockResolvedValue({ totpSecret: null });

            const result = await mfaService.verifyEnrollment('firebase-uid', '123456');

            expect(result.error).toContain('No TOTP secret found');
            expect(result.status).toBe(400);
        });

        test('returns error when user not found', async () => {
            resolveUserId.mockResolvedValue(null);

            const result = await mfaService.verifyEnrollment('nonexistent', '123456');

            expect(result.error).toBe('User not found');
            expect(result.status).toBe(404);
        });
    });

    // ─── verifyCode ───────────────────────────────────────────────

    describe('verifyCode', () => {
        test('returns valid when code matches', async () => {
            resolveUserId.mockResolvedValue('user-1');
            mockPrisma.user.findUnique.mockResolvedValue({
                totpEnabled: true,
                totpSecret: 'encrypted:stored-secret',
            });
            decrypt.mockReturnValue('JBSWY3DPEHPK3PXP');
            authenticator.verify.mockReturnValue(true);

            const result = await mfaService.verifyCode('firebase-uid', '123456');

            expect(result).toEqual({ valid: true });
        });

        test('returns invalid when code does not match', async () => {
            resolveUserId.mockResolvedValue('user-1');
            mockPrisma.user.findUnique.mockResolvedValue({
                totpEnabled: true,
                totpSecret: 'encrypted:stored-secret',
            });
            decrypt.mockReturnValue('JBSWY3DPEHPK3PXP');
            authenticator.verify.mockReturnValue(false);

            const result = await mfaService.verifyCode('firebase-uid', '000000');

            expect(result).toEqual({ valid: false });
        });

        test('returns invalid when TOTP not enabled', async () => {
            resolveUserId.mockResolvedValue('user-1');
            mockPrisma.user.findUnique.mockResolvedValue({
                totpEnabled: false,
                totpSecret: null,
            });

            const result = await mfaService.verifyCode('firebase-uid', '123456');

            expect(result).toEqual({ valid: false, reason: 'TOTP not enabled' });
        });

        test('returns reason when user not found', async () => {
            resolveUserId.mockResolvedValue(null);

            const result = await mfaService.verifyCode('nonexistent', '123456');

            expect(result).toEqual({ valid: false, reason: 'User not found' });
        });
    });

    // ─── getStatus ────────────────────────────────────────────────

    describe('getStatus', () => {
        test('returns enabled and enrolled state', async () => {
            resolveUserId.mockResolvedValue('user-1');
            mockPrisma.user.findUnique.mockResolvedValue({
                totpEnabled: true,
                totpSecret: 'encrypted:secret',
            });

            const result = await mfaService.getStatus('firebase-uid');

            expect(result.data).toEqual({
                totpEnabled: true,
                totpEnrolled: true,
            });
        });

        test('returns not enrolled when secret is null', async () => {
            resolveUserId.mockResolvedValue('user-1');
            mockPrisma.user.findUnique.mockResolvedValue({
                totpEnabled: false,
                totpSecret: null,
            });

            const result = await mfaService.getStatus('firebase-uid');

            expect(result.data).toEqual({
                totpEnabled: false,
                totpEnrolled: false,
            });
        });

        test('returns error when user not found', async () => {
            resolveUserId.mockResolvedValue(null);

            const result = await mfaService.getStatus('nonexistent');

            expect(result.error).toBe('User not found');
            expect(result.status).toBe(404);
        });
    });
});
