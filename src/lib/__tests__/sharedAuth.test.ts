import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
}));

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
    },
  },
}));

import { clearSharedUserId, getSharedUserId, syncSharedUserId } from '../sharedAuth';

describe('sharedAuth', () => {
  beforeEach(() => {
    clearSharedUserId();
    mocks.getUser.mockReset();
  });

  it('returns a synced user id without refetching auth', async () => {
    syncSharedUserId('user-2');

    await expect(getSharedUserId()).resolves.toBe('user-2');
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it('refetches auth after the cache is cleared', async () => {
    syncSharedUserId('user-1');
    clearSharedUserId();
    mocks.getUser.mockResolvedValue({
      data: {
        user: { id: 'user-3' },
      },
    });

    await expect(getSharedUserId()).resolves.toBe('user-3');
    expect(mocks.getUser).toHaveBeenCalledTimes(1);
  });
});
