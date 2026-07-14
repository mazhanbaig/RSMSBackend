const { getPrisma, resolveUserId } = require('../../src/config/database');

jest.mock('../../src/config/database', () => ({
    getPrisma: jest.fn(),
    resolveUserId: jest.fn(),
}));

const activityService = require('../../src/services/activityService');

describe('activityService', () => {
    let mockPrisma;

    const uidA = 'user-a-uid';
    const uidB = 'user-b-uid';
    const userIdA = 'postgres-id-a';
    const userIdB = 'postgres-id-b';

    const mockLog = {
        id: 'log-cuid-1',
        userId: userIdA,
        action: 'created',
        entityType: 'Client',
        entityId: 'client-cuid-1',
        details: null,
        createdAt: new Date(),
    };

    const mockLogB = {
        id: 'log-cuid-2',
        userId: userIdB,
        action: 'created',
        entityType: 'Owner',
        entityId: 'owner-cuid-1',
        details: null,
        createdAt: new Date(),
    };

    beforeEach(() => {
        mockPrisma = {
            activityLog: {
                create: jest.fn(),
                findMany: jest.fn(),
                count: jest.fn(),
            },
        };
        getPrisma.mockReturnValue(mockPrisma);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('logActivity', () => {
        test('creates a record in the ActivityLog table', async () => {
            resolveUserId.mockResolvedValue(userIdA);
            mockPrisma.activityLog.create.mockResolvedValue(mockLog);

            await activityService.logActivity(uidA, 'created', 'Client', 'client-cuid-1', null);

            expect(resolveUserId).toHaveBeenCalledWith(uidA);
            expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
                data: { userId: userIdA, action: 'created', entityType: 'Client', entityId: 'client-cuid-1', details: undefined },
            });
        });

        test('does not throw when user is not found', async () => {
            resolveUserId.mockResolvedValue(null);

            await expect(
                activityService.logActivity('unknown-uid', 'created', 'Client', 'id', null)
            ).resolves.toBeUndefined();

            expect(mockPrisma.activityLog.create).not.toHaveBeenCalled();
        });
    });

    describe('findAllByUser', () => {
        test('returns only the calling user logs', async () => {
            resolveUserId.mockResolvedValue(userIdA);
            mockPrisma.activityLog.findMany.mockResolvedValue([mockLog]);
            mockPrisma.activityLog.count.mockResolvedValue(1);

            const result = await activityService.findAllByUser(uidA);

            expect(mockPrisma.activityLog.findMany).toHaveBeenCalledWith({
                where: { userId: userIdA },
                orderBy: { createdAt: 'desc' },
                take: 50,
                skip: 0,
            });
            expect(mockPrisma.activityLog.count).toHaveBeenCalledWith({
                where: { userId: userIdA },
            });
            expect(result.data).toEqual([mockLog]);
            expect(result.total).toBe(1);
        });

        test('supports entityType filter', async () => {
            resolveUserId.mockResolvedValue(userIdA);
            mockPrisma.activityLog.findMany.mockResolvedValue([mockLog]);
            mockPrisma.activityLog.count.mockResolvedValue(1);

            const result = await activityService.findAllByUser(uidA, { entityType: 'Client' });

            expect(mockPrisma.activityLog.findMany).toHaveBeenCalledWith({
                where: { userId: userIdA, entityType: 'Client' },
                orderBy: { createdAt: 'desc' },
                take: 50,
                skip: 0,
            });
            expect(mockPrisma.activityLog.count).toHaveBeenCalledWith({
                where: { userId: userIdA, entityType: 'Client' },
            });
            expect(result.data).toEqual([mockLog]);
            expect(result.total).toBe(1);
        });

        test('ownership isolation: user B cannot see user A activity logs', async () => {
            resolveUserId.mockResolvedValue(userIdB);
            mockPrisma.activityLog.findMany.mockResolvedValue([mockLogB]);
            mockPrisma.activityLog.count.mockResolvedValue(1);

            const result = await activityService.findAllByUser(uidB);

            expect(mockPrisma.activityLog.findMany).toHaveBeenCalledWith({
                where: { userId: userIdB },
                orderBy: { createdAt: 'desc' },
                take: 50,
                skip: 0,
            });
            expect(result.data).toEqual([mockLogB]);
            expect(result.data[0].userId).toBe(userIdB);
            expect(result.data[0].userId).not.toBe(userIdA);
        });

        test('returns 404 error when user not found', async () => {
            resolveUserId.mockResolvedValue(null);

            const result = await activityService.findAllByUser('unknown-uid');

            expect(result.error).toBe('User not found');
            expect(result.status).toBe(404);
            expect(mockPrisma.activityLog.findMany).not.toHaveBeenCalled();
        });
    });
});
