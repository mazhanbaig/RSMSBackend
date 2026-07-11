const { getPrisma, resolveUserId } = require('../config/database');

async function findAllByUser(uid) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };
    const records = await prisma.client.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return { data: records };
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
            userId,
        },
    });
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
        },
    });
    return { data: record };
}

async function remove(uid, id) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const existing = await prisma.client.findFirst({ where: { id, userId } });
    if (!existing) return { error: 'Client not found', status: 404 };

    await prisma.client.delete({ where: { id } });
    return { success: true };
}

module.exports = { findAllByUser, findById, create, update, remove };
