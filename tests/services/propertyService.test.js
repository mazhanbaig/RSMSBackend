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
    city: 'Karachi',
    propertyType: 'house',
    bedrooms: 3,
    bathrooms: 2,
    featured: false,
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

  describe('buildPropertyFilters', () => {
    const { buildPropertyFilters } = propertyService;

    test('returns empty object for no params', () => {
      expect(buildPropertyFilters({})).toEqual({});
    });

    test('filters by minPrice and maxPrice', () => {
      const result = buildPropertyFilters({ minPrice: '100000', maxPrice: '500000' });
      expect(result.price).toEqual({ gte: 100000, lte: 500000 });
    });

    test('filters by city with case-insensitive contains', () => {
      const result = buildPropertyFilters({ city: 'karachi' });
      expect(result.city).toEqual({ contains: 'karachi', mode: 'insensitive' });
    });

    test('filters by propertyType, bedrooms, bathrooms', () => {
      const result = buildPropertyFilters({ propertyType: 'house', bedrooms: '3', bathrooms: '2' });
      expect(result.propertyType).toBe('house');
      expect(result.bedrooms).toBe(3);
      expect(result.bathrooms).toBe(2);
    });

    test('filters by status', () => {
      const result = buildPropertyFilters({ status: 'active' });
      expect(result.status).toBe('active');
    });

    test('filters by featured', () => {
      const result = buildPropertyFilters({ featured: 'true' });
      expect(result.featured).toBe(true);
    });
  });

  describe('findAllByUser', () => {
    test('returns all properties when no filters', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.property.findMany.mockResolvedValue([mockProperty]);

      const result = await propertyService.findAllByUser(uidA, {});

      expect(mockPrisma.property.findMany).toHaveBeenCalledWith({
        where: { userId: userIdA },
        orderBy: { createdAt: 'desc' },
      });
      expect(result.data).toEqual([mockProperty]);
    });

    test('applies city filter to query', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.property.findMany.mockResolvedValue([mockProperty]);

      await propertyService.findAllByUser(uidA, { city: 'Karachi' });

      expect(mockPrisma.property.findMany).toHaveBeenCalledWith({
        where: { userId: userIdA, city: { contains: 'Karachi', mode: 'insensitive' } },
        orderBy: { createdAt: 'desc' },
      });
    });

    test('returns error when user not found', async () => {
      resolveUserId.mockResolvedValue(null);
      const result = await propertyService.findAllByUser('unknown', {});
      expect(result.error).toBe('User not found');
    });

    test('applies featured filter', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.property.findMany.mockResolvedValue([{ ...mockProperty, featured: true }]);

      await propertyService.findAllByUser(uidA, { featured: 'true' });

      expect(mockPrisma.property.findMany).toHaveBeenCalledWith({
        where: { userId: userIdA, featured: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findById — ownership isolation', () => {
    test('user A can see their own property', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.property.findFirst.mockResolvedValue(mockProperty);

      const result = await propertyService.findById(uidA, propertyId);
      expect(result.data).toEqual(mockProperty);
    });

    test('user B cannot see user A property', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.property.findFirst.mockResolvedValue(null);

      const result = await propertyService.findById(uidB, propertyId);
      expect(result.error).toBe('Property not found');
      expect(result.status).toBe(404);
    });
  });

  describe('create', () => {
    test('creates property with all new fields', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.property.create.mockResolvedValue(mockProperty);

      const input = {
        title: 'Nice House',
        price: 500000,
        city: 'Karachi',
        propertyType: 'house',
        bedrooms: 3,
        bathrooms: 2,
      };
      const result = await propertyService.create(uidA, input);

      expect(mockPrisma.property.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          uid: uidA,
          title: 'Nice House',
          city: 'Karachi',
          propertyType: 'house',
          bedrooms: 3,
          bathrooms: 2,
          featured: false,
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
      mockPrisma.property.update.mockResolvedValue({ ...mockProperty, city: 'Lahore' });

      const result = await propertyService.update(uidA, propertyId, { city: 'Lahore' });
      expect(result.data.city).toBe('Lahore');
    });

    test('user B cannot update user A property', async () => {
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

    test('user B cannot delete user A property', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.property.findFirst.mockResolvedValue(null);

      const result = await propertyService.remove(uidB, propertyId);
      expect(result.error).toBe('Property not found');
      expect(mockPrisma.property.delete).not.toHaveBeenCalled();
    });
  });

  describe('toggleFeatured — ownership isolation', () => {
    test('toggles featured from false to true', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.property.findFirst.mockResolvedValue(mockProperty);
      mockPrisma.property.update.mockResolvedValue({ ...mockProperty, featured: true });

      const result = await propertyService.toggleFeatured(uidA, propertyId);
      expect(mockPrisma.property.update).toHaveBeenCalledWith({
        where: { id: propertyId },
        data: { featured: true },
      });
      expect(result.data.featured).toBe(true);
    });

    test('toggles featured from true to false', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.property.findFirst.mockResolvedValue({ ...mockProperty, featured: true });
      mockPrisma.property.update.mockResolvedValue({ ...mockProperty, featured: false });

      const result = await propertyService.toggleFeatured(uidA, propertyId);
      expect(mockPrisma.property.update).toHaveBeenCalledWith({
        where: { id: propertyId },
        data: { featured: false },
      });
      expect(result.data.featured).toBe(false);
    });

    test('user B cannot toggle user A property', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.property.findFirst.mockResolvedValue(null);

      const result = await propertyService.toggleFeatured(uidB, propertyId);
      expect(result.error).toBe('Property not found');
      expect(mockPrisma.property.update).not.toHaveBeenCalled();
    });
  });

  describe('updateCustomFields — ownership isolation', () => {
    test('updates customFields, merging with existing', async () => {
      const existingWithFields = { ...mockProperty, customFields: { lotSize: '5000 sqft', yearBuilt: 2010 } };
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.property.findFirst.mockResolvedValue(existingWithFields);
      mockPrisma.property.update.mockResolvedValue({ ...existingWithFields, customFields: { lotSize: '5000 sqft', yearBuilt: 2010, newField: 'value' } });

      const result = await propertyService.updateCustomFields(uidA, propertyId, { newField: 'value' });
      expect(mockPrisma.property.update).toHaveBeenCalledWith({
        where: { id: propertyId },
        data: { customFields: { lotSize: '5000 sqft', yearBuilt: 2010, newField: 'value' } },
      });
      expect(result.data.customFields.newField).toBe('value');
    });

    test('user B cannot update user A customFields', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.property.findFirst.mockResolvedValue(null);

      const result = await propertyService.updateCustomFields(uidB, propertyId, { test: 'hack' });
      expect(result.error).toBe('Property not found');
      expect(mockPrisma.property.update).not.toHaveBeenCalled();
    });
  });
});
