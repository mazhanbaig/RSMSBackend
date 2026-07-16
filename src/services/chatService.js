const { getPrisma, resolveUserId } = require('../config/database');
const { db } = require('../config/firebase');

async function startChat(uid, token, visitorId) {
    const prisma = getPrisma();

    const link = await prisma.propertyShareLink.findFirst({
        where: { token, active: true },
    });
    if (!link) return { error: 'Share link not found or inactive', status: 404 };

    const visitor = await prisma.propertyVisitor.findFirst({
        where: { id: visitorId, shareLinkId: link.id },
    });
    if (!visitor) return { error: 'Visitor not found', status: 404 };

    const existingThread = await prisma.chatThread.findUnique({
        where: { visitorId },
    });
    if (existingThread) return { error: 'Chat thread already exists for this visitor', status: 409 };

    const thread = await prisma.chatThread.create({
        data: {
            shareLinkId: link.id,
            visitorId: visitor.id,
            agentUserId: link.createdById,
        },
    });

    const path = `propertyChats/${link.id}/${visitor.id}/messages`;
    try {
        await db.ref(path).set({ _init: true });
    } catch (fbErr) {
        console.error('chatService.startChat: Failed to init Firebase RTDB:', fbErr.message);
    }

    return { data: thread };
}

async function listThreads(uid) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const threads = await prisma.chatThread.findMany({
        where: { agentUserId: userId },
        include: {
            shareLink: {
                select: {
                    property: { select: { title: true } },
                },
            },
            visitor: {
                select: { name: true, phone: true },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
    return { data: threads };
}

async function convertToClient(uid, threadId) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const thread = await prisma.chatThread.findFirst({
        where: { id: threadId, agentUserId: userId },
        include: {
            visitor: true,
            shareLink: { include: { property: true } },
        },
    });
    if (!thread) return { error: 'Chat thread not found', status: 404 };

    const visitor = thread.visitor;
    const property = thread.shareLink.property;

    const client = await prisma.client.create({
        data: {
            uid: uid,
            orgId: uid,
            name: visitor.name,
            phone: visitor.phone,
            pipelineStage: 'lead',
            userId,
        },
    });

    await prisma.propertyVisitor.update({
        where: { id: visitor.id },
        data: { convertedToClientId: client.id },
    });

    return { data: { client, thread } };
}

async function getThread(uid, threadId) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const thread = await prisma.chatThread.findFirst({
        where: { id: threadId, agentUserId: userId },
        include: {
            visitor: {
                select: { name: true, phone: true, createdAt: true },
            },
            shareLink: {
                select: {
                    property: {
                        select: { title: true, price: true, address: true, city: true },
                    },
                },
            },
        },
    });
    if (!thread) return { error: 'Chat thread not found', status: 404 };

    return { data: thread };
}

module.exports = { startChat, listThreads, convertToClient, getThread };
