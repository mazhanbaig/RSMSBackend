const { getPrisma, resolveUserId } = require('../../src/config/database');

jest.mock('../../src/config/database', () => ({
    getPrisma: jest.fn(),
    resolveUserId: jest.fn(),
}));

const { requireRole, requireViewerReadOnly } = require('../../src/middlewares/requireRole');

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

    test('denies access when user does not have required role', async () => {
        resolveUserId.mockResolvedValue('user-id-1');
        mockPrisma.user.findUnique.mockResolvedValue({ role: 'viewer' });

        const middleware = requireRole('owner', 'agent');
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
});

describe('requireViewerReadOnly', () => {
    let mockPrisma;
    let req, res, next;

    beforeEach(() => {
        mockPrisma = {
            user: {
                findUnique: jest.fn(),
            },
        };
        getPrisma.mockReturnValue(mockPrisma);

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        next = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('allows GET for viewer role', async () => {
        req = { user: { uid: 'test-uid' }, method: 'GET' };
        resolveUserId.mockResolvedValue('user-id-1');
        mockPrisma.user.findUnique.mockResolvedValue({ role: 'viewer' });

        await requireViewerReadOnly(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    test('blocks POST for viewer role with 403', async () => {
        req = { user: { uid: 'test-uid' }, method: 'POST' };
        resolveUserId.mockResolvedValue('user-id-1');
        mockPrisma.user.findUnique.mockResolvedValue({ role: 'viewer' });

        await requireViewerReadOnly(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    test('blocks PUT for viewer role', async () => {
        req = { user: { uid: 'test-uid' }, method: 'PUT' };
        resolveUserId.mockResolvedValue('user-id-1');
        mockPrisma.user.findUnique.mockResolvedValue({ role: 'viewer' });

        await requireViewerReadOnly(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
    });

    test('blocks PATCH for viewer role', async () => {
        req = { user: { uid: 'test-uid' }, method: 'PATCH' };
        resolveUserId.mockResolvedValue('user-id-1');
        mockPrisma.user.findUnique.mockResolvedValue({ role: 'viewer' });

        await requireViewerReadOnly(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
    });

    test('blocks DELETE for viewer role', async () => {
        req = { user: { uid: 'test-uid' }, method: 'DELETE' };
        resolveUserId.mockResolvedValue('user-id-1');
        mockPrisma.user.findUnique.mockResolvedValue({ role: 'viewer' });

        await requireViewerReadOnly(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
    });

    test('allows POST for agent role', async () => {
        req = { user: { uid: 'test-uid' }, method: 'POST' };
        resolveUserId.mockResolvedValue('user-id-1');
        mockPrisma.user.findUnique.mockResolvedValue({ role: 'agent' });

        await requireViewerReadOnly(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    test('allows POST for owner role', async () => {
        req = { user: { uid: 'test-uid' }, method: 'POST' };
        resolveUserId.mockResolvedValue('user-id-1');
        mockPrisma.user.findUnique.mockResolvedValue({ role: 'owner' });

        await requireViewerReadOnly(req, res, next);

        expect(next).toHaveBeenCalled();
    });
});
