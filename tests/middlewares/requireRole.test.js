const { getPrisma, resolveUserId } = require('../../src/config/database');

jest.mock('../../src/config/database', () => ({
    getPrisma: jest.fn(),
    resolveUserId: jest.fn(),
}));

const { requireRole } = require('../../src/middlewares/requireRole');

describe('requireRole', () => {
    let mockPrisma;
    let req, res, next;

    beforeEach(() => {
        mockPrisma = {
            user: {
                findUnique: jest.fn(),
            },
        };
        getPrisma.mockReturnValue(mockPrisma);

        req = { user: { uid: 'test-uid' }, method: 'GET' };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        next = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('allows access when user has required role', async () => {
        resolveUserId.mockResolvedValue('user-id-1');
        mockPrisma.user.findUnique.mockResolvedValue({ role: 'owner' });

        const middleware = requireRole('owner');
        await middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    test('allows access when user is in allowed roles list', async () => {
        resolveUserId.mockResolvedValue('user-id-1');
        mockPrisma.user.findUnique.mockResolvedValue({ role: 'agent' });

        const middleware = requireRole('owner', 'agent');
        await middleware(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    test('denies access when agent calls owner-only route', async () => {
        resolveUserId.mockResolvedValue('user-id-1');
        mockPrisma.user.findUnique.mockResolvedValue({ role: 'agent' });

        const middleware = requireRole('owner');
        await middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Forbidden: insufficient role' })
        );
        expect(next).not.toHaveBeenCalled();
    });

    test('denies access when user not found', async () => {
        resolveUserId.mockResolvedValue(null);

        const middleware = requireRole('owner');
        await middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('denies access when user record has no role field', async () => {
        resolveUserId.mockResolvedValue('user-id-1');
        mockPrisma.user.findUnique.mockResolvedValue(null);

        const middleware = requireRole('owner');
        await middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    test('allows agent to read after authentication', async () => {
        resolveUserId.mockResolvedValue('user-id-1');
        mockPrisma.user.findUnique.mockResolvedValue({ role: 'agent' });

        const middleware = requireRole('owner', 'agent');
        await middleware(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    test('allows agent to write on entity routes', async () => {
        req.method = 'POST';
        resolveUserId.mockResolvedValue('user-id-1');
        mockPrisma.user.findUnique.mockResolvedValue({ role: 'agent' });

        const middleware = requireRole('owner', 'agent');
        await middleware(req, res, next);

        expect(next).toHaveBeenCalled();
    });
});
