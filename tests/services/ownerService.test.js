jest.mock('../../src/config/database', () => ({
  getPrisma: jest.fn(),
  resolveUserId: jest.fn(),
}));

const { getPrisma, resolveUserId } = require('../../src/config/database');
const ownerService = require('../../src/services/ownerService');

describe('ownerService', () => {
  let mockPrisma;

  const uidA = 'user-a-uid';
  const uidB = 'user-b-uid';
  const userIdA = 'postgres-id-a';
  const userIdB = 'postgres-id-b';
  const ownerId = 'owner-cuid-1';

  const mockOwner = {
    id: ownerId,
    uid: uidA,
    name: 'Owner A',
    userId: userIdA,
  };

  beforeEach(() => {
    mockPrisma = {
      owner: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    getPrisma.mockReturnValue(mockPrisma);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAllByUser', () => {
    test('returns owners scoped to user', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.owner.findMany.mockResolvedValue([mockOwner]);

      const result = await ownerService.findAllByUser(uidA);

      expect(mockPrisma.owner.findMany).toHaveBeenCalledWith({
        where: { userId: userIdA },
        orderBy: { createdAt: 'desc' },
      });
      expect(result.data).toEqual([mockOwner]);
    });
  });

  describe('findById — ownership isolation', () => {
    test('user A can see their own owner', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.owner.findFirst.mockResolvedValue(mockOwner);

      const result = await ownerService.findById(uidA, ownerId);
      expect(result.data).toEqual(mockOwner);
    });

    test('user B cannot see user A/ owner', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.owner.findFirst.mockResolvedValue(null);

      const result = await ownerService.findById(uidB, ownerId);
      expect(result.error).toBe('Owner not found');
      expect(result.status).toBe(404);
    });
  });

  describe('create', () => {
    test('creates owner with correct userId scope', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.owner.create.mockResolvedValue(mockOwner);

      const result = await ownerService.create(uidA, { name: 'Owner A' });

      expect(mockPrisma.owner.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          uid: uidA,
          name: 'Owner A',
          userId: userIdA,
        }),
      });
      expect(result.data).toEqual(mockOwner);
    });
  });

  describe('update — ownership isolation', () => {
    test('user A can update their own owner', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.owner.findFirst.mockResolvedValue(mockOwner);
      mockPrisma.owner.update.mockResolvedValue({ ...mockOwner, name: 'Updated' });

      const result = await ownerService.update(uidA, ownerId, { name: 'Updated' });
      expect(result.data.name).toBe('Updated');
    });

    test('user B cannot update user A/ owner', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.owner.findFirst.mockResolvedValue(null);

      const result = await ownerService.update(uidB, ownerId, { name: 'Hacked' });
      expect(result.error).toBe('Owner not found');
      expect(mockPrisma.owner.update).not.toHaveBeenCalled();
    });
  });

  describe('remove — ownership isolation', () => {
    test('user A can delete their own owner', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.owner.findFirst.mockResolvedValue(mockOwner);

      const result = await ownerService.remove(uidA, ownerId);
      expect(result.success).toBe(true);
      expect(mockPrisma.owner.delete).toHaveBeenCalledWith({ where: { id: ownerId } });
    });

    test('user B cannot delete user A/ owner', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.owner.findFirst.mockResolvedValue(null);

      const result = await ownerService.remove(uidB, ownerId);
      expect(result.error).toBe('Owner not found');
      expect(mockPrisma.owner.delete).not.toHaveBeenCalled();
    });
  });
});
