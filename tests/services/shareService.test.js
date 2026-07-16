jest.mock('../../src/config/database', () => ({
  getPrisma: jest.fn(),
  resolveUserId: jest.fn(),
}));

const { getPrisma, resolveUserId } = require('../../src/config/database');
const shareService = require('../../src/services/shareService');

describe('shareService', () => {
  let mockPrisma;

  const uidA = 'user-a-uid';
  const uidB = 'user-b-uid';
  const userIdA = 'postgres-id-a';
  const userIdB = 'postgres-id-b';
  const propertyId = 'property-cuid-1';
  const linkId = 'link-cuid-1';
  const linkToken = 'token-cuid-1';

  const mockProperty = {
    id: propertyId,
    uid: uidA,
    title: 'Nice House',
    price: 500000,
    city: 'Karachi',
    propertyType: 'house',
    bedrooms: 3,
    bathrooms: 2,
    images: 'img1.jpg,img2.jpg',
    userId: userIdA,
  };

  const mockLink = {
    id: linkId,
    token: linkToken,
    propertyId,
    createdById: userIdA,
    active: true,
    viewCount: 0,
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = {
      property: {
        findFirst: jest.fn(),
      },
      propertyShareLink: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      propertyVisitor: {
        create: jest.fn(),
      },
    };
    getPrisma.mockReturnValue(mockPrisma);
    resolveUserId.mockResolvedValue(userIdA);
  });

  afterEach(() => jest.clearAllMocks());

  describe('createShareLink — ownership isolation', () => {
    test('owning agent can create a share link', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.property.findFirst.mockResolvedValue(mockProperty);
      mockPrisma.propertyShareLink.create.mockResolvedValue(mockLink);

      const result = await shareService.createShareLink(uidA, propertyId);

      expect(mockPrisma.property.findFirst).toHaveBeenCalledWith({
        where: { id: propertyId, userId: userIdA },
      });
      expect(mockPrisma.propertyShareLink.create).toHaveBeenCalledWith({
        data: { propertyId, createdById: userIdA, sharedWithName: null },
      });
      expect(result.data).toEqual(mockLink);
    });

    test('other agent cannot create a share link for someone else property', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.property.findFirst.mockResolvedValue(null);

      const result = await shareService.createShareLink(uidB, propertyId);

      expect(result.error).toBe('Property not found');
      expect(result.status).toBe(404);
      expect(mockPrisma.propertyShareLink.create).not.toHaveBeenCalled();
    });

    test('returns 404 when user not found', async () => {
      resolveUserId.mockResolvedValue(null);

      const result = await shareService.createShareLink('unknown', propertyId);

      expect(result.error).toBe('User not found');
    });
  });

  describe('deactivateShareLink — ownership isolation', () => {
    test('owning agent can deactivate their share link', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.propertyShareLink.findFirst.mockResolvedValue({
        ...mockLink,
        property: { userId: userIdA },
      });
      mockPrisma.propertyShareLink.update.mockResolvedValue({ ...mockLink, active: false });

      const result = await shareService.deactivateShareLink(uidA, linkId);

      expect(mockPrisma.propertyShareLink.update).toHaveBeenCalledWith({
        where: { id: linkId },
        data: { active: false },
      });
      expect(result.data.active).toBe(false);
    });

    test('other agent cannot deactivate someone else share link', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.propertyShareLink.findFirst.mockResolvedValue({
        ...mockLink,
        property: { userId: userIdA },
      });

      const result = await shareService.deactivateShareLink(uidB, linkId);

      expect(result.error).toBe('Share link not found');
      expect(mockPrisma.propertyShareLink.update).not.toHaveBeenCalled();
    });
  });

  describe('getShareLinkByToken', () => {
    test('returns property data without owner PII when link is active', async () => {
      mockPrisma.propertyShareLink.findFirst.mockResolvedValue({
        ...mockLink,
        property: {
          title: 'Nice House',
          price: 500000,
          address: '123 St',
          city: 'Karachi',
          propertyType: 'house',
          bedrooms: 3,
          bathrooms: 2,
          images: 'img1.jpg',
        },
      });
      mockPrisma.propertyShareLink.update.mockResolvedValue({ ...mockLink, viewCount: 1 });

      const result = await shareService.getShareLinkByToken(linkToken);

      expect(mockPrisma.propertyShareLink.findFirst).toHaveBeenCalledWith({
        where: { token: linkToken, active: true },
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
      expect(result.data.property).not.toHaveProperty('userId');
      expect(result.data.property).not.toHaveProperty('ownerId');
      expect(result.data.property).not.toHaveProperty('notes');
      expect(result.data).toBeDefined();
    });

    test('returns 404 for deactivated link', async () => {
      mockPrisma.propertyShareLink.findFirst.mockResolvedValue(null);

      const result = await shareService.getShareLinkByToken(linkToken);

      expect(result.error).toBe('Share link not found or inactive');
      expect(result.status).toBe(404);
    });

    test('increments viewCount', async () => {
      mockPrisma.propertyShareLink.findFirst.mockResolvedValue({
        ...mockLink,
        viewCount: 5,
        property: { title: 'Nice House' },
      });
      mockPrisma.propertyShareLink.update.mockResolvedValue({ ...mockLink, viewCount: 6 });

      const result = await shareService.getShareLinkByToken(linkToken);

      expect(mockPrisma.propertyShareLink.update).toHaveBeenCalledWith({
        where: { id: linkId },
        data: { viewCount: { increment: 1 } },
      });
      expect(result.data.viewCount).toBe(6);
    });
  });

  describe('registerVisitor', () => {
    test('creates visitor record tied to the correct share link', async () => {
      const visitorData = { name: 'John Doe', phone: '+923001234567' };
      const mockVisitor = {
        id: 'visitor-cuid-1',
        shareLinkId: linkId,
        name: 'John Doe',
        phone: '+923001234567',
        createdAt: new Date(),
      };

      mockPrisma.propertyShareLink.findFirst.mockResolvedValue(mockLink);
      mockPrisma.propertyVisitor.create.mockResolvedValue(mockVisitor);

      const result = await shareService.registerVisitor(linkToken, visitorData);

      expect(mockPrisma.propertyShareLink.findFirst).toHaveBeenCalledWith({
        where: { token: linkToken, active: true },
      });
      expect(mockPrisma.propertyVisitor.create).toHaveBeenCalledWith({
        data: {
          shareLinkId: linkId,
          name: 'John Doe',
          phone: '+923001234567',
        },
      });
      expect(result.data.name).toBe('John Doe');
      expect(result.data.phone).toBe('+923001234567');
    });

    test('returns 404 when share link is inactive', async () => {
      mockPrisma.propertyShareLink.findFirst.mockResolvedValue(null);

      const result = await shareService.registerVisitor(linkToken, { name: 'John', phone: '123' });

      expect(result.error).toBe('Share link not found or inactive');
      expect(mockPrisma.propertyVisitor.create).not.toHaveBeenCalled();
    });
  });

  describe('getShareLinksByProperty — ownership isolation', () => {
    test('owning agent can list links', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.property.findFirst.mockResolvedValue(mockProperty);
      mockPrisma.propertyShareLink.findMany.mockResolvedValue([
        { ...mockLink, _count: { visitors: 3 } },
      ]);

      const result = await shareService.getShareLinksByProperty(uidA, propertyId);

      expect(mockPrisma.propertyShareLink.findMany).toHaveBeenCalledWith({
        where: { propertyId },
        include: { _count: { select: { visitors: true } } },
        orderBy: { createdAt: 'desc' },
      });
      expect(result.data).toHaveLength(1);
    });

    test('other agent cannot list links', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.property.findFirst.mockResolvedValue(null);

      const result = await shareService.getShareLinksByProperty(uidB, propertyId);

      expect(result.error).toBe('Property not found');
      expect(mockPrisma.propertyShareLink.findMany).not.toHaveBeenCalled();
    });
  });
});
