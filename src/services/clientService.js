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
    if (query.status) where.status = query.status;
    if (query.pipelineStage) where.pipelineStage = query.pipelineStage;

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
        prisma.client.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
        prisma.client.count({ where }),
    ]);
    return { data: records, total, page, limit };
}

async function findById(uid, id) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };
    const record = await prisma.client.findFirst({ where: { id, userId } });
    if (!record) return { error: 'Client not found', status: 404 };
    return { data: record };
}

async function create(uid, data) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const record = await prisma.client.create({
        data: {
            uid, orgId: uid,
            name: data.name,
            email: data.email || null,
            phone: data.phone || null,
            budgetMin: data.budgetMin || null,
            budgetMax: data.budgetMax || null,
            preferences: data.preferences || null,
            notes: data.notes || null,
            status: data.status || null,
            pipelineStage: data.pipelineStage || null,
            userId,
        },
    });
    await logActivity(uid, 'created', 'Client', record.id, null).catch(() => {});
    return { data: record };
}

async function update(uid, id, data) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const existing = await prisma.client.findFirst({ where: { id, userId } });
    if (!existing) return { error: 'Client not found', status: 404 };

    const record = await prisma.client.update({
        where: { id },
        data: {
            name: data.name !== undefined ? data.name : existing.name,
            email: data.email !== undefined ? data.email : existing.email,
            phone: data.phone !== undefined ? data.phone : existing.phone,
            budgetMin: data.budgetMin !== undefined ? data.budgetMin : existing.budgetMin,
            budgetMax: data.budgetMax !== undefined ? data.budgetMax : existing.budgetMax,
            preferences: data.preferences !== undefined ? data.preferences : existing.preferences,
            notes: data.notes !== undefined ? data.notes : existing.notes,
            status: data.status !== undefined ? data.status : existing.status,
            pipelineStage: data.pipelineStage !== undefined ? data.pipelineStage : existing.pipelineStage,
        },
    });
    await logActivity(uid, 'updated', 'Client', id, { from: existing.pipelineStage || existing.status, to: data.pipelineStage || data.status }).catch(() => {});
    return { data: record };
}

async function updatePipelineStage(uid, id, pipelineStage) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const existing = await prisma.client.findFirst({ where: { id, userId } });
    if (!existing) return { error: 'Client not found', status: 404 };

    const record = await prisma.client.update({
        where: { id },
        data: { pipelineStage },
    });
    await logActivity(uid, 'updated', 'Client', id, { from: existing.pipelineStage, to: pipelineStage }).catch(() => {});
    return { data: record };
}

async function remove(uid, id) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const existing = await prisma.client.findFirst({ where: { id, userId } });
    if (!existing) return { error: 'Client not found', status: 404 };

    await prisma.client.delete({ where: { id } });
    await logActivity(uid, 'deleted', 'Client', id, null).catch(() => {});
    return { success: true };
}

module.exports = { findAllByUser, findById, create, update, remove, updatePipelineStage };
