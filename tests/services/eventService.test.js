jest.mock('../../src/config/database', () => ({
  getPrisma: jest.fn(),
  resolveUserId: jest.fn(),
  resolveUser: jest.fn(),
}));

const { getPrisma, resolveUserId, resolveUser } = require('../../src/config/database');
const eventService = require('../../src/services/eventService');

describe('eventService', () => {
  let mockPrisma;

  const uidA = 'user-a-uid';
  const uidB = 'user-b-uid';
  const userIdA = 'postgres-id-a';
  const userIdB = 'postgres-id-b';
  const eventId = 'event-cuid-1';

  const mockEvent = {
    id: eventId,
    uid: uidA,
    title: 'Open House',
    description: 'Property open event',
    startTime: new Date('2024-06-10T10:00:00Z'),
    userId: userIdA,
  };

  beforeEach(() => {
    mockPrisma = {
      event: {
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
    test('returns all events when no filters', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.event.findMany.mockResolvedValue([mockEvent]);
      mockPrisma.event.count.mockResolvedValue(1);

      const result = await eventService.findAllByUser(uidA, {});

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith({
        where: { userId: userIdA },
        skip: 0,
        take: 50,
        orderBy: { startTime: 'desc' },
      });
      expect(mockPrisma.event.count).toHaveBeenCalledWith({ where: { userId: userIdA } });
      expect(result.data).toEqual([mockEvent]);
      expect(result.total).toBe(1);
    });

    test('applies search filter to query', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.event.findMany.mockResolvedValue([mockEvent]);
      mockPrisma.event.count.mockResolvedValue(1);

      await eventService.findAllByUser(uidA, { search: 'Open House' });

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith({
        where: { userId: userIdA, OR: [
          { title: { contains: 'Open House', mode: 'insensitive' } },
          { description: { contains: 'Open House', mode: 'insensitive' } },
        ] },
        skip: 0,
        take: 50,
        orderBy: { startTime: 'desc' },
      });
    });

    test('returns error when user not found', async () => {
      resolveUserId.mockResolvedValue(null);
      const result = await eventService.findAllByUser('unknown', {});
      expect(result.error).toBe('User not found');
    });
  });

  describe('findById — ownership isolation', () => {
    test('user A can see their own event', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.event.findFirst.mockResolvedValue(mockEvent);

      const result = await eventService.findById(uidA, eventId);
      expect(result.data).toEqual(mockEvent);
    });

    test('user B cannot see user A event', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.event.findFirst.mockResolvedValue(null);

      const result = await eventService.findById(uidB, eventId);
      expect(result.error).toBe('Event not found');
      expect(result.status).toBe(404);
    });
  });

  describe('create', () => {
    test('creates event', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.event.create.mockResolvedValue(mockEvent);

      const input = {
        title: 'Open House',
        description: 'Property open event',
        startTime: '2024-06-10T10:00:00Z',
      };
      const result = await eventService.create(uidA, input);

      expect(mockPrisma.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          uid: uidA,
          orgId: uidA,
          title: 'Open House',
          description: 'Property open event',
          startTime: expect.any(Date),
          userId: userIdA,
        }),
      });
      expect(result.data).toEqual(mockEvent);
    });
  });

  describe('update — ownership isolation', () => {
    test('user A can update their own event', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.event.findFirst.mockResolvedValue(mockEvent);
      mockPrisma.event.update.mockResolvedValue({ ...mockEvent, title: 'Updated Title' });

      const result = await eventService.update(uidA, eventId, { title: 'Updated Title' });
      expect(result.data.title).toBe('Updated Title');
    });

    test('user B cannot update user A event', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.event.findFirst.mockResolvedValue(null);

      const result = await eventService.update(uidB, eventId, { title: 'Hacked' });
      expect(result.error).toBe('Event not found');
      expect(mockPrisma.event.update).not.toHaveBeenCalled();
    });
  });

  describe('remove — ownership isolation', () => {
    test('user A can delete their own event', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.event.findFirst.mockResolvedValue(mockEvent);

      const result = await eventService.remove(uidA, eventId);
      expect(result.success).toBe(true);
      expect(mockPrisma.event.delete).toHaveBeenCalledWith({ where: { id: eventId } });
    });

    test('user B cannot delete user A event', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.event.findFirst.mockResolvedValue(null);

      const result = await eventService.remove(uidB, eventId);
      expect(result.error).toBe('Event not found');
      expect(mockPrisma.event.delete).not.toHaveBeenCalled();
    });
  });
});