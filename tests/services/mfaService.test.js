const otplib = require('otplib');
const { getPrisma, resolveUserId } = require('../../src/config/database');
const { encrypt, decrypt } = require('../../src/utils/encryption');

jest.mock('otplib', () => ({
    generateSecret: jest.fn(),
    generateURI: jest.fn(),
    verify: jest.fn(),
}));

jest.mock('../../src/config/database', () => ({
    getPrisma: jest.fn(),
    resolveUserId: jest.fn(),
}));

jest.mock('../../src/utils/encryption', () => ({
    encrypt: jest.fn((s) => `encrypted:${s}`),
    decrypt: jest.fn((s) => s.replace('encrypted:', '')),
}));

const mfaService = require('../../src/services/mfaService');

describe('mfaService.generateSecret', () => {
    let mockPrisma;

    beforeEach(() => {
        jest.clearAllMocks();

        mockPrisma = {
            user: {
                update: jest.fn(),
                findUnique: jest.fn(),
            },
        };

        getPrisma.mockReturnValue(mockPrisma);
    });

    it('should return error if user not found', async () => {
        resolveUserId.mockResolvedValue(null);

        const result = await mfaService.generateSecret('unknown-uid');

        expect(result).toEqual({ error: 'User not found', status: 404 });
        expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should generate a secret, store encrypted, and return URI', async () => {
        resolveUserId.mockResolvedValue('user-1');
        mockPrisma.user.findUnique.mockResolvedValue({ email: 'admin@test.com' });

        otplib.generateSecret.mockReturnValue('JBSWY3DPEHPK3PXP');
        otplib.generateURI.mockReturnValue('otpauth://totp/RSMS%20Admin:admin@test.com?secret=JBSWY3DPEHPK3PXP&issuer=RSMS%20Admin');

        const result = await mfaService.generateSecret('test-uid');

        expect(result.data.secret).toBe('JBSWY3DPEHPK3PXP');
        expect(result.data.otpauthUrl).toContain('otpauth://');
        expect(result.data.message).toContain('authenticator app');

        expect(mockPrisma.user.update).toHaveBeenCalledWith({
            where: { id: 'user-1' },
            data: { totpSecret: 'encrypted:JBSWY3DPEHPK3PXP' },
        });

        expect(otplib.generateURI).toHaveBeenCalledWith({
            issuer: 'RSMS Admin',
            label: 'admin@test.com',
            secret: 'JBSWY3DPEHPK3PXP',
        });
    });
});

describe('mfaService.verifyEnrollment', () => {
    let mockPrisma;

    beforeEach(() => {
        jest.clearAllMocks();

        mockPrisma = {
            user: {
                update: jest.fn(),
                findUnique: jest.fn(),
            },
        };

        getPrisma.mockReturnValue(mockPrisma);
    });

    it('should return error if user not found', async () => {
        resolveUserId.mockResolvedValue(null);

        const result = await mfaService.verifyEnrollment('unknown-uid', '123456');

        expect(result).toEqual({ error: 'User not found', status: 404 });
    });

    it('should return error if no secret stored', async () => {
        resolveUserId.mockResolvedValue('user-1');
        mockPrisma.user.findUnique.mockResolvedValue({ totpSecret: null });

        const result = await mfaService.verifyEnrollment('test-uid', '123456');

        expect(result).toEqual({ error: expect.stringContaining('enroll first'), status: 400 });
    });

    it('should enable TOTP on valid code', async () => {
        resolveUserId.mockResolvedValue('user-1');
        mockPrisma.user.findUnique.mockResolvedValue({ totpSecret: 'encrypted:JBSWY3DPEHPK3PXP' });

        otplib.verify.mockResolvedValue({ valid: true });

        const result = await mfaService.verifyEnrollment('test-uid', '123456');

        expect(result.data.message).toContain('verified and enabled');
        expect(mockPrisma.user.update).toHaveBeenCalledWith({
            where: { id: 'user-1' },
            data: { totpEnabled: true },
        });
        expect(otplib.verify).toHaveBeenCalledWith({ token: '123456', secret: 'JBSWY3DPEHPK3PXP' });
    });

    it('should reject invalid code', async () => {
        resolveUserId.mockResolvedValue('user-1');
        mockPrisma.user.findUnique.mockResolvedValue({ totpSecret: 'encrypted:JBSWY3DPEHPK3PXP' });

        otplib.verify.mockResolvedValue({ valid: false });

        const result = await mfaService.verifyEnrollment('test-uid', '000000');

        expect(result).toEqual({ error: expect.stringContaining('Invalid'), status: 400 });
        expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
});

describe('mfaService.verifyCode', () => {
    let mockPrisma;

    beforeEach(() => {
        jest.clearAllMocks();

        mockPrisma = {
            user: {
                findUnique: jest.fn(),
            },
        };

        getPrisma.mockReturnValue(mockPrisma);
    });

    it('should return valid=false if user not found', async () => {
        resolveUserId.mockResolvedValue(null);

        const result = await mfaService.verifyCode('unknown-uid', '123456');

        expect(result).toEqual({ valid: false, reason: 'User not found' });
    });

    it('should return valid=false if TOTP not enabled', async () => {
        resolveUserId.mockResolvedValue('user-1');
        mockPrisma.user.findUnique.mockResolvedValue({ totpSecret: null, totpEnabled: false });

        const result = await mfaService.verifyCode('test-uid', '123456');

        expect(result).toEqual({ valid: false, reason: 'TOTP not enabled' });
    });

    it('should return valid=true for correct code', async () => {
        resolveUserId.mockResolvedValue('user-1');
        mockPrisma.user.findUnique.mockResolvedValue({ totpSecret: 'encrypted:JBSWY3DPEHPK3PXP', totpEnabled: true });

        otplib.verify.mockResolvedValue({ valid: true });

        const result = await mfaService.verifyCode('test-uid', '123456');

        expect(result).toEqual({ valid: true });
    });

    it('should return valid=false for incorrect code', async () => {
        resolveUserId.mockResolvedValue('user-1');
        mockPrisma.user.findUnique.mockResolvedValue({ totpSecret: 'encrypted:JBSWY3DPEHPK3PXP', totpEnabled: true });

        otplib.verify.mockResolvedValue({ valid: false });

        const result = await mfaService.verifyCode('test-uid', '000000');

        expect(result).toEqual({ valid: false });
    });
});

describe('mfaService.getStatus', () => {
    let mockPrisma;

    beforeEach(() => {
        jest.clearAllMocks();

        mockPrisma = {
            user: {
                findUnique: jest.fn(),
            },
        };

        getPrisma.mockReturnValue(mockPrisma);
    });

    it('should return error if user not found', async () => {
        resolveUserId.mockResolvedValue(null);

        const result = await mfaService.getStatus('unknown-uid');

        expect(result).toEqual({ error: 'User not found', status: 404 });
    });

    it('should return enrolled=false when no secret', async () => {
        resolveUserId.mockResolvedValue('user-1');
        mockPrisma.user.findUnique.mockResolvedValue({ totpEnabled: false, totpSecret: null });

        const result = await mfaService.getStatus('test-uid');

        expect(result.data).toEqual({ totpEnabled: false, totpEnrolled: false });
    });

    it('should return enrolled=true when secret exists', async () => {
        resolveUserId.mockResolvedValue('user-1');
        mockPrisma.user.findUnique.mockResolvedValue({ totpEnabled: true, totpSecret: 'encrypted:something' });

        const result = await mfaService.getStatus('test-uid');

        expect(result.data).toEqual({ totpEnabled: true, totpEnrolled: true });
    });
});
