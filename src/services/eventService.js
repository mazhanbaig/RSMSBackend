const { getPrisma, resolveUserId } = require('../config/database');

async function findAllByUser(uid) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };
    const records = await prisma.event.findMany({ where: { userId }, orderBy: { startTime: 'desc' } });
    return { data: records };
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
    return { data: record };
}

async function remove(uid, id) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const existing = await prisma.event.findFirst({ where: { id, userId } });
    if (!existing) return { error: 'Event not found', status: 404 };

    await prisma.event.delete({ where: { id } });
    return { success: true };
}

module.exports = { findAllByUser, findById, create, update, remove };
