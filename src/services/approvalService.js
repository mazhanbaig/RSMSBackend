const { getPrisma, resolveUserId } = require('../config/database');

const defaultInclude = {
    requester: { select: { name: true, email: true } },
    reviewer: { select: { name: true, email: true } },
    clientSender: { select: { name: true } },
    clientTarget: { select: { name: true } },
};

async function findAllByUser(uid, filters = {}) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const where = { requesterId: userId };
    if (filters.status) where.status = filters.status;

    const records = await prisma.approvalRequest.findMany({
        where,
        include: defaultInclude,
        orderBy: { createdAt: 'desc' },
    });
    return { data: records };
}

async function findPendingForReview(uid) {
    const prisma = getPrisma();
    const records = await prisma.approvalRequest.findMany({
        where: { status: 'pending' },
        include: defaultInclude,
        orderBy: { createdAt: 'desc' },
    });
    return { data: records };
}

async function findById(uid, id) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const record = await prisma.approvalRequest.findFirst({
        where: { id, requesterId: userId },
        include: defaultInclude,
    });
    if (!record) return { error: 'Approval request not found', status: 404 };
    return { data: record };
}

async function create(uid, data) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const record = await prisma.approvalRequest.create({
        data: {
            title: data.title,
            description: data.description || null,
            targetType: data.targetType,
            targetId: data.targetId || null,
            action: data.action,
            payload: data.payload || undefined,
            status: 'pending',
            notes: data.notes || null,
            requesterId: userId,
            reviewerId: data.reviewerId || null,
            senderClientId: data.senderClientId || null,
            targetClientId: data.targetClientId || null,
        },
        include: defaultInclude,
    });
    return { data: record };
}

async function review(uid, id, reviewData) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const reviewerUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { orgId: true },
    });
    if (!reviewerUser) return { error: 'User not found', status: 404 };

    const existing = await prisma.approvalRequest.findFirst({
        where: { id },
        include: { requester: { select: { orgId: true } } },
    });
    if (!existing) return { error: 'Approval request not found', status: 404 };
    if (existing.requester?.orgId !== reviewerUser.orgId) {
        return { error: 'Approval request not found', status: 404 };
    }

    if (existing.reviewerId) {
        return { error: 'This request has already been reviewed', status: 400 };
    }

    const record = await prisma.approvalRequest.update({
        where: { id },
        data: {
            reviewerId: existing.reviewerId || userId,
            status: reviewData.status,
            notes: reviewData.notes !== undefined ? reviewData.notes : existing.notes,
        },
        include: defaultInclude,
    });
    return { data: record };
}

async function remove(uid, id) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const existing = await prisma.approvalRequest.findFirst({ where: { id, requesterId: userId } });
    if (!existing) return { error: 'Approval request not found', status: 404 };

    await prisma.approvalRequest.delete({ where: { id } });
    return { success: true };
}

module.exports = { findAllByUser, findPendingForReview, findById, create, review, remove };
