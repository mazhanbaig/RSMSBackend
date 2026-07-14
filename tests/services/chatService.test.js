jest.mock('../../src/config/database', () => ({
  getPrisma: jest.fn(),
  resolveUserId: jest.fn(),
}));

jest.mock('../../src/config/firebase', () => ({
  db: {
    ref: jest.fn(() => ({
      set: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));

const { getPrisma, resolveUserId } = require('../../src/config/database');
const { db } = require('../../src/config/firebase');
const chatService = require('../../src/services/chatService');

describe('chatService', () => {
  let mockPrisma;

  const uidA = 'user-a-uid';
  const uidB = 'user-b-uid';
  const userIdA = 'postgres-id-a';
  const userIdB = 'postgres-id-b';
  const token = 'share-token-1';
  const linkId = 'link-cuid-1';
  const visitorId = 'visitor-cuid-1';
  const threadId = 'thread-cuid-1';
  const propertyId = 'property-cuid-1';

  const mockLink = {
    id: linkId,
    token,
    propertyId,
    createdById: userIdA,
    active: true,
    viewCount: 5,
    createdAt: new Date(),
  };

  const mockVisitor = {
    id: visitorId,
    shareLinkId: linkId,
    name: 'John Doe',
    phone: '+923001234567',
    convertedToClientId: null,
    createdAt: new Date(),
  };

  const mockThread = {
    id: threadId,
    shareLinkId: linkId,
    visitorId,
    agentUserId: userIdA,
    status: 'active',
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = {
      propertyShareLink: {
        findFirst: jest.fn(),
      },
      propertyVisitor: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      chatThread: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      client: {
        create: jest.fn(),
      },
    };
    getPrisma.mockReturnValue(mockPrisma);
  });

  afterEach(() => jest.clearAllMocks());

  describe('startChat', () => {
    test('creates chat thread and initializes Firebase RTDB path', async () => {
      mockPrisma.propertyShareLink.findFirst.mockResolvedValue(mockLink);
      mockPrisma.propertyVisitor.findFirst.mockResolvedValue(mockVisitor);
      mockPrisma.chatThread.findUnique.mockResolvedValue(null);
      mockPrisma.chatThread.create.mockResolvedValue(mockThread);

      const result = await chatService.startChat(null, token, visitorId);

      expect(mockPrisma.propertyShareLink.findFirst).toHaveBeenCalledWith({
        where: { token, active: true },
      });
      expect(mockPrisma.propertyVisitor.findFirst).toHaveBeenCalledWith({
        where: { id: visitorId, shareLinkId: linkId },
      });
      expect(mockPrisma.chatThread.create).toHaveBeenCalledWith({
        data: {
          shareLinkId: linkId,
          visitorId,
          agentUserId: userIdA,
        },
      });
      expect(db.ref).toHaveBeenCalledWith(`propertyChats/${linkId}/${visitorId}/messages`);
      expect(result.data).toEqual(mockThread);
    });

    test('returns 404 for inactive share link', async () => {
      mockPrisma.propertyShareLink.findFirst.mockResolvedValue(null);

      const result = await chatService.startChat(null, token, visitorId);

      expect(result.error).toBe('Share link not found or inactive');
      expect(mockPrisma.chatThread.create).not.toHaveBeenCalled();
    });

    test('returns 404 when visitor does not belong to this share link', async () => {
      mockPrisma.propertyShareLink.findFirst.mockResolvedValue(mockLink);
      mockPrisma.propertyVisitor.findFirst.mockResolvedValue(null);

      const result = await chatService.startChat(null, token, visitorId);

      expect(result.error).toBe('Visitor not found');
      expect(mockPrisma.chatThread.create).not.toHaveBeenCalled();
    });

    test('a visitor can only start one chat (unique visitorId constraint)', async () => {
      mockPrisma.propertyShareLink.findFirst.mockResolvedValue(mockLink);
      mockPrisma.propertyVisitor.findFirst.mockResolvedValue(mockVisitor);
      mockPrisma.chatThread.findUnique.mockResolvedValue(mockThread);

      const result = await chatService.startChat(null, token, visitorId);

      expect(result.error).toBe('Chat thread already exists for this visitor');
      expect(result.status).toBe(409);
      expect(mockPrisma.chatThread.create).not.toHaveBeenCalled();
    });
  });

  describe('listThreads — ownership isolation', () => {
    test('owning agent can list their threads', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.chatThread.findMany.mockResolvedValue([
        {
          ...mockThread,
          shareLink: { property: { title: 'Nice House' } },
          visitor: { name: 'John Doe', phone: '+923001234567' },
        },
      ]);

      const result = await chatService.listThreads(uidA);

      expect(mockPrisma.chatThread.findMany).toHaveBeenCalledWith({
        where: { agentUserId: userIdA },
        include: {
          shareLink: {
            select: { property: { select: { title: true } } },
          },
          visitor: { select: { name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result.data).toHaveLength(1);
    });

    test('other agent sees no threads from other agents', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.chatThread.findMany.mockResolvedValue([]);

      const result = await chatService.listThreads(uidB);

      expect(mockPrisma.chatThread.findMany).toHaveBeenCalledWith({
        where: { agentUserId: userIdB },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(result.data).toEqual([]);
    });
  });

  describe('getThread — ownership isolation', () => {
    test('owning agent can view their thread', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.chatThread.findFirst.mockResolvedValue({
        ...mockThread,
        visitor: { name: 'John Doe', phone: '+923001234567', createdAt: new Date() },
        shareLink: {
          property: { title: 'Nice House', price: 500000, address: '123 St', city: 'Karachi' },
        },
      });

      const result = await chatService.getThread(uidA, threadId);

      expect(mockPrisma.chatThread.findFirst).toHaveBeenCalledWith({
        where: { id: threadId, agentUserId: userIdA },
        include: {
          visitor: { select: { name: true, phone: true, createdAt: true } },
          shareLink: {
            select: {
              property: { select: { title: true, price: true, address: true, city: true } },
            },
          },
        },
      });
      expect(result.data).toBeDefined();
    });

    test('other agent cannot view someone else thread', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.chatThread.findFirst.mockResolvedValue(null);

      const result = await chatService.getThread(uidB, threadId);

      expect(result.error).toBe('Chat thread not found');
      expect(result.status).toBe(404);
    });
  });

  describe('convertToClient', () => {
    const mockClient = {
      id: 'client-cuid-1',
      uid: uidA,
      name: 'John Doe',
      phone: '+923001234567',
      pipelineStage: 'lead',
    };

    test('pre-fills Client data from visitor and links back', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.chatThread.findFirst.mockResolvedValue({
        ...mockThread,
        visitor: mockVisitor,
        shareLink: {
          property: { id: propertyId, title: 'Nice House' },
        },
      });
      mockPrisma.client.create.mockResolvedValue(mockClient);
      mockPrisma.propertyVisitor.update.mockResolvedValue({
        ...mockVisitor,
        convertedToClientId: mockClient.id,
      });

      const result = await chatService.convertToClient(uidA, threadId);

      expect(mockPrisma.client.create).toHaveBeenCalledWith({
        data: {
          uid: uidA,
          orgId: uidA,
          name: 'John Doe',
          phone: '+923001234567',
          pipelineStage: 'lead',
        },
      });
      expect(mockPrisma.propertyVisitor.update).toHaveBeenCalledWith({
        where: { id: visitorId },
        data: { convertedToClientId: mockClient.id },
      });
      expect(result.data.client.name).toBe('John Doe');
      expect(result.data.client.pipelineStage).toBe('lead');
    });

    test('other agent cannot convert visitor from someone else thread', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.chatThread.findFirst.mockResolvedValue(null);

      const result = await chatService.convertToClient(uidB, threadId);

      expect(result.error).toBe('Chat thread not found');
      expect(mockPrisma.client.create).not.toHaveBeenCalled();
    });
  });
});
