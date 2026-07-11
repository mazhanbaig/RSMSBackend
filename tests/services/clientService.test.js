const { getPrisma, resolveUserId } = require('../../src/config/database');

// Mock database module
jest.mock('../../src/config/database', () => ({
  getPrisma: jest.fn(),
  resolveUserId: jest.fn(),
}));

const clientService = require('../../src/services/clientService');

describe('clientService', () => {
  let mockPrisma;

  const uidA = 'user-a-uid';
  const uidB = 'user-b-uid';
  const userIdA = 'postgres-id-a';
  const userIdB = 'postgres-id-b';
  const clientId = 'client-cuid-1';

  const mockClient = {
    id: clientId,
    uid: uidA,
    orgId: uidA,
    name: 'Alice',
    email: 'alice@example.com',
    phone: '1234567890',
    userId: userIdA,
  };

  const mockClientB = {
    id: 'client-cuid-2',
    uid: uidB,
    orgId: uidB,
    name: 'Bob',
    email: 'bob@example.com',
    userId: userIdB,
  };

  beforeEach(() => {
    mockPrisma = {
      client: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    getPrisma.mockReturnValue(mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── findAllByUser ─────────────────────────────────────────────

  describe('findAllByUser', () => {
    test('returns clients for valid user', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.client.findMany.mockResolvedValue([mockClient]);

      const result = await clientService.findAllByUser(uidA);

      expect(resolveUserId).toHaveBeenCalledWith(uidA);
      expect(mockPrisma.client.findMany).toHaveBeenCalledWith({
        where: { userId: userIdA },
        orderBy: { createdAt: 'desc' },
      });
      expect(result.data).toEqual([mockClient]);
    });

    test('returns 404 error when user not found', async () => {
      resolveUserId.mockResolvedValue(null);

      const result = await clientService.findAllByUser('unknown-uid');

      expect(result.error).toBe('User not found');
      expect(result.status).toBe(404);
      expect(mockPrisma.client.findMany).not.toHaveBeenCalled();
    });
  });

  // ─── findById ─────────────────────────────────────────────────

  describe('findById', () => {
    test('returns client when owned by user', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.client.findFirst.mockResolvedValue(mockClient);

      const result = await clientService.findById(uidA, clientId);

      expect(mockPrisma.client.findFirst).toHaveBeenCalledWith({
        where: { id: clientId, userId: userIdA },
      });
      expect(result.data).toEqual(mockClient);
    });

    test('returns 404 when client belongs to different user', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.client.findFirst.mockResolvedValue(null); // User B cannot see User A's client

      const result = await clientService.findById(uidB, clientId);

      expect(result.error).toBe('Client not found');
      expect(result.status).toBe(404);
    });
  });

  // ─── create ───────────────────────────────────────────────────

  describe('create', () => {
    test('creates client for valid user', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.client.create.mockResolvedValue(mockClient);

      const result = await clientService.create(uidA, { name: 'Alice' });

      expect(mockPrisma.client.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          uid: uidA,
          orgId: uidA,
          name: 'Alice',
          userId: userIdA,
        }),
      });
      expect(result.data).toEqual(mockClient);
    });

    test('returns 404 when creating for unknown user', async () => {
      resolveUserId.mockResolvedValue(null);

      const result = await clientService.create('unknown', { name: 'Ghost' });

      expect(result.error).toBe('User not found');
      expect(result.status).toBe(404);
    });
  });

  // ─── update ───────────────────────────────────────────────────

  describe('update', () => {
    test('updates client when owned by user', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.client.findFirst.mockResolvedValue(mockClient);
      mockPrisma.client.update.mockResolvedValue({ ...mockClient, name: 'Alice Updated' });

      const result = await clientService.update(uidA, clientId, { name: 'Alice Updated' });

      expect(mockPrisma.client.update).toHaveBeenCalledWith({
        where: { id: clientId },
        data: expect.objectContaining({ name: 'Alice Updated' }),
      });
      expect(result.data.name).toBe('Alice Updated');
    });

    test('returns 404 when updating another user/ client', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.client.findFirst.mockResolvedValue(null); // User B cannot find User A's client

      const result = await clientService.update(uidB, clientId, { name: 'Hacked' });

      expect(result.error).toBe('Client not found');
      expect(result.status).toBe(404);
      expect(mockPrisma.client.update).not.toHaveBeenCalled();
    });
  });

  // ─── remove ───────────────────────────────────────────────────

  describe('remove', () => {
    test('deletes client when owned by user', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.client.findFirst.mockResolvedValue(mockClient);
      mockPrisma.client.delete.mockResolvedValue(mockClient);

      const result = await clientService.remove(uidA, clientId);

      expect(mockPrisma.client.delete).toHaveBeenCalledWith({
        where: { id: clientId },
      });
      expect(result.success).toBe(true);
    });

    test('returns 404 when deleting another user/ client', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.client.findFirst.mockResolvedValue(null);

      const result = await clientService.remove(uidB, clientId);

      expect(result.error).toBe('Client not found');
      expect(result.status).toBe(404);
      expect(mockPrisma.client.delete).not.toHaveBeenCalled();
    });
  });
});
