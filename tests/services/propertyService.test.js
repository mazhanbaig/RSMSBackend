jest.mock('../../src/config/database', () => ({
  getPrisma: jest.fn(),
  resolveUserId: jest.fn(),
}));

const { getPrisma, resolveUserId } = require('../../src/config/database');
const propertyService = require('../../src/services/propertyService');

describe('propertyService', () => {
  let mockPrisma;

  const uidA = 'user-a-uid';
  const uidB = 'user-b-uid';
  const userIdA = 'postgres-id-a';
  const userIdB = 'postgres-id-b';
  const propertyId = 'property-cuid-1';

  const mockProperty = {
    id: propertyId,
    uid: uidA,
    title: 'Nice House',
    price: 500000,
    userId: userIdA,
  };

  beforeEach(() => {
    mockPrisma = {
      property: {
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
    test('returns properties scoped to user', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.property.findMany.mockResolvedValue([mockProperty]);

      const result = await propertyService.findAllByUser(uidA);

      expect(mockPrisma.property.findMany).toHaveBeenCalledWith({
        where: { userId: userIdA },
        orderBy: { createdAt: 'desc' },
      });
      expect(result.data).toEqual([mockProperty]);
    });
  });

  describe('findById — ownership isolation', () => {
    test('user A can see their own property', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.property.findFirst.mockResolvedValue(mockProperty);

      const result = await propertyService.findById(uidA, propertyId);
      expect(result.data).toEqual(mockProperty);
    });

    test('user B cannot see user A/ property', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.property.findFirst.mockResolvedValue(null);

      const result = await propertyService.findById(uidB, propertyId);
      expect(result.error).toBe('Property not found');
      expect(result.status).toBe(404);
    });
  });

  describe('create', () => {
    test('creates property with correct userId scope', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.property.create.mockResolvedValue(mockProperty);

      const result = await propertyService.create(uidA, { title: 'Nice House', price: 500000 });

      expect(mockPrisma.property.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          uid: uidA,
          title: 'Nice House',
          userId: userIdA,
        }),
      });
      expect(result.data).toEqual(mockProperty);
    });
  });

  describe('update — ownership isolation', () => {
    test('user A can update their own property', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.property.findFirst.mockResolvedValue(mockProperty);
      mockPrisma.property.update.mockResolvedValue({ ...mockProperty, title: 'Renovated' });

      const result = await propertyService.update(uidA, propertyId, { title: 'Renovated' });
      expect(result.data.title).toBe('Renovated');
    });

    test('user B cannot update user A/ property', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.property.findFirst.mockResolvedValue(null);

      const result = await propertyService.update(uidB, propertyId, { title: 'Hacked' });
      expect(result.error).toBe('Property not found');
      expect(mockPrisma.property.update).not.toHaveBeenCalled();
    });
  });

  describe('remove — ownership isolation', () => {
    test('user A can delete their own property', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.property.findFirst.mockResolvedValue(mockProperty);

      const result = await propertyService.remove(uidA, propertyId);
      expect(result.success).toBe(true);
      expect(mockPrisma.property.delete).toHaveBeenCalledWith({ where: { id: propertyId } });
    });

    test('user B cannot delete user A/ property', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.property.findFirst.mockResolvedValue(null);

      const result = await propertyService.remove(uidB, propertyId);
      expect(result.error).toBe('Property not found');
      expect(mockPrisma.property.delete).not.toHaveBeenCalled();
    });
  });
});
