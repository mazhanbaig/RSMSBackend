const { getPrisma, resolveUserId } = require('../config/database');

async function logActivity(uid, action, entityType, entityId, details) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return;
    await prisma.activityLog.create({
        data: { userId, action, entityType, entityId, details: details || undefined },
    });
}

async function findAllByUser(uid, filters = {}) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const { limit = 50, offset = 0, entityType } = filters;
    const where = { userId };
    if (entityType) where.entityType = entityType;

    const [data, total] = await Promise.all([
        prisma.activityLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: Math.min(parseInt(limit, 10) || 50, 100),
            skip: parseInt(offset, 10) || 0,
        }),
        prisma.activityLog.count({ where }),
    ]);

    return { data, total };
}

module.exports = { logActivity, findAllByUser };
