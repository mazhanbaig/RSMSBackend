const { getPrisma, resolveUserId } = require('../config/database');

async function getOverview(uid) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const [totalClients, totalProperties, propertiesByStatus] = await Promise.all([
        prisma.client.count({ where: { userId } }),
        prisma.property.count({ where: { userId } }),
        prisma.property.groupBy({
            by: ['status'],
            where: { userId },
            _count: { status: true },
        }),
    ]);

    const statusBreakdown = {};
    for (const row of propertiesByStatus) {
        const key = row.status || 'unspecified';
        statusBreakdown[key] = row._count.status;
    }

    return {
        data: {
            totalClients,
            totalProperties,
            propertyStatusBreakdown: statusBreakdown,
        },
    };
}

async function getClientsByStage(uid) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const groups = await prisma.client.groupBy({
        by: ['pipelineStage'],
        where: { userId },
        _count: { pipelineStage: true },
    });

    const breakdown = {};
    for (const row of groups) {
        const key = row.pipelineStage || 'unspecified';
        breakdown[key] = row._count.pipelineStage;
    }

    return { data: breakdown };
}

async function getPropertiesTimeline(uid) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const groups = await prisma.property.groupBy({
        by: ['createdAt'],
        where: {
            userId,
            createdAt: { gte: twelveMonthsAgo },
        },
        _count: { createdAt: true },
    });

    const monthlyMap = {};
    for (let i = 0; i < 12; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap[key] = 0;
    }

    for (const row of groups) {
        const d = new Date(row.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyMap[key] !== undefined) {
            monthlyMap[key] += row._count.createdAt;
        }
    }

    const timeline = Object.entries(monthlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count }));

    return { data: timeline };
}

module.exports = { getOverview, getClientsByStage, getPropertiesTimeline };
