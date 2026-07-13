const { getPrisma, resolveUserId } = require('../config/database');

async function findAllByUser(uid, filters = {}) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };
    const where = { userId };
    if (filters.status) where.status = filters.status;
    if (filters.clientId) where.clientId = filters.clientId;
    const records = await prisma.invoice.findMany({ where, orderBy: { createdAt: 'desc' } });
    return { data: records };
}

async function findById(uid, id) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };
    const record = await prisma.invoice.findFirst({ where: { id, userId } });
    if (!record) return { error: 'Invoice not found', status: 404 };
    return { data: record };
}

async function create(uid, data) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const amount = Number(data.amount) || 0;
    const commission = Number(data.commission) || 0;
    const tax = Number(data.tax) || 0;
    const total = amount + commission + tax;

    const record = await prisma.invoice.create({
        data: {
            invoiceNo: `INV-${Date.now()}`,
            title: data.title,
            amount,
            commission,
            tax,
            total,
            status: data.status || 'draft',
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            paidAt: data.paidAt ? new Date(data.paidAt) : null,
            notes: data.notes || null,
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

    const existing = await prisma.invoice.findFirst({ where: { id, userId } });
    if (!existing) return { error: 'Invoice not found', status: 404 };

    const amount = data.amount !== undefined ? Number(data.amount) : Number(existing.amount);
    const commission = data.commission !== undefined ? Number(data.commission) : Number(existing.commission);
    const tax = data.tax !== undefined ? Number(data.tax) : Number(existing.tax);
    const total = amount + commission + tax;

    const record = await prisma.invoice.update({
        where: { id },
        data: {
            title: data.title !== undefined ? data.title : existing.title,
            amount,
            commission,
            tax,
            total,
            status: data.status !== undefined ? data.status : existing.status,
            dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : existing.dueDate,
            paidAt: data.paidAt !== undefined ? (data.paidAt ? new Date(data.paidAt) : null) : existing.paidAt,
            notes: data.notes !== undefined ? data.notes : existing.notes,
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

    const existing = await prisma.invoice.findFirst({ where: { id, userId } });
    if (!existing) return { error: 'Invoice not found', status: 404 };

    await prisma.invoice.delete({ where: { id } });
    return { success: true };
}

module.exports = { findAllByUser, findById, create, update, remove };
