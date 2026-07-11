const { getPrisma, resolveUserId } = require('../config/database');

async function findAllByUser(uid) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };
    const records = await prisma.property.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return { data: records };
}

async function findById(uid, id) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };
    const record = await prisma.property.findFirst({ where: { id, userId } });
    if (!record) return { error: 'Property not found', status: 404 };
    return { data: record };
}

async function create(uid, data) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const record = await prisma.property.create({
        data: {
            uid, orgId: uid,
            title: data.title,
            description: data.description || null,
            price: data.price || null,
            status: data.status || null,
            images: data.images || null,
            ownerId: data.ownerId || null,
            clientId: data.clientId || null,
            userId,
        },
    });
    return { data: record };
}

async function update(uid, id, data) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const existing = await prisma.property.findFirst({ where: { id, userId } });
    if (!existing) return { error: 'Property not found', status: 404 };

    const record = await prisma.property.update({
        where: { id },
        data: {
            title: data.title !== undefined ? data.title : existing.title,
            description: data.description !== undefined ? data.description : existing.description,
            price: data.price !== undefined ? data.price : existing.price,
            status: data.status !== undefined ? data.status : existing.status,
            images: data.images !== undefined ? data.images : existing.images,
            ownerId: data.ownerId !== undefined ? data.ownerId : existing.ownerId,
            clientId: data.clientId !== undefined ? data.clientId : existing.clientId,
        },
    });
    return { data: record };
}

async function remove(uid, id) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const existing = await prisma.property.findFirst({ where: { id, userId } });
    if (!existing) return { error: 'Property not found', status: 404 };

    await prisma.property.delete({ where: { id } });
    return { success: true };
}

module.exports = { findAllByUser, findById, create, update, remove };
