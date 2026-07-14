jest.mock('../../src/config/database', () => ({
    getPrisma: jest.fn(),
    resolveUserId: jest.fn(),
}));

jest.mock('child_process', () => ({
    execSync: jest.fn(),
}));

const { getPrisma } = require('../../src/config/database');
const adminService = require('../../src/services/adminService');

describe('adminService', () => {
    let mockPrisma;

    const adminUserId = 'admin-postgres-id';
    const regularUserId = 'regular-postgres-id';
    const adminFirebaseUid = 'admin-firebase-uid';
    const regularFirebaseUid = 'regular-firebase-uid';

    beforeEach(() => {
        mockPrisma = {
            user: {
                findUnique: jest.fn(),
                findMany: jest.fn(),
                count: jest.fn(),
            },
            organization: {
                findMany: jest.fn(),
                count: jest.fn(),
            },
            adminAuditLog: {
                create: jest.fn(),
                findMany: jest.fn(),
                count: jest.fn(),
            },
            userSuspension: {
                findFirst: jest.fn(),
                create: jest.fn(),
                count: jest.fn(),
                update: jest.fn(),
            },
            $queryRawUnsafe: jest.fn(),
            communityPost: {
                findUnique: jest.fn(),
                findMany: jest.fn(),
                count: jest.fn(),
                update: jest.fn(),
            },
            propertyShareLink: {
                count: jest.fn(),
            },
            propertyVisitor: {
                count: jest.fn(),
            },
            chatThread: {
                count: jest.fn(),
            },
        };
        getPrisma.mockReturnValue(mockPrisma);
    });

    afterEach(() => jest.clearAllMocks());

    describe('checkSuperAdmin', () => {
        test('returns admin id when user is super admin', async () => {
            mockPrisma.user.findUnique.mockResolvedValue({ id: adminUserId, isSuperAdmin: true });
            const result = await adminService.checkSuperAdmin(adminFirebaseUid);
            expect(result).toBe(adminUserId);
        });

        test('returns null when user is not super admin', async () => {
            mockPrisma.user.findUnique.mockResolvedValue({ id: regularUserId, isSuperAdmin: false });
            const result = await adminService.checkSuperAdmin(regularFirebaseUid);
            expect(result).toBeNull();
        });

        test('returns null when user does not exist', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);
            const result = await adminService.checkSuperAdmin('nonexistent');
            expect(result).toBeNull();
        });
    });

    describe('checkUserSuspended', () => {
        test('returns true when user has active suspension', async () => {
            mockPrisma.user.findUnique.mockResolvedValue({ id: regularUserId });
            mockPrisma.userSuspension.findFirst.mockResolvedValue({ id: 'susp-1', liftedAt: null });
            const result = await adminService.checkUserSuspended(regularFirebaseUid);
            expect(result).toBe(true);
        });

        test('returns false when user has no active suspension', async () => {
            mockPrisma.user.findUnique.mockResolvedValue({ id: regularUserId });
            mockPrisma.userSuspension.findFirst.mockResolvedValue(null);
            const result = await adminService.checkUserSuspended(regularFirebaseUid);
            expect(result).toBe(false);
        });

        test('returns false when user does not exist', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);
            const result = await adminService.checkUserSuspended('nonexistent');
            expect(result).toBe(false);
        });
    });

    describe('logAdminAction', () => {
        test('creates audit log entry', async () => {
            mockPrisma.adminAuditLog.create.mockResolvedValue({ id: 'log-1' });
            await adminService.logAdminAction(adminUserId, 'viewed_user', 'User', 'target-uid', { test: true }, '127.0.0.1');
            expect(mockPrisma.adminAuditLog.create).toHaveBeenCalledWith({
                data: {
                    adminUserId,
                    action: 'viewed_user',
                    targetType: 'User',
                    targetId: 'target-uid',
                    details: { test: true },
                    ipAddress: '127.0.0.1',
                },
            });
        });
    });

    describe('suspendUser', () => {
        test('creates suspension and logs action', async () => {
            mockPrisma.user.findUnique.mockResolvedValue({ id: regularUserId, uid: regularFirebaseUid });
            mockPrisma.userSuspension.findFirst.mockResolvedValue(null);
            mockPrisma.userSuspension.create.mockResolvedValue({ id: 'susp-1' });
            mockPrisma.adminAuditLog.create.mockResolvedValue({ id: 'log-1' });

            const result = await adminService.suspendUser(regularFirebaseUid, 'Test reason', adminUserId, '127.0.0.1');
            expect(result.success).toBe(true);
            expect(mockPrisma.userSuspension.create).toHaveBeenCalledWith({
                data: { userId: regularUserId, reason: 'Test reason', suspendedBy: adminUserId },
            });
            expect(mockPrisma.adminAuditLog.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        action: 'suspended_user',
                        targetId: regularFirebaseUid,
                    }),
                })
            );
        });

        test('returns error when user already suspended', async () => {
            mockPrisma.user.findUnique.mockResolvedValue({ id: regularUserId });
            mockPrisma.userSuspension.findFirst.mockResolvedValue({ id: 'susp-1', liftedAt: null });
            const result = await adminService.suspendUser(regularFirebaseUid, 'Reason', adminUserId);
            expect(result.error).toBe('User is already suspended');
            expect(result.status).toBe(409);
        });

        test('returns error when user not found', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);
            const result = await adminService.suspendUser('nonexistent', 'Reason', adminUserId);
            expect(result.error).toBe('User not found');
        });
    });

    describe('unsuspendUser', () => {
        test('lifts suspension and logs action', async () => {
            mockPrisma.user.findUnique.mockResolvedValue({ id: regularUserId });
            mockPrisma.userSuspension.findFirst.mockResolvedValue({ id: 'susp-1', liftedAt: null });
            mockPrisma.userSuspension.update.mockResolvedValue({ id: 'susp-1', liftedAt: new Date(), liftedBy: adminUserId });
            mockPrisma.adminAuditLog.create.mockResolvedValue({ id: 'log-1' });

            const result = await adminService.unsuspendUser(regularFirebaseUid, adminUserId);
            expect(result.success).toBe(true);
            expect(mockPrisma.userSuspension.update).toHaveBeenCalled();
        });

        test('returns error when user not suspended', async () => {
            mockPrisma.user.findUnique.mockResolvedValue({ id: regularUserId });
            mockPrisma.userSuspension.findFirst.mockResolvedValue(null);
            const result = await adminService.unsuspendUser(regularFirebaseUid, adminUserId);
            expect(result.error).toBe('User is not currently suspended');
        });
    });

    describe('getSystemHealth', () => {
        test('returns health status with connected database', async () => {
            mockPrisma.$queryRawUnsafe.mockResolvedValue([{ '1': 1 }]);
            const result = await adminService.getSystemHealth();
            expect(result.data.database).toBe('connected');
            expect(result.data).toHaveProperty('upstashRedis');
            expect(result.data).toHaveProperty('sentry');
            expect(result.data).toHaveProperty('paymentsEnabled');
            expect(result.data).toHaveProperty('timestamp');
        });
    });

    describe('getNpmAuditSummary', () => {
        test('returns audit summary on success', async () => {
            const { execSync } = require('child_process');
            execSync.mockReturnValue(JSON.stringify({
                metadata: {
                    vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0 },
                },
            }));
            const result = await adminService.getNpmAuditSummary();
            expect(result.data.vulnerabilities).toBeDefined();
            expect(result.data.auditUpdatedAt).toBeDefined();
        });

        test('handles npm audit failure gracefully', async () => {
            const { execSync } = require('child_process');
            const err = new Error('npm audit failed');
            err.stdout = JSON.stringify({
                metadata: {
                    vulnerabilities: { info: 1, low: 2, moderate: 3, high: 1, critical: 0 },
                },
            });
            execSync.mockImplementation(() => { throw err; });
            const result = await adminService.getNpmAuditSummary();
            expect(result.data.vulnerabilities).toBeDefined();
        });
    });

    describe('listUsers', () => {
        test('returns paginated user list', async () => {
            mockPrisma.user.findMany.mockResolvedValue([{ id: 'u1', uid: 'uid1', name: 'User 1', email: 'u1@test.com' }]);
            mockPrisma.user.count.mockResolvedValue(1);
            const result = await adminService.listUsers(1, 20);
            expect(result.data).toHaveLength(1);
            expect(result.total).toBe(1);
            expect(result.page).toBe(1);
        });
    });

    describe('getUserDetail', () => {
        test('returns user detail with counts', async () => {
            mockPrisma.user.findUnique.mockResolvedValue({
                id: 'u1', uid: 'uid1', name: 'User 1', email: 'u1@test.com',
                _count: { clients: 5, properties: 3 },
                organization: { id: 'org1', name: 'Org 1' },
                userSuspensions: [],
            });
            const result = await adminService.getUserDetail('uid1');
            expect(result.data.name).toBe('User 1');
            expect(result.data._count.clients).toBe(5);
        });

        test('returns error for nonexistent user', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);
            const result = await adminService.getUserDetail('nonexistent');
            expect(result.error).toBe('User not found');
        });
    });

    describe('listOrganizations', () => {
        test('returns paginated organization list', async () => {
            mockPrisma.organization.findMany.mockResolvedValue([{ id: 'org1', name: 'Org 1', _count: { users: 3 } }]);
            mockPrisma.organization.count.mockResolvedValue(1);
            const result = await adminService.listOrganizations(1, 20);
            expect(result.data).toHaveLength(1);
        });
    });

    describe('getSecurityOverview', () => {
        test('returns security overview with counts', async () => {
            mockPrisma.adminAuditLog.count.mockResolvedValue(0);
            mockPrisma.userSuspension.count.mockResolvedValue(0);
            mockPrisma.adminAuditLog.findMany.mockResolvedValue([]);
            const result = await adminService.getSecurityOverview();
            expect(result.data).toHaveProperty('unauthorizedAccessAttempts');
            expect(result.data).toHaveProperty('currentlySuspended');
            expect(result.data).toHaveProperty('recentAdminActions');
        });
    });

    describe('getAuditLog', () => {
        test('returns paginated audit log', async () => {
            mockPrisma.adminAuditLog.findMany.mockResolvedValue([{ id: 'log-1', action: 'viewed_user', admin: { uid: 'admin-uid' } }]);
            mockPrisma.adminAuditLog.count.mockResolvedValue(1);
            const result = await adminService.getAuditLog(1, 50, {});
            expect(result.data).toHaveLength(1);
        });
    });

    describe('hideCommunityPost', () => {
        test('sets hidden=true and logs to AdminAuditLog', async () => {
            const postId = 'post-cuid-1';
            mockPrisma.communityPost.findUnique.mockResolvedValue({ id: postId, hidden: false });
            mockPrisma.communityPost.update.mockResolvedValue({ id: postId, hidden: true, hiddenBy: adminUserId, hiddenReason: 'Spam' });
            mockPrisma.adminAuditLog.create.mockResolvedValue({ id: 'log-1' });

            const result = await adminService.hideCommunityPost(adminUserId, postId, 'Spam');

            expect(mockPrisma.communityPost.findUnique).toHaveBeenCalledWith({ where: { id: postId } });
            expect(mockPrisma.communityPost.update).toHaveBeenCalledWith({
                where: { id: postId },
                data: { hidden: true, hiddenBy: adminUserId, hiddenReason: 'Spam' },
            });
            expect(result.success).toBe(true);
        });

        test('returns error when post not found', async () => {
            mockPrisma.communityPost.findUnique.mockResolvedValue(null);

            const result = await adminService.hideCommunityPost(adminUserId, 'nonexistent', 'Reason');

            expect(result.error).toBe('Post not found');
            expect(mockPrisma.communityPost.update).not.toHaveBeenCalled();
        });
    });

    describe('unhideCommunityPost', () => {
        test('reverses hidden state and clears fields', async () => {
            const postId = 'post-cuid-1';
            mockPrisma.communityPost.findUnique.mockResolvedValue({ id: postId, hidden: true, hiddenBy: adminUserId, hiddenReason: 'Spam' });
            mockPrisma.communityPost.update.mockResolvedValue({ id: postId, hidden: false, hiddenBy: null, hiddenReason: null });

            const result = await adminService.unhideCommunityPost(adminUserId, postId);

            expect(mockPrisma.communityPost.update).toHaveBeenCalledWith({
                where: { id: postId },
                data: { hidden: false, hiddenBy: null, hiddenReason: null },
            });
            expect(result.success).toBe(true);
        });

        test('returns error when post not found', async () => {
            mockPrisma.communityPost.findUnique.mockResolvedValue(null);

            const result = await adminService.unhideCommunityPost(adminUserId, 'nonexistent');

            expect(result.error).toBe('Post not found');
        });
    });

    describe('listAllCommunityPosts', () => {
        test('includes hidden posts by default', async () => {
            const filters = { page: 1, limit: 20, includeHidden: true };
            mockPrisma.communityPost.findMany.mockResolvedValue([
                { id: 'p1', title: 'Visible Post', hidden: false, author: { name: 'User' }, _count: { comments: 0 } },
                { id: 'p2', title: 'Hidden Post', hidden: true, author: { name: 'User' }, _count: { comments: 0 } },
            ]);
            mockPrisma.communityPost.count.mockResolvedValue(2);

            const result = await adminService.listAllCommunityPosts(adminUserId, filters);

            expect(mockPrisma.communityPost.findMany).toHaveBeenCalled();
            expect(result.data).toHaveLength(2);
            expect(result.total).toBe(2);
        });

        test('filters out hidden posts when includeHidden is false', async () => {
            const filters = { page: 1, limit: 20, includeHidden: false };
            mockPrisma.communityPost.findMany.mockResolvedValue([
                { id: 'p1', title: 'Visible Post', hidden: false, author: { name: 'User' }, _count: { comments: 0 } },
            ]);
            mockPrisma.communityPost.count.mockResolvedValue(1);

            const result = await adminService.listAllCommunityPosts(adminUserId, filters);

            expect(mockPrisma.communityPost.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { hidden: false },
                })
            );
            expect(result.data).toHaveLength(1);
        });
    });

    describe('getPropertySharesOverview', () => {
        test('returns aggregate stats across all orgs', async () => {
            mockPrisma.propertyShareLink.count.mockResolvedValue(10);
            mockPrisma.propertyVisitor.count.mockResolvedValueOnce(25).mockResolvedValueOnce(3);

            const result = await adminService.getPropertySharesOverview(adminUserId);

            expect(mockPrisma.propertyShareLink.count).toHaveBeenCalledWith({ where: { active: true } });
            expect(mockPrisma.propertyVisitor.count).toHaveBeenCalled();
            expect(mockPrisma.propertyVisitor.count).toHaveBeenCalledWith({ where: { convertedToClientId: { not: null } } });
            expect(result.data).toEqual({
                activeShareLinks: 10,
                totalVisitors: 25,
                totalConversions: 3,
            });
        });
    });

    describe('getChatThreadsOverview', () => {
        test('returns chat thread metadata counts', async () => {
            mockPrisma.chatThread.count.mockResolvedValueOnce(5).mockResolvedValueOnce(8);

            const result = await adminService.getChatThreadsOverview(adminUserId);

            expect(mockPrisma.chatThread.count).toHaveBeenCalledWith({ where: { status: 'active' } });
            expect(mockPrisma.chatThread.count).toHaveBeenCalledWith();
            expect(result.data).toEqual({
                activeThreads: 5,
                totalThreads: 8,
            });
        });
    });
});
