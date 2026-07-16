jest.mock('../../src/config/database', () => ({
  getPrisma: jest.fn(),
  resolveUserId: jest.fn(),
}));

const { getPrisma, resolveUserId } = require('../../src/config/database');
const communityService = require('../../src/services/communityService');

describe('communityService', () => {
  let mockPrisma;

  const uidA = 'user-a-uid';
  const uidB = 'user-b-uid';
  const uidC = 'user-c-uid';
  const userIdA = 'postgres-id-a';
  const userIdB = 'postgres-id-b';
  const userIdC = 'postgres-id-c';
  const orgIdA = 'org-id-1';
  const orgIdB = 'org-id-2';
  const postId = 'post-cuid-1';

  const mockUserA = { id: userIdA, uid: uidA, orgId: orgIdA };
  const mockUserB = { id: userIdB, uid: uidB, orgId: orgIdA };
  const mockUserC = { id: userIdC, uid: uidC, orgId: orgIdB };

  const mockOrgPost = {
    id: postId,
    authorId: userIdA,
    scope: 'org',
    orgId: orgIdA,
    title: 'Org Post',
    content: 'Org content',
    hidden: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    hiddenBy: null,
    hiddenReason: null,
    author: { name: 'User A', email: 'a@test.com' },
    _count: { comments: 0 },
  };

  const mockPublicPost = {
    id: 'post-cuid-2',
    authorId: userIdA,
    scope: 'public',
    orgId: null,
    title: 'Public Post',
    content: 'Public content',
    hidden: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    hiddenBy: null,
    hiddenReason: null,
    author: { name: 'User A', email: 'a@test.com' },
    _count: { comments: 0 },
  };

  const mockHiddenPost = {
    id: 'post-cuid-3',
    authorId: userIdA,
    scope: 'public',
    orgId: null,
    title: 'Hidden Post',
    content: 'Hidden',
    hidden: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    hiddenBy: 'admin',
    hiddenReason: 'spam',
    author: { name: 'User A', email: 'a@test.com' },
    _count: { comments: 0 },
  };

  const mockComment = {
    id: 'comment-cuid-1',
    postId,
    authorId: userIdA,
    content: 'Nice post',
    hidden: false,
    createdAt: new Date(),
    author: { name: 'User A', email: 'a@test.com' },
  };

  beforeEach(() => {
    mockPrisma = {
      communityPost: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      communityComment: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };
    getPrisma.mockReturnValue(mockPrisma);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── listPosts ────────────────────────────────────────────────

  describe('listPosts', () => {
    test('returns org-scoped posts for user in correct org', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.user.findUnique.mockResolvedValue(mockUserA);
      mockPrisma.communityPost.findMany.mockResolvedValue([mockOrgPost]);
      mockPrisma.communityPost.count.mockResolvedValue(1);

      const result = await communityService.listPosts(uidA, { scope: 'org' });

      expect(mockPrisma.communityPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { hidden: false, scope: 'org', orgId: orgIdA },
        })
      );
      expect(result.data.posts).toEqual([mockOrgPost]);
      expect(result.data.total).toBe(1);
    });

    test('public posts visible regardless of org', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.communityPost.findMany.mockResolvedValue([mockPublicPost]);
      mockPrisma.communityPost.count.mockResolvedValue(1);

      const result = await communityService.listPosts(uidA, { scope: 'public' });

      expect(mockPrisma.communityPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { hidden: false, scope: 'public' },
        })
      );
      expect(result.data.posts).toEqual([mockPublicPost]);
    });

    test('hidden posts not included in list', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.communityPost.findMany.mockResolvedValue([]);
      mockPrisma.communityPost.count.mockResolvedValue(0);

      const result = await communityService.listPosts(uidA, { scope: 'public' });

      expect(mockPrisma.communityPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { hidden: false, scope: 'public' },
        })
      );
      expect(result.data.posts).toHaveLength(0);
    });

    test('returns 400 when scope is missing', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      const result = await communityService.listPosts(uidA, {});
      expect(result.error).toBe('scope must be "org" or "public"');
      expect(result.status).toBe(400);
    });

    test('returns 404 when user not found', async () => {
      resolveUserId.mockResolvedValue(null);
      const result = await communityService.listPosts('unknown', { scope: 'public' });
      expect(result.error).toBe('User not found');
      expect(result.status).toBe(404);
    });

    test('org-scoped posts exclude user from different org', async () => {
      resolveUserId.mockResolvedValue(userIdC);
      mockPrisma.user.findUnique.mockResolvedValue(mockUserC);
      mockPrisma.communityPost.findMany.mockResolvedValue([]);
      mockPrisma.communityPost.count.mockResolvedValue(0);

      const result = await communityService.listPosts(uidC, { scope: 'org' });

      expect(mockPrisma.communityPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { hidden: false, scope: 'org', orgId: orgIdB },
        })
      );
      expect(result.data.posts).toHaveLength(0);
    });
  });

  // ─── getPost ──────────────────────────────────────────────────

  describe('getPost', () => {
    test('returns post for user in same org (org-scoped)', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.communityPost.findFirst.mockResolvedValue(mockOrgPost);
      mockPrisma.user.findUnique.mockResolvedValue(mockUserB);

      const result = await communityService.getPost(uidB, postId);

      expect(result.data).toEqual(mockOrgPost);
    });

    test('blocks org-scoped post for user from different org', async () => {
      resolveUserId.mockResolvedValue(userIdC);
      mockPrisma.communityPost.findFirst.mockResolvedValue(mockOrgPost);
      mockPrisma.user.findUnique.mockResolvedValue(mockUserC);

      const result = await communityService.getPost(uidC, postId);

      expect(result.error).toBe('Post not found');
      expect(result.status).toBe(404);
    });

    test('public post visible to any user', async () => {
      resolveUserId.mockResolvedValue(userIdC);
      mockPrisma.communityPost.findFirst.mockResolvedValue(mockPublicPost);

      const result = await communityService.getPost(uidC, 'post-cuid-2');

      expect(result.data).toEqual(mockPublicPost);
    });

    test('hidden post returns 404', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.communityPost.findFirst.mockResolvedValue(null);

      const result = await communityService.getPost(uidA, 'post-hidden');

      expect(result.error).toBe('Post not found');
      expect(result.status).toBe(404);
    });
  });

  // ─── createPost ───────────────────────────────────────────────

  describe('createPost', () => {
    test('creates org-scoped post with caller/ orgId', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.user.findUnique.mockResolvedValue(mockUserA);
      mockPrisma.communityPost.create.mockResolvedValue(mockOrgPost);

      const result = await communityService.createPost(uidA, { scope: 'org', title: 'Org Post', content: 'Org content' });

      expect(mockPrisma.communityPost.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            authorId: userIdA,
            scope: 'org',
            orgId: orgIdA,
          }),
        })
      );
      expect(result.data).toEqual(mockOrgPost);
    });

    test('creates public post with orgId null', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.user.findUnique.mockResolvedValue(mockUserA);
      mockPrisma.communityPost.create.mockResolvedValue(mockPublicPost);

      const result = await communityService.createPost(uidA, { scope: 'public', title: 'Public Post', content: 'Public content' });

      const callArg = mockPrisma.communityPost.create.mock.calls[0][0];
      expect(callArg.data.authorId).toBe(userIdA);
      expect(callArg.data.scope).toBe('public');
      expect(callArg.data.orgId).toBeUndefined();
      expect(result.data).toEqual(mockPublicPost);
    });

    test('returns 400 when title or content missing', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      const result = await communityService.createPost(uidA, { scope: 'public', title: '', content: '' });
      expect(result.error).toBe('title and content are required');
      expect(result.status).toBe(400);
    });

    test('returns 400 when scope is invalid', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      const result = await communityService.createPost(uidA, { scope: 'invalid', title: 'Hi', content: 'There' });
      expect(result.error).toBe('scope must be "org" or "public"');
      expect(result.status).toBe(400);
    });
  });

  // ─── createComment ────────────────────────────────────────────

  describe('createComment', () => {
    test('creates comment on accessible post', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.communityPost.findFirst.mockResolvedValue(mockOrgPost);
      mockPrisma.user.findUnique.mockResolvedValue(mockUserA);
      mockPrisma.communityComment.create.mockResolvedValue(mockComment);

      const result = await communityService.createComment(uidA, postId, { content: 'Nice post' });

      expect(mockPrisma.communityComment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            postId,
            authorId: userIdA,
            content: 'Nice post',
          }),
        })
      );
      expect(result.data).toEqual(mockComment);
    });

    test('returns 404 when post is hidden', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.communityPost.findFirst.mockResolvedValue(null);

      const result = await communityService.createComment(uidA, postId, { content: 'Hello' });

      expect(result.error).toBe('Post not found');
      expect(result.status).toBe(404);
    });

    test('returns 400 when content is missing', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.communityPost.findFirst.mockResolvedValue(mockOrgPost);
      mockPrisma.user.findUnique.mockResolvedValue(mockUserA);

      const result = await communityService.createComment(uidA, postId, { content: '' });

      expect(result.error).toBe('content is required');
      expect(result.status).toBe(400);
    });

    test('blocks comment on org post from different org', async () => {
      resolveUserId.mockResolvedValue(userIdC);
      mockPrisma.communityPost.findFirst.mockResolvedValue(mockOrgPost);
      mockPrisma.user.findUnique.mockResolvedValue(mockUserC);

      const result = await communityService.createComment(uidC, postId, { content: 'Spam' });

      expect(result.error).toBe('Post not found');
      expect(result.status).toBe(404);
    });
  });

  // ─── getCommentsByPost ────────────────────────────────────────

  describe('getCommentsByPost', () => {
    test('returns comments for accessible post', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.communityPost.findFirst.mockResolvedValue(mockOrgPost);
      mockPrisma.user.findUnique.mockResolvedValue(mockUserA);
      mockPrisma.communityComment.findMany.mockResolvedValue([mockComment]);

      const result = await communityService.getCommentsByPost(uidA, postId);

      expect(mockPrisma.communityComment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { postId, hidden: false } })
      );
      expect(result.data).toEqual([mockComment]);
    });

    test('returns 404 when post not found', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.communityPost.findFirst.mockResolvedValue(null);

      const result = await communityService.getCommentsByPost(uidA, postId);

      expect(result.error).toBe('Post not found');
      expect(result.status).toBe(404);
    });

    test('blocks comment view on org post from different org', async () => {
      resolveUserId.mockResolvedValue(userIdC);
      mockPrisma.communityPost.findFirst.mockResolvedValue(mockOrgPost);
      mockPrisma.user.findUnique.mockResolvedValue(mockUserC);

      const result = await communityService.getCommentsByPost(uidC, postId);

      expect(result.error).toBe('Post not found');
      expect(result.status).toBe(404);
    });
  });

  // ─── updatePost ───────────────────────────────────────────────

  describe('updatePost', () => {
    test('author can update own post', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.communityPost.findFirst.mockResolvedValue(mockOrgPost);
      mockPrisma.communityPost.update.mockResolvedValue({ ...mockOrgPost, title: 'Updated' });

      const result = await communityService.updatePost(uidA, postId, { title: 'Updated' });

      expect(mockPrisma.communityPost.update).toHaveBeenCalled();
      expect(result.data.title).toBe('Updated');
    });

    test('non-author cannot update post', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.communityPost.findFirst.mockResolvedValue(mockOrgPost);

      const result = await communityService.updatePost(uidB, postId, { title: 'Hacked' });

      expect(result.error).toBe('Post not found');
      expect(result.status).toBe(404);
      expect(mockPrisma.communityPost.update).not.toHaveBeenCalled();
    });

    test('returns 404 for hidden post', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.communityPost.findFirst.mockResolvedValue(null);

      const result = await communityService.updatePost(uidA, postId, { title: 'New' });

      expect(result.error).toBe('Post not found');
      expect(result.status).toBe(404);
    });
  });

  // ─── deletePost ───────────────────────────────────────────────

  describe('deletePost', () => {
    test('author can delete own post', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.communityPost.findFirst.mockResolvedValue(mockOrgPost);

      const result = await communityService.deletePost(uidA, postId);

      expect(mockPrisma.communityPost.delete).toHaveBeenCalledWith({ where: { id: postId } });
      expect(result.success).toBe(true);
    });

    test('non-author cannot delete post', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.communityPost.findFirst.mockResolvedValue(mockOrgPost);

      const result = await communityService.deletePost(uidB, postId);

      expect(result.error).toBe('Post not found');
      expect(result.status).toBe(404);
      expect(mockPrisma.communityPost.delete).not.toHaveBeenCalled();
    });
  });
});
