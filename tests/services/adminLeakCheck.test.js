/**
 * Explicit test: isSuperAdmin must NEVER appear in regular API responses.
 * This test proves that calling entity services as a super-admin user
 * does not leak the isSuperAdmin flag into the response data.
 */

jest.mock('../../src/config/database', () => ({
    getPrisma: jest.fn(),
    resolveUserId: jest.fn(),
}));

const { getPrisma, resolveUserId } = require('../../src/config/database');
const clientService = require('../../src/services/clientService');
const propertyService = require('../../src/services/propertyService');
const ownerService = require('../../src/services/ownerService');

describe('isSuperAdmin leak check', () => {
    let mockPrisma;

    const superAdminFirebaseUid = 'super-admin-firebase-uid';
    const superAdminPostgresId = 'super-admin-postgres-id';

    beforeEach(() => {
        mockPrisma = {
            client: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
            property: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
            owner: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
        };
        getPrisma.mockReturnValue(mockPrisma);
        resolveUserId.mockResolvedValue(superAdminPostgresId);
    });

    afterEach(() => jest.clearAllMocks());

    test('client list response does not contain isSuperAdmin', async () => {
        mockPrisma.client.findMany.mockResolvedValue([{ id: 'c1', name: 'Client 1', userId: superAdminPostgresId }]);
        const result = await clientService.findAllByUser(superAdminFirebaseUid);
        expect(result.data).toBeDefined();
        expect(Array.isArray(result.data)).toBe(true);
        // Explicitly verify the field does not exist anywhere in the response
        const serialized = JSON.stringify(result.data);
        expect(serialized).not.toContain('isSuperAdmin');
    });

    test('property list response does not contain isSuperAdmin', async () => {
        mockPrisma.property.findMany.mockResolvedValue([{ id: 'p1', title: 'Property 1', userId: superAdminPostgresId }]);
        const result = await propertyService.findAllByUser(superAdminFirebaseUid, {});
        const serialized = JSON.stringify(result.data);
        expect(serialized).not.toContain('isSuperAdmin');
    });

    test('owner list response does not contain isSuperAdmin', async () => {
        mockPrisma.owner.findMany.mockResolvedValue([{ id: 'o1', name: 'Owner 1', userId: superAdminPostgresId }]);
        const result = await ownerService.findAllByUser(superAdminFirebaseUid);
        const serialized = JSON.stringify(result.data);
        expect(serialized).not.toContain('isSuperAdmin');
    });

    test('single client response does not contain isSuperAdmin', async () => {
        mockPrisma.client.findFirst.mockResolvedValue({ id: 'c1', name: 'Client 1', userId: superAdminPostgresId });
        const result = await clientService.findById(superAdminFirebaseUid, 'c1');
        const serialized = JSON.stringify(result.data);
        expect(serialized).not.toContain('isSuperAdmin');
    });
});
