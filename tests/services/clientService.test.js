jest.mock('../../src/config/database', () => ({
  getPrisma: jest.fn(),
  resolveUserId: jest.fn(),
}));

const { getPrisma, resolveUserId } = require('../../src/config/database');
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
    name: 'John Doe',
    email: 'john@example.com',
    phone: '123-456-7890',
    budgetMin: 100000,
    budgetMax: 500000,
    preferences: null,
    notes: null,
    status: 'active',
    pipelineStage: 'prospect',
    userId: userIdA,
  };

  beforeEach(() => {
    mockPrisma = {
      client: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };
    getPrisma.mockReturnValue(mockPrisma);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAllByUser', () => {
    test('returns all clients when no filters', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.client.findMany.mockResolvedValue([mockClient]);
      mockPrisma.client.count.mockResolvedValue(1);

      const result = await clientService.findAllByUser(uidA, {});

      expect(mockPrisma.client.findMany).toHaveBeenCalledWith({
        where: { userId: userIdA },
        orderBy: { createdAt: 'desc' },
      });
      expect(mockPrisma.client.count).toHaveBeenCalledWith({ where: { userId: userIdA } });
      expect(result.data).toEqual([mockClient]);
      expect(result.total).toBe(1);
    });

    test('applies search filter to query', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.client.findMany.mockResolvedValue([mockClient]);
      mockPrisma.client.count.mockResolvedValue(1);

      await clientService.findAllByUser(uidA, { search: 'John' });

      expect(mockPrisma.client.findMany).toHaveBeenCalledWith({
        where: { userId: userIdA, OR: [
          { name: { contains: 'John', mode: 'insensitive' } },
          { email: { contains: 'John', mode: 'insensitive' } },
          { phone: { contains: 'John', mode: 'insensitive' } },
        ] },
        orderBy: { createdAt: 'desc' },
      });
    });

    test('returns error when user not found', async () => {
      resolveUserId.mockResolvedValue(null);
      const result = await clientService.findAllByUser('unknown', {});
      expect(result.error).toBe('User not found');
    });

    test('applies status filter', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.client.findMany.mockResolvedValue([{ ...mockClient, status: 'prospect' }]);
      mockPrisma.client.count.mockResolvedValue(1);

      await clientService.findAllByUser(uidA, { status: 'prospect' });

      expect(mockPrisma.client.findMany).toHaveBeenCalledWith({
        where: { userId: userIdA, status: 'prospect' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findById — ownership isolation', () => {
    test('user A can see their own client', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.client.findFirst.mockResolvedValue(mockClient);

      const result = await clientService.findById(uidA, clientId);
      expect(result.data).toEqual(mockClient);
    });

    test('user B cannot see user A client', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.client.findFirst.mockResolvedValue(null);

      const result = await clientService.findById(uidB, clientId);
      expect(result.error).toBe('Client not found');
      expect(result.status).toBe(404);
    });
  });

  describe('create', () => {
    test('creates client with all new fields', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.client.create.mockResolvedValue(mockClient);

      const input = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        budgetMin: 100000,
        budgetMax: 500000,
        preferences: 'PrefA',
        notes: 'NotesA',
        status: 'active',
        pipelineStage: 'prospect',
      };
      const result = await clientService.create(uidA, input);

      expect(mockPrisma.client.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          uid: uidA,
          orgId: uidA,
          name: 'John Doe',
          email: 'john@example.com',
          phone: '123-456-7890',
          budgetMin: 100000,
          budgetMax: 500000,
          preferences: 'PrefA',
          notes: 'NotesA',
          status: 'active',
          pipelineStage: 'prospect',
          userId: userIdA,
        }),
      });
      expect(result.data).toEqual(mockClient);
    });
  });

  describe('update — ownership isolation', () => {
    test('user A can update their own client', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.client.findFirst.mockResolvedValue(mockClient);
      mockPrisma.client.update.mockResolvedValue({ ...mockClient, pipelineStage: 'qualified' });

      const result = await clientService.update(uidA, clientId, { pipelineStage: 'qualified' });
      expect(result.data.pipelineStage).toBe('qualified');
    });

    test('user B cannot update user A client', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.client.findFirst.mockResolvedValue(null);

      const result = await clientService.update(uidB, clientId, { name: 'Hacked' });
      expect(result.error).toBe('Client not found');
      expect(mockPrisma.client.update).not.toHaveBeenCalled();
    });
  });

  describe('updatePipelineStage — ownership isolation', () => {
    test('updates pipeline stage for own client', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.client.findFirst.mockResolvedValue(mockClient);
      mockPrisma.client.update.mockResolvedValue({ ...mockClient, pipelineStage: 'qualified' });

      const result = await clientService.updatePipelineStage(uidA, clientId, 'qualified');
      expect(mockPrisma.client.update).toHaveBeenCalledWith({
        where: { id: clientId },
        data: { pipelineStage: 'qualified' },
      });
      expect(result.data.pipelineStage).toBe('qualified');
    });

    test('user B cannot update user A pipeline stage', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.client.findFirst.mockResolvedValue(null);

      const result = await clientService.updatePipelineStage(uidB, clientId, 'qualified');
      expect(result.error).toBe('Client not found');
      expect(mockPrisma.client.update).not.toHaveBeenCalled();
    });
  });

  describe('remove — ownership isolation', () => {
    test('user A can delete their own client', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.client.findFirst.mockResolvedValue(mockClient);

      const result = await clientService.remove(uidA, clientId);
      expect(result.success).toBe(true);
      expect(mockPrisma.client.delete).toHaveBeenCalledWith({ where: { id: clientId } });
    });

    test('user B cannot delete user A client', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.client.findFirst.mockResolvedValue(null);

      const result = await clientService.remove(uidB, clientId);
      expect(result.error).toBe('Client not found');
      expect(mockPrisma.client.delete).not.toHaveBeenCalled();
    });
  });
});