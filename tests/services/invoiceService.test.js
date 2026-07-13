const { getPrisma, resolveUserId } = require('../../src/config/database');

jest.mock('../../src/config/database', () => ({
  getPrisma: jest.fn(),
  resolveUserId: jest.fn(),
}));

const invoiceService = require('../../src/services/invoiceService');

describe('invoiceService', () => {
  let mockPrisma;

  const uidA = 'user-a-uid';
  const uidB = 'user-b-uid';
  const userIdA = 'postgres-id-a';
  const userIdB = 'postgres-id-b';
  const invoiceId = 'invoice-cuid-1';

  const mockInvoice = {
    id: invoiceId,
    invoiceNo: 'INV-1700000000000',
    title: 'Commission Payment',
    amount: 500000,
    commission: 25000,
    tax: 0,
    total: 525000,
    status: 'draft',
    dueDate: null,
    paidAt: null,
    notes: null,
    clientId: null,
    propertyId: null,
    userId: userIdA,
  };

  const mockInvoiceB = {
    id: 'invoice-cuid-2',
    invoiceNo: 'INV-1700000000001',
    title: 'Bob Invoice',
    amount: 100000,
    commission: 5000,
    tax: 0,
    total: 105000,
    status: 'sent',
    userId: userIdB,
  };

  beforeEach(() => {
    mockPrisma = {
      invoice: {
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

  describe('findAllByUser', () => {
    test('returns invoices for valid user', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.invoice.findMany.mockResolvedValue([mockInvoice]);

      const result = await invoiceService.findAllByUser(uidA);

      expect(resolveUserId).toHaveBeenCalledWith(uidA);
      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith({
        where: { userId: userIdA },
        orderBy: { createdAt: 'desc' },
      });
      expect(result.data).toEqual([mockInvoice]);
    });

    test('filters by status when provided', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.invoice.findMany.mockResolvedValue([mockInvoice]);

      await invoiceService.findAllByUser(uidA, { status: 'draft' });

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith({
        where: { userId: userIdA, status: 'draft' },
        orderBy: { createdAt: 'desc' },
      });
    });

    test('returns 404 error when user not found', async () => {
      resolveUserId.mockResolvedValue(null);

      const result = await invoiceService.findAllByUser('unknown-uid');

      expect(result.error).toBe('User not found');
      expect(result.status).toBe(404);
    });
  });

  describe('findById', () => {
    test('returns invoice when owned by user', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.invoice.findFirst.mockResolvedValue(mockInvoice);

      const result = await invoiceService.findById(uidA, invoiceId);

      expect(mockPrisma.invoice.findFirst).toHaveBeenCalledWith({
        where: { id: invoiceId, userId: userIdA },
      });
      expect(result.data).toEqual(mockInvoice);
    });

    test('returns 404 when invoice belongs to different user', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.invoice.findFirst.mockResolvedValue(null);

      const result = await invoiceService.findById(uidB, invoiceId);

      expect(result.error).toBe('Invoice not found');
      expect(result.status).toBe(404);
    });
  });

  describe('create', () => {
    test('creates invoice with calculated total', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.invoice.create.mockResolvedValue(mockInvoice);

      const result = await invoiceService.create(uidA, {
        title: 'Commission Payment',
        amount: 500000,
        commission: 25000,
      });

      expect(mockPrisma.invoice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Commission Payment',
          amount: 500000,
          commission: 25000,
          tax: 0,
          total: 525000,
          status: 'draft',
          userId: userIdA,
        }),
      });
      expect(result.data).toEqual(mockInvoice);
    });

    test('returns 404 when creating for unknown user', async () => {
      resolveUserId.mockResolvedValue(null);

      const result = await invoiceService.create('unknown', { title: 'Test' });

      expect(result.error).toBe('User not found');
      expect(result.status).toBe(404);
    });
  });

  describe('update', () => {
    test('updates invoice and recalculates total', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      mockPrisma.invoice.update.mockResolvedValue({ ...mockInvoice, amount: 600000, total: 625000 });

      const result = await invoiceService.update(uidA, invoiceId, { amount: 600000 });

      expect(mockPrisma.invoice.update).toHaveBeenCalledWith({
        where: { id: invoiceId },
        data: expect.objectContaining({ amount: 600000, total: 625000 }),
      });
      expect(result.data.amount).toBe(600000);
    });

    test('returns 404 when updating another user invoice', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.invoice.findFirst.mockResolvedValue(null);

      const result = await invoiceService.update(uidB, invoiceId, { title: 'Hacked' });

      expect(result.error).toBe('Invoice not found');
      expect(result.status).toBe(404);
    });
  });

  describe('remove', () => {
    test('deletes invoice when owned by user', async () => {
      resolveUserId.mockResolvedValue(userIdA);
      mockPrisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      mockPrisma.invoice.delete.mockResolvedValue(mockInvoice);

      const result = await invoiceService.remove(uidA, invoiceId);

      expect(mockPrisma.invoice.delete).toHaveBeenCalledWith({
        where: { id: invoiceId },
      });
      expect(result.success).toBe(true);
    });

    test('returns 404 when deleting another user invoice', async () => {
      resolveUserId.mockResolvedValue(userIdB);
      mockPrisma.invoice.findFirst.mockResolvedValue(null);

      const result = await invoiceService.remove(uidB, invoiceId);

      expect(result.error).toBe('Invoice not found');
      expect(result.status).toBe(404);
    });
  });
});
