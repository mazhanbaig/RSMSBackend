const { getPrisma } = require('../config/database');
const { execSync } = require('child_process');

async function logAdminAction(adminUserId, action, targetType, targetId, details, ipAddress) {
    const prisma = getPrisma();
    await prisma.adminAuditLog.create({
        data: {
            adminUserId,
            action,
            targetType: targetType || null,
            targetId: targetId || null,
            details: details || null,
            ipAddress: ipAddress || null,
        },
    });
}

async function checkSuperAdmin(firebaseUid) {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
        where: { uid: firebaseUid },
        select: { id: true, isSuperAdmin: true },
    });
    if (!user || !user.isSuperAdmin) return null;
    return user.id;
}

async function checkUserSuspended(firebaseUid) {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
        where: { uid: firebaseUid },
        select: { id: true },
    });
    if (!user) return false;
    const activeSuspension = await prisma.userSuspension.findFirst({
        where: { userId: user.id, liftedAt: null },
    });
    return activeSuspension !== null;
}

async function listUsers(page, limit) {
    const prisma = getPrisma();
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
        prisma.user.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                uid: true,
                name: true,
                email: true,
                orgId: true,
                subscriptionStatus: true,
                subscriptionExpiry: true,
                createdAt: true,
                isSuperAdmin: true,
                provider: true,
                _count: {
                    select: {
                        clients: true,
                        owners: true,
                        properties: true,
                        events: true,
                        tasks: true,
                        transactions: true,
                    },
                },
            },
        }),
        prisma.user.count(),
    ]);
    return { data: users, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function getUserDetail(uid) {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
        where: { uid },
        select: {
            id: true,
            uid: true,
            name: true,
            email: true,
            orgId: true,
            subscriptionStatus: true,
            subscriptionExpiry: true,
            photoURL: true,
            provider: true,
            createdAt: true,
            isSuperAdmin: true,
            _count: {
                select: {
                    clients: true,
                    owners: true,
                    properties: true,
                    events: true,
                    tasks: true,
                    transactions: true,
                },
            },
            organization: { select: { id: true, name: true, createdAt: true } },
            userSuspensions: {
                orderBy: { suspendedAt: 'desc' },
                take: 1,
                select: { reason: true, suspendedAt: true, liftedAt: true, suspendedBy: true, liftedBy: true },
            },
        },
    });
    if (!user) return { error: 'User not found', status: 404 };
    return { data: user };
}

async function listOrganizations(page, limit) {
    const prisma = getPrisma();
    const skip = (page - 1) * limit;
    const [orgs, total] = await Promise.all([
        prisma.organization.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                createdAt: true,
                _count: { select: { users: true } },
            },
        }),
        prisma.organization.count(),
    ]);
    return { data: orgs, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function getSecurityOverview() {
    const prisma = getPrisma();
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [unauthorizedAttempts24h, unauthorizedAttempts7d, recentSuspensions, suspendedCount] = await Promise.all([
        prisma.adminAuditLog.count({
            where: { action: 'unauthorized_admin_access_attempt', createdAt: { gte: last24h } },
        }),
        prisma.adminAuditLog.count({
            where: { action: 'unauthorized_admin_access_attempt', createdAt: { gte: last7d } },
        }),
        prisma.userSuspension.count({
            where: { suspendedAt: { gte: last7d } },
        }),
        prisma.userSuspension.count({
            where: { liftedAt: null },
        }),
    ]);

    const recentAdminActions = await prisma.adminAuditLog.findMany({
        where: { createdAt: { gte: last7d } },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { action: true, adminUserId: true, targetType: true, createdAt: true, ipAddress: true },
    });

    return {
        data: {
            unauthorizedAccessAttempts: { last24h: unauthorizedAttempts24h, last7d: unauthorizedAttempts7d },
            recentSuspensions,
            currentlySuspended: suspendedCount,
            recentAdminActions,
        },
    };
}

async function getAuditLog(page, limit, filters) {
    const prisma = getPrisma();
    const where = {};
    if (filters.adminId) where.adminUserId = filters.adminId;
    if (filters.action) where.action = filters.action;
    if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
        if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
        prisma.adminAuditLog.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: { admin: { select: { uid: true, name: true, email: true } } },
        }),
        prisma.adminAuditLog.count({ where }),
    ]);
    return { data: logs, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function getNpmAuditSummary() {
    try {
        const output = execSync('npm audit --json', { timeout: 15000, encoding: 'utf-8' });
        const parsed = JSON.parse(output);
        return {
            data: {
                vulnerabilities: parsed.metadata?.vulnerabilities || null,
                auditUpdatedAt: new Date().toISOString(),
            },
        };
    } catch (err) {
        let vulnerabilities = null;
        try {
            const parsed = JSON.parse(err.stdout || '{}');
            vulnerabilities = parsed.metadata?.vulnerabilities || null;
        } catch { }

        return {
            data: {
                vulnerabilities,
                auditUpdatedAt: new Date().toISOString(),
                note: vulnerabilities ? 'Vulnerabilities found' : 'npm audit failed to run',
            },
        };
    }
}

async function suspendUser(uid, reason, adminUserId, ipAddress) {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { uid } });
    if (!user) return { error: 'User not found', status: 404 };

    const existing = await prisma.userSuspension.findFirst({
        where: { userId: user.id, liftedAt: null },
    });
    if (existing) return { error: 'User is already suspended', status: 409 };

    await prisma.userSuspension.create({
        data: {
            userId: user.id,
            reason,
            suspendedBy: adminUserId,
        },
    });

    await logAdminAction(adminUserId, 'suspended_user', 'User', uid, { reason }, ipAddress);

    return { success: true };
}

async function unsuspendUser(uid, adminUserId, ipAddress) {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { uid } });
    if (!user) return { error: 'User not found', status: 404 };

    const active = await prisma.userSuspension.findFirst({
        where: { userId: user.id, liftedAt: null },
    });
    if (!active) return { error: 'User is not currently suspended', status: 400 };

    await prisma.userSuspension.update({
        where: { id: active.id },
        data: { liftedAt: new Date(), liftedBy: adminUserId },
    });

    await logAdminAction(adminUserId, 'unsuspended_user', 'User', uid, null, ipAddress);

    return { success: true };
}

async function getSystemHealth() {
    const prisma = getPrisma();
    let dbOk = false;
    try {
        await prisma.$queryRawUnsafe('SELECT 1');
        dbOk = true;
    } catch { }

    return {
        data: {
            database: dbOk ? 'connected' : 'disconnected',
            upstashRedis: process.env.UPSTASH_REDIS_REST_URL ? 'configured' : 'not configured',
            paymentsEnabled: process.env.PAYMENTS_ENABLED === 'true',
            gitCommit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || null,
            timestamp: new Date().toISOString(),
        },
    };
}

async function hideCommunityPost(adminUserId, postId, reason) {
    const prisma = getPrisma();
    const post = await prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) return { error: 'Post not found', status: 404 };

    await prisma.communityPost.update({
        where: { id: postId },
        data: { hidden: true, hiddenBy: adminUserId, hiddenReason: reason },
    });
    return { success: true };
}

async function unhideCommunityPost(adminUserId, postId) {
    const prisma = getPrisma();
    const post = await prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) return { error: 'Post not found', status: 404 };

    await prisma.communityPost.update({
        where: { id: postId },
        data: { hidden: false, hiddenBy: null, hiddenReason: null },
    });
    return { success: true };
}

async function listAllCommunityPosts(adminUserId, filters) {
    const prisma = getPrisma();
    const where = {};
    if (filters.scope) where.scope = filters.scope;
    if (filters.orgId) where.orgId = filters.orgId;
    if (!filters.includeHidden) where.hidden = false;

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
        prisma.communityPost.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                author: { select: { id: true, name: true, email: true } },
                _count: { select: { comments: true } },
            },
        }),
        prisma.communityPost.count({ where }),
    ]);
    return { data: posts, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function getPropertySharesOverview(adminUserId) {
    const prisma = getPrisma();
    const [activeShareLinks, totalVisitors, totalConversions] = await Promise.all([
        prisma.propertyShareLink.count({ where: { active: true } }),
        prisma.propertyVisitor.count(),
        prisma.propertyVisitor.count({ where: { convertedToClientId: { not: null } } }),
    ]);
    return {
        data: {
            activeShareLinks,
            totalVisitors,
            totalConversions,
        },
    };
}

async function getChatThreadsOverview(adminUserId) {
    const prisma = getPrisma();
    const [activeThreads, totalThreads] = await Promise.all([
        prisma.chatThread.count({ where: { status: 'active' } }),
        prisma.chatThread.count(),
    ]);
    return {
        data: {
            activeThreads,
            totalThreads,
        },
    };
}

module.exports = {
    logAdminAction,
    checkSuperAdmin,
    checkUserSuspended,
    listUsers,
    getUserDetail,
    listOrganizations,
    getSecurityOverview,
    getAuditLog,
    getNpmAuditSummary,
    suspendUser,
    unsuspendUser,
    getSystemHealth,
    hideCommunityPost,
    unhideCommunityPost,
    listAllCommunityPosts,
    getPropertySharesOverview,
    getChatThreadsOverview,
};
