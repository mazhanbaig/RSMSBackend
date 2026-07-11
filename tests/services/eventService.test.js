jest.mock('../../src/config/database', () => ({
  getPrisma: jest.fn(),
  resolveUserId: jest.fn(),
}));

const { getPrisma, resolveUserId } = require('../../src/config/database');
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
    title: 'Property Showing',
    startTime: new Date('2026-07-15T10:00:00Z'),
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
      },
    };
    getPrisma.mockReturnValue(mockPrisma);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAllByUser', () => {
    test('returns events scoped to user', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.event.findMany.mockResolvedValue([mockEvent]);

      const result = await eventService.findAllByUser(uidA);

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith({
        where: { userId: userIdA },
        orderBy: { startTime: 'desc' },
      });
      expect(result.data).toEqual([mockEvent]);
    });

    test('returns 404 when user not found', async () => {
      resolveUserId.mockResolvedValue(null);
      const result = await eventService.findAllByUser('unknown');
      expect(result.error).toBe('User not found');
      expect(result.status).toBe(404);
    });
  });

  describe('findById — ownership isolation', () => {
    test('user A can see their own event', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.event.findFirst.mockResolvedValue(mockEvent);

      const result = await eventService.findById(uidA, eventId);
      expect(result.data).toEqual(mockEvent);
    });

    test('user B cannot see user A/ event', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.event.findFirst.mockResolvedValue(null);

      const result = await eventService.findById(uidB, eventId);
      expect(result.error).toBe('Event not found');
      expect(result.status).toBe(404);
    });
  });

  describe('create', () => {
    test('creates event with correct userId scope', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.event.create.mockResolvedValue(mockEvent);

      const result = await eventService.create(uidA, { title: 'Property Showing', startTime: '2026-07-15T10:00:00Z' });

      expect(mockPrisma.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          uid: uidA,
          title: 'Property Showing',
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
      mockPrisma.event.update.mockResolvedValue({ ...mockEvent, title: 'Updated Showing' });

      const result = await eventService.update(uidA, eventId, { title: 'Updated Showing' });
      expect(result.data.title).toBe('Updated Showing');
    });

    test('user B cannot update user A/ event', async () => {
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

    test('user B cannot delete user A/ event', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.event.findFirst.mockResolvedValue(null);

      const result = await eventService.remove(uidB, eventId);
      expect(result.error).toBe('Event not found');
      expect(mockPrisma.event.delete).not.toHaveBeenCalled();
    });
  });
});
