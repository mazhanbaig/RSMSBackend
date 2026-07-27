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
    if (query.completed !== undefined) where.completed = query.completed === 'true';
    if (query.priority) where.priority = query.priority;

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
        prisma.task.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
        prisma.task.count({ where }),
    ]);
    return { data: records, total, page, limit };
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
    await logActivity(uid, 'created', 'Task', record.id, null).catch(() => {});
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
    await logActivity(uid, 'updated', 'Task', id, { from: existing.completed, to: data.completed }).catch(() => {});
    return { data: record };
}

async function remove(uid, id) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const existing = await prisma.task.findFirst({ where: { id, userId } });
    if (!existing) return { error: 'Task not found', status: 404 };

    await prisma.task.delete({ where: { id } });
    await logActivity(uid, 'deleted', 'Task', id, null).catch(() => {});
    return { success: true };
}

module.exports = { findAllByUser, findById, create, update, remove };
