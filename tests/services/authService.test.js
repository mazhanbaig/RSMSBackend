// Shared mock reference so db.ref() returns the same object with same .update spy
const mockUpdate = jest.fn().mockResolvedValue();
const mockRef = jest.fn(() => ({ update: mockUpdate }));

jest.mock('../../src/config/database', () => ({
  getPrisma: jest.fn(),
  resolveUserId: jest.fn(),
}));

jest.mock('../../src/config/firebase', () => ({
  db: {
    ref: mockRef,
  },
  auth: {
    revokeRefreshTokens: jest.fn().mockResolvedValue(),
  },
}));

const { getPrisma } = require('../../src/config/database');
const authService = require('../../src/services/authService');
const { db, auth } = require('../../src/config/firebase');

describe('authService.deleteUser', () => {
  let mockPrisma;

  const uid = 'test-user-uid';

  beforeEach(() => {
    mockUpdate.mockClear();
    mockRef.mockClear();

    mockPrisma = {
      user: {
        delete: jest.fn().mockResolvedValue({ id: 'user-id', uid }),
      },
      organization: {
        delete: jest.fn().mockResolvedValue({ id: uid }),
      },
    };
    getPrisma.mockReturnValue(mockPrisma);
  });

  afterEach(() => jest.clearAllMocks());

  test('deletes user from Postgres using delete() (triggers cascade)', async () => {
    await authService.deleteUser(uid);

    expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { uid } });
    expect(mockPrisma.organization.delete).toHaveBeenCalledWith({ where: { id: uid } });
  });

  test('cleans up Firebase RTDB paths', async () => {
    await authService.deleteUser(uid);

    // Should call db.ref() then .update() with all user paths set to null
    expect(mockRef).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalled();
    const updateCall = mockUpdate.mock.calls[0][0];
    expect(Object.keys(updateCall)).toContain(`users/${uid}`);
    expect(Object.keys(updateCall)).toContain(`clients/${uid}`);
    expect(Object.keys(updateCall)).toContain(`owners/${uid}`);
    expect(Object.keys(updateCall)).toContain(`properties/${uid}`);
    expect(Object.keys(updateCall)).toContain(`events/${uid}`);
    expect(Object.keys(updateCall)).toContain(`tasks/${uid}`);
    expect(Object.keys(updateCall)).toContain(`transactions/${uid}`);
    // All paths should be null (Firebase delete)
    Object.values(updateCall).forEach(v => expect(v).toBeNull());
  });

  test('revokes Firebase Auth tokens', async () => {
    await authService.deleteUser(uid);

    expect(auth.revokeRefreshTokens).toHaveBeenCalledWith(uid);
  });

  test('handles token revocation failure gracefully', async () => {
    auth.revokeRefreshTokens.mockRejectedValue(new Error('Token not found'));

    // Should not throw — error is caught and logged
    await expect(authService.deleteUser(uid)).resolves.not.toThrow();
  });
});
