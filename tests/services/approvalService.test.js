const { getPrisma, resolveUserId } = require('../../src/config/database');

jest.mock('../../src/config/database', () => ({
  getPrisma: jest.fn(),
  resolveUserId: jest.fn(),
}));

const approvalService = require('../../src/services/approvalService');

describe('approvalService', () => {
  let mockPrisma;

  const uidA = 'user-a-uid';
  const uidB = 'user-b-uid';
  const userIdA = 'postgres-id-a';
  const userIdB = 'postgres-id-b';
  const approvalId = 'approval-cuid-1';

  const mockApproval = {
    id: approvalId,
    title: 'Price Change',
    description: 'Reduce listing price',
    targetType: 'property',
    targetId: 'prop-1',
    action: 'update',
    payload: { price: 5000000 },
    status: 'pending',
    notes: null,
    requesterId: userIdA,
    reviewerId: null,
    senderClientId: null,
    targetClientId: null,
  };

  const mockApprovalWithReviewer = {
    ...mockApproval,
    reviewerId: userIdB,
  };

  beforeEach(() => {
    mockPrisma = {
      approvalRequest: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };
    getPrisma.mockReturnValue(mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllByUser', () => {
    test('returns approval requests scoped to requester', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.approvalRequest.findMany.mockResolvedValue([mockApproval]);

      const result = await approvalService.findAllByUser(uidA);

      expect(mockPrisma.approvalRequest.findMany).toHaveBeenCalledWith({
        where: { requesterId: userIdA },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(result.data).toEqual([mockApproval]);
    });

    test('filters by status', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.approvalRequest.findMany.mockResolvedValue([mockApproval]);

      await approvalService.findAllByUser(uidA, { status: 'pending' });

      expect(mockPrisma.approvalRequest.findMany).toHaveBeenCalledWith({
        where: { requesterId: userIdA, status: 'pending' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    test('returns 404 when user not found', async () => {
      resolveUserId.mockResolvedValue(null);

      const result = await approvalService.findAllByUser('unknown');

      expect(result.error).toBe('User not found');
      expect(result.status).toBe(404);
    });
  });

  describe('findPendingForReview', () => {
    test('returns all pending requests', async () => {
      mockPrisma.approvalRequest.findMany.mockResolvedValue([mockApproval]);

      const result = await approvalService.findPendingForReview(uidA);

      expect(mockPrisma.approvalRequest.findMany).toHaveBeenCalledWith({
        where: { status: 'pending' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(result.data).toEqual([mockApproval]);
    });
  });

  describe('findById', () => {
    test('returns request when owned by user', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.approvalRequest.findFirst.mockResolvedValue(mockApproval);

      const result = await approvalService.findById(uidA, approvalId);

      expect(mockPrisma.approvalRequest.findFirst).toHaveBeenCalledWith({
        where: { id: approvalId, requesterId: userIdA },
        include: expect.any(Object),
      });
      expect(result.data).toEqual(mockApproval);
    });

    test('returns 404 when request belongs to different user', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.approvalRequest.findFirst.mockResolvedValue(null);

      const result = await approvalService.findById(uidB, approvalId);

      expect(result.error).toBe('Approval request not found');
      expect(result.status).toBe(404);
    });
  });

  describe('create', () => {
    test('creates approval request with requesterId', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.approvalRequest.create.mockResolvedValue(mockApproval);

      const result = await approvalService.create(uidA, {
        title: 'Price Change',
        targetType: 'property',
        action: 'update',
      });

      expect(mockPrisma.approvalRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Price Change',
          targetType: 'property',
          action: 'update',
          status: 'pending',
          requesterId: userIdA,
        }),
        include: expect.any(Object),
      });
      expect(result.data).toEqual(mockApproval);
    });

    test('returns 404 when user not found', async () => {
      resolveUserId.mockResolvedValue(null);

      const result = await approvalService.create('unknown', { title: 'Test', targetType: 'property', action: 'update' });

      expect(result.error).toBe('User not found');
      expect(result.status).toBe(404);
    });
  });

  describe('review', () => {
    const mockApprovalWithRequester = {
      ...mockApproval,
      requester: { orgId: 'org-a' },
    };

    beforeEach(() => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.user.findUnique.mockResolvedValue({ orgId: 'org-a' });
    });

    test('assigns reviewer and updates status on first review', async () => {
      mockPrisma.approvalRequest.findFirst.mockResolvedValue(mockApprovalWithRequester);
      mockPrisma.approvalRequest.update.mockResolvedValue({
        ...mockApproval,
        reviewerId: userIdB,
        status: 'approved',
        notes: 'Looks good',
      });

      const result = await approvalService.review(uidB, approvalId, { status: 'approved', notes: 'Looks good' });

      expect(mockPrisma.approvalRequest.findFirst).toHaveBeenCalledWith({
        where: { id: approvalId },
        include: { requester: { select: { orgId: true } } },
      });
      expect(mockPrisma.approvalRequest.update).toHaveBeenCalledWith({
        where: { id: approvalId },
        data: expect.objectContaining({
          reviewerId: userIdB,
          status: 'approved',
          notes: 'Looks good',
        }),
        include: expect.any(Object),
      });
      expect(result.data.status).toBe('approved');
    });

    test('rejects when reviewer already assigned to someone else', async () => {
      const assignedRequest = { ...mockApprovalWithRequester, reviewerId: userIdB };
      mockPrisma.approvalRequest.findFirst.mockResolvedValue(assignedRequest);

      const result = await approvalService.review(uidB, approvalId, { status: 'approved' });

      expect(result.error).toBe('This request has already been reviewed');
      expect(result.status).toBe(400);
    });

    test('returns 404 when request not found', async () => {
      mockPrisma.approvalRequest.findFirst.mockResolvedValue(null);

      const result = await approvalService.review(uidB, approvalId, { status: 'approved' });

      expect(result.error).toBe('Approval request not found');
      expect(result.status).toBe(404);
    });
  });

  describe('remove', () => {
    test('deletes request when owned by requester', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.approvalRequest.findFirst.mockResolvedValue(mockApproval);
      mockPrisma.approvalRequest.delete.mockResolvedValue(mockApproval);

      const result = await approvalService.remove(uidA, approvalId);

      expect(mockPrisma.approvalRequest.delete).toHaveBeenCalledWith({
        where: { id: approvalId },
      });
      expect(result.success).toBe(true);
    });

    test('returns 404 when deleting another user request', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.approvalRequest.findFirst.mockResolvedValue(null);

      const result = await approvalService.remove(uidB, approvalId);

      expect(result.error).toBe('Approval request not found');
      expect(result.status).toBe(404);
    });
  });
});
