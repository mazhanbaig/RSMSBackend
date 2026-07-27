const { getPrisma, resolveUserId } = require('../config/database');
const { logActivity } = require('./activityService');

async function findAllByUser(uid, query = {}) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const where = { userId };
    if (query.search) {
        where.OR = [
            { title: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
        ];
    }

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
        prisma.event.findMany({ where, skip, take: limit, orderBy: { startTime: 'desc' } }),
        prisma.event.count({ where }),
    ]);
    return { data: records, total, page, limit };
}

async function findById(uid, id) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };
    const record = await prisma.event.findFirst({ where: { id, userId } });
    if (!record) return { error: 'Event not found', status: 404 };
    return { data: record };
}

async function create(uid, data) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const record = await prisma.event.create({
        data: {
            uid, orgId: uid,
            title: data.title,
            description: data.description || null,
            startTime: new Date(data.startTime),
            clientId: data.clientId || null,
            propertyId: data.propertyId || null,
            userId,
        },
    });
    await logActivity(uid, 'created', 'Event', record.id, null).catch(() => {});
    return { data: record };
}

async function update(uid, id, data) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const existing = await prisma.event.findFirst({ where: { id, userId } });
    if (!existing) return { error: 'Event not found', status: 404 };

    const record = await prisma.event.update({
        where: { id },
        data: {
            title: data.title !== undefined ? data.title : existing.title,
            description: data.description !== undefined ? data.description : existing.description,
            startTime: data.startTime !== undefined ? new Date(data.startTime) : existing.startTime,
            clientId: data.clientId !== undefined ? data.clientId : existing.clientId,
            propertyId: data.propertyId !== undefined ? data.propertyId : existing.propertyId,
        },
    });
    await logActivity(uid, 'updated', 'Event', id, null).catch(() => {});
    return { data: record };
}

async function remove(uid, id) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const existing = await prisma.event.findFirst({ where: { id, userId } });
    if (!existing) return { error: 'Event not found', status: 404 };

    await prisma.event.delete({ where: { id } });
    await logActivity(uid, 'deleted', 'Event', id, null).catch(() => {});
    return { success: true };
}

module.exports = { findAllByUser, findById, create, update, remove };
