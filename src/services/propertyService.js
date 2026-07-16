const { getPrisma, resolveUserId } = require('../config/database');
const { logActivity } = require('./activityService');

function buildPropertyFilters(queryParams) {
    const filters = {};

    if (queryParams.minPrice !== undefined) {
        filters.price = { ...filters.price, gte: parseFloat(queryParams.minPrice) };
    }
    if (queryParams.maxPrice !== undefined) {
        filters.price = { ...filters.price, lte: parseFloat(queryParams.maxPrice) };
    }
    if (queryParams.city) {
        filters.city = { contains: queryParams.city, mode: 'insensitive' };
    }
    if (queryParams.propertyType) {
        filters.propertyType = queryParams.propertyType;
    }
    if (queryParams.bedrooms !== undefined) {
        filters.bedrooms = parseInt(queryParams.bedrooms, 10);
    }
    if (queryParams.bathrooms !== undefined) {
        filters.bathrooms = parseInt(queryParams.bathrooms, 10);
    }
    if (queryParams.status) {
        filters.status = queryParams.status;
    }
    if (queryParams.featured !== undefined) {
        filters.featured = queryParams.featured === 'true';
    }

    return filters;
}

async function findAllByUser(uid, queryParams) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const where = { userId };
    const filterConditions = buildPropertyFilters(queryParams || {});
    Object.assign(where, filterConditions);

    const records = await prisma.property.findMany({ where, orderBy: { createdAt: 'desc' } });
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
            address: data.address || null,
            city: data.city || null,
            propertyType: data.propertyType || null,
            bedrooms: data.bedrooms !== undefined ? parseInt(data.bedrooms, 10) : null,
            bathrooms: data.bathrooms !== undefined ? parseInt(data.bathrooms, 10) : null,
            featured: data.featured === true || data.featured === 'true',
            images: data.images || null,
            ownerId: data.ownerId || null,
            clientId: data.clientId || null,
            userId,
        },
    });
    await logActivity(uid, 'created', 'Property', record.id, null).catch(() => {});
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
            address: data.address !== undefined ? data.address : existing.address,
            city: data.city !== undefined ? data.city : existing.city,
            propertyType: data.propertyType !== undefined ? data.propertyType : existing.propertyType,
            bedrooms: data.bedrooms !== undefined ? parseInt(data.bedrooms, 10) : existing.bedrooms,
            bathrooms: data.bathrooms !== undefined ? parseInt(data.bathrooms, 10) : existing.bathrooms,
            featured: data.featured !== undefined ? (data.featured === true || data.featured === 'true') : existing.featured,
            images: data.images !== undefined ? data.images : existing.images,
            ownerId: data.ownerId !== undefined ? data.ownerId : existing.ownerId,
            clientId: data.clientId !== undefined ? data.clientId : existing.clientId,
        },
    });
    await logActivity(uid, 'updated', 'Property', id, { from: existing.status || existing.pipelineStage, to: data.status || data.pipelineStage }).catch(() => {});
    return { data: record };
}

async function remove(uid, id) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const existing = await prisma.property.findFirst({ where: { id, userId } });
    if (!existing) return { error: 'Property not found', status: 404 };

    await prisma.property.delete({ where: { id } });
    await logActivity(uid, 'deleted', 'Property', id, null).catch(() => {});
    return { success: true };
}

async function toggleFeatured(uid, id) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const existing = await prisma.property.findFirst({ where: { id, userId } });
    if (!existing) return { error: 'Property not found', status: 404 };

    const record = await prisma.property.update({
        where: { id },
        data: { featured: !existing.featured },
    });
    await logActivity(uid, 'updated', 'Property', id, { from: existing.featured ? 'featured' : 'not-featured', to: !existing.featured ? 'featured' : 'not-featured' }).catch(() => {});
    return { data: record };
}

async function updateCustomFields(uid, id, customFields) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const existing = await prisma.property.findFirst({ where: { id, userId } });
    if (!existing) return { error: 'Property not found', status: 404 };

    const merged = { ...(existing.customFields || {}), ...customFields };
    const record = await prisma.property.update({
        where: { id },
        data: { customFields: merged },
    });
    await logActivity(uid, 'updated', 'Property', id, { field: 'customFields', customFields: merged }).catch(() => {});
    return { data: record };
}

module.exports = { findAllByUser, findById, create, update, remove, toggleFeatured, updateCustomFields, buildPropertyFilters };
