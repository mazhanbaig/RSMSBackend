const { getPrisma, resolveUserId } = require('../config/database');
const { logActivity } = require('./activityService');

async function findAllByUser(uid, query = {}) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const where = { userId };
    if (query.search) {
        where.OR = [
            { name: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
            { phone: { contains: query.search, mode: 'insensitive' } },
        ];
    }

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
        prisma.owner.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
        prisma.owner.count({ where }),
    ]);
    return { data: records, total, page, limit };
}

async function findById(uid, id) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };
    const record = await prisma.owner.findFirst({ where: { id, userId } });
    if (!record) return { error: 'Owner not found', status: 404 };
    return { data: record };
}

async function create(uid, data) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const record = await prisma.owner.create({
        data: {
            uid, orgId: uid,
            name: data.name,
            email: data.email || null,
            phone: data.phone || null,
            notes: data.notes || null,
            userId,
        },
    });
    await logActivity(uid, 'created', 'Owner', record.id, null).catch(() => {});
    return { data: record };
}

async function update(uid, id, data) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const existing = await prisma.owner.findFirst({ where: { id, userId } });
    if (!existing) return { error: 'Owner not found', status: 404 };

    const record = await prisma.owner.update({
        where: { id },
        data: {
            name: data.name !== undefined ? data.name : existing.name,
            email: data.email !== undefined ? data.email : existing.email,
            phone: data.phone !== undefined ? data.phone : existing.phone,
            notes: data.notes !== undefined ? data.notes : existing.notes,
        },
    });
    await logActivity(uid, 'updated', 'Owner', id, null).catch(() => {});
    return { data: record };
}

async function remove(uid, id) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const existing = await prisma.owner.findFirst({ where: { id, userId } });
    if (!existing) return { error: 'Owner not found', status: 404 };

    await prisma.owner.delete({ where: { id } });
    await logActivity(uid, 'deleted', 'Owner', id, null).catch(() => {});
    return { success: true };
}

module.exports = { findAllByUser, findById, create, update, remove };
