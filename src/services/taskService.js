const { getPrisma, resolveUserId } = require('../config/database');

async function findAllByUser(uid) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };
    const records = await prisma.task.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return { data: records };
}

async function findById(uid, id) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };
    const record = await prisma.task.findFirst({ where: { id, userId } });
    if (!record) return { error: 'Task not found', status: 404 };
    return { data: record };
}

async function create(uid, data) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const record = await prisma.task.create({
        data: {
            uid, orgId: uid,
            title: data.title,
            description: data.description || null,
            priority: data.priority || 'medium',
            completed: data.completed || false,
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
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

    const existing = await prisma.task.findFirst({ where: { id, userId } });
    if (!existing) return { error: 'Task not found', status: 404 };

    const record = await prisma.task.update({
        where: { id },
        data: {
            title: data.title !== undefined ? data.title : existing.title,
            description: data.description !== undefined ? data.description : existing.description,
            priority: data.priority !== undefined ? data.priority : existing.priority,
            completed: data.completed !== undefined ? data.completed : existing.completed,
            dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : existing.dueDate,
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

    const existing = await prisma.task.findFirst({ where: { id, userId } });
    if (!existing) return { error: 'Task not found', status: 404 };

    await prisma.task.delete({ where: { id } });
    return { success: true };
}

module.exports = { findAllByUser, findById, create, update, remove };
