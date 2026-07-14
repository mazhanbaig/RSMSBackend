const { getPrisma, resolveUserId } = require('../config/database');
const { logActivity } = require('./activityService');

async function findAllByUser(uid) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };
    const records = await prisma.owner.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return { data: records };
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
    await logActivity(uid, 'updated', 'Owner', id, { from: existing.status || existing.pipelineStage, to: data.status || data.pipelineStage }).catch(() => {});
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
