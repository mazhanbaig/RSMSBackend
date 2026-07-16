jest.mock('../../src/config/database', () => ({
  getPrisma: jest.fn(),
  resolveUserId: jest.fn(),
}));

const { getPrisma, resolveUserId } = require('../../src/config/database');
const taskService = require('../../src/services/taskService');

describe('taskService', () => {
  let mockPrisma;

  const uidA = 'user-a-uid';
  const uidB = 'user-b-uid';
  const userIdA = 'postgres-id-a';
  const userIdB = 'postgres-id-b';
  const taskId = 'task-cuid-1';

  const mockTask = {
    id: taskId,
    uid: uidA,
    title: 'Follow up with client',
    priority: 'high',
    completed: false,
    userId: userIdA,
  };

  beforeEach(() => {
    mockPrisma = {
      task: {
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
    test('returns tasks scoped to user', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.task.findMany.mockResolvedValue([mockTask]);

      const result = await taskService.findAllByUser(uidA);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: { userId: userIdA },
        orderBy: { createdAt: 'desc' },
      });
      expect(result.data).toEqual([mockTask]);
    });

    test('returns 404 when user not found', async () => {
      resolveUserId.mockResolvedValue(null);
      const result = await taskService.findAllByUser('unknown');
      expect(result.error).toBe('User not found');
      expect(result.status).toBe(404);
    });
  });

  describe('findById — ownership isolation', () => {
    test('user A can see their own task', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.task.findFirst.mockResolvedValue(mockTask);

      const result = await taskService.findById(uidA, taskId);
      expect(result.data).toEqual(mockTask);
    });

    test('user B cannot see user A/ task', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.task.findFirst.mockResolvedValue(null);

      const result = await taskService.findById(uidB, taskId);
      expect(result.error).toBe('Task not found');
      expect(result.status).toBe(404);
    });
  });

  describe('create', () => {
    test('creates task with correct userId scope and default priority', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.task.create.mockResolvedValue(mockTask);

      const result = await taskService.create(uidA, { title: 'Follow up' });

      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          uid: uidA,
          title: 'Follow up',
          userId: userIdA,
        }),
      });
      expect(result.data).toEqual(mockTask);
    });

    test('creates task with explicit priority', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.task.create.mockResolvedValue(mockTask);

      await taskService.create(uidA, { title: 'High priority task', priority: 'high' });

      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ priority: 'high' }),
      });
    });
  });

  describe('update — ownership isolation', () => {
    test('user A can update their own task', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.task.findFirst.mockResolvedValue(mockTask);
      mockPrisma.task.update.mockResolvedValue({ ...mockTask, completed: true });

      const result = await taskService.update(uidA, taskId, { completed: true });
      expect(result.data.completed).toBe(true);
    });

    test('user B cannot update user A/ task', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.task.findFirst.mockResolvedValue(null);

      const result = await taskService.update(uidB, taskId, { title: 'Hacked' });
      expect(result.error).toBe('Task not found');
      expect(mockPrisma.task.update).not.toHaveBeenCalled();
    });
  });

  describe('remove — ownership isolation', () => {
    test('user A can delete their own task', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.task.findFirst.mockResolvedValue(mockTask);

      const result = await taskService.remove(uidA, taskId);
      expect(result.success).toBe(true);
      expect(mockPrisma.task.delete).toHaveBeenCalledWith({ where: { id: taskId } });
    });

    test('user B cannot delete user A/ task', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.task.findFirst.mockResolvedValue(null);

      const result = await taskService.remove(uidB, taskId);
      expect(result.error).toBe('Task not found');
      expect(mockPrisma.task.delete).not.toHaveBeenCalled();
    });
  });
});
