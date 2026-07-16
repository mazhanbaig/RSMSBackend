const { getPrisma, resolveUserId } = require('../config/database');

async function createShareLink(uid, propertyId, sharedWithName) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const property = await prisma.property.findFirst({ where: { id: propertyId, userId } });
    if (!property) return { error: 'Property not found', status: 404 };

    const link = await prisma.propertyShareLink.create({
        data: { propertyId, createdById: userId, sharedWithName: sharedWithName || null },
    });
    return { data: link };
}

async function deactivateShareLink(uid, linkId) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const link = await prisma.propertyShareLink.findFirst({
        where: { id: linkId },
        include: { property: { select: { userId: true } } },
    });
    if (!link) return { error: 'Share link not found', status: 404 };
    if (link.property.userId !== userId) return { error: 'Share link not found', status: 404 };

    const updated = await prisma.propertyShareLink.update({
        where: { id: linkId },
        data: { active: false },
    });
    return { data: updated };
}

async function getShareLinkByToken(token) {
    const prisma = getPrisma();
    const link = await prisma.propertyShareLink.findFirst({
        where: { token, active: true },
        include: {
            property: {
                select: {
                    title: true,
                    price: true,
                    address: true,
                    city: true,
                    propertyType: true,
                    bedrooms: true,
                    bathrooms: true,
                    images: true,
                },
            },
        },
    });
    if (!link) return { error: 'Share link not found or inactive', status: 404 };

    await prisma.propertyShareLink.update({
        where: { id: link.id },
        data: { viewCount: { increment: 1 } },
    });

    link.viewCount += 1;
    const { sharedWithName, ...publicData } = link;
    return { data: publicData };
}

async function registerVisitor(token, data) {
    const prisma = getPrisma();
    const link = await prisma.propertyShareLink.findFirst({
        where: { token, active: true },
    });
    if (!link) return { error: 'Share link not found or inactive', status: 404 };

    const visitor = await prisma.propertyVisitor.create({
        data: {
            shareLinkId: link.id,
            name: data.name,
            phone: data.phone,
        },
    });
    return { data: visitor };
}

async function getShareLinksByProperty(uid, propertyId) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const property = await prisma.property.findFirst({ where: { id: propertyId, userId } });
    if (!property) return { error: 'Property not found', status: 404 };

    const links = await prisma.propertyShareLink.findMany({
        where: { propertyId },
        include: {
            _count: { select: { visitors: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
    return { data: links.map(l => ({
        id: l.id,
        token: l.token,
        active: l.active,
        viewCount: l.viewCount,
        sharedWithName: l.sharedWithName,
        createdAt: l.createdAt,
        _count: l._count,
    })) };
}

module.exports = { createShareLink, deactivateShareLink, getShareLinkByToken, registerVisitor, getShareLinksByProperty };
