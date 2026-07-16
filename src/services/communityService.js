const { getPrisma, resolveUserId } = require('../config/database');

async function listPosts(uid, filters = {}) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const { scope, page = 1, limit = 20 } = filters;
    if (!scope || !['org', 'public'].includes(scope)) {
        return { error: 'scope must be "org" or "public"', status: 400 };
    }

    const where = { hidden: false, scope };

    if (scope === 'org') {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.orgId) return { error: 'User org not found', status: 404 };
        where.orgId = user.orgId;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [posts, total] = await Promise.all([
        prisma.communityPost.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: 'desc' },
            include: {
                author: { select: { name: true, email: true } },
                _count: { select: { comments: true } },
            },
        }),
        prisma.communityPost.count({ where }),
    ]);

    return { data: { posts, total } };
}

async function getPost(uid, postId) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const post = await prisma.communityPost.findFirst({
        where: { id: postId, hidden: false },
        include: {
            author: { select: { name: true, email: true } },
            comments: {
                where: { hidden: false },
                include: { author: { select: { name: true, email: true } } },
                orderBy: { createdAt: 'asc' },
            },
        },
    });

    if (!post) return { error: 'Post not found', status: 404 };

    if (post.scope === 'org') {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.orgId !== post.orgId) {
            return { error: 'Post not found', status: 404 };
        }
    }

    return { data: post };
}

async function createPost(uid, data) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const { scope, title, content } = data;
    if (!scope || !['org', 'public'].includes(scope)) {
        return { error: 'scope must be "org" or "public"', status: 400 };
    }
    if (!title || !content) {
        return { error: 'title and content are required', status: 400 };
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { error: 'User not found', status: 404 };

    const postData = {
        authorId: userId,
        scope,
        title,
        content,
    };

    if (scope === 'org') {
        if (!user.orgId) return { error: 'User org not found', status: 404 };
        postData.orgId = user.orgId;
    }

    const post = await prisma.communityPost.create({
        data: postData,
        include: { author: { select: { name: true, email: true } } },
    });

    return { data: post };
}

async function createComment(uid, postId, data) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const post = await prisma.communityPost.findFirst({
        where: { id: postId, hidden: false },
    });

    if (!post) return { error: 'Post not found', status: 404 };

    if (post.scope === 'org') {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.orgId !== post.orgId) {
            return { error: 'Post not found', status: 404 };
        }
    }

    if (!data.content) {
        return { error: 'content is required', status: 400 };
    }

    const comment = await prisma.communityComment.create({
        data: {
            postId,
            authorId: userId,
            content: data.content,
        },
        include: { author: { select: { name: true, email: true } } },
    });

    return { data: comment };
}

async function getCommentsByPost(uid, postId) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const post = await prisma.communityPost.findFirst({
        where: { id: postId, hidden: false },
    });

    if (!post) return { error: 'Post not found', status: 404 };

    if (post.scope === 'org') {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.orgId !== post.orgId) {
            return { error: 'Post not found', status: 404 };
        }
    }

    const comments = await prisma.communityComment.findMany({
        where: { postId, hidden: false },
        include: { author: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
    });

    return { data: comments };
}

async function updatePost(uid, postId, data) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const post = await prisma.communityPost.findFirst({
        where: { id: postId, hidden: false },
    });

    if (!post) return { error: 'Post not found', status: 404 };
    if (post.authorId !== userId) return { error: 'Post not found', status: 404 };

    const updated = await prisma.communityPost.update({
        where: { id: postId },
        data: {
            title: data.title !== undefined ? data.title : post.title,
            content: data.content !== undefined ? data.content : post.content,
        },
        include: { author: { select: { name: true, email: true } } },
    });

    return { data: updated };
}

async function deletePost(uid, postId) {
    const prisma = getPrisma();
    const userId = await resolveUserId(uid);
    if (!userId) return { error: 'User not found', status: 404 };

    const post = await prisma.communityPost.findFirst({
        where: { id: postId, hidden: false },
    });

    if (!post) return { error: 'Post not found', status: 404 };
    if (post.authorId !== userId) return { error: 'Post not found', status: 404 };

    await prisma.communityPost.delete({ where: { id: postId } });
    return { success: true };
}

module.exports = { listPosts, getPost, createPost, createComment, getCommentsByPost, updatePost, deletePost };
