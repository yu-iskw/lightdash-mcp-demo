import { describe, expect, it, vi } from 'vitest';

import { LightdashApiError, LightdashAuthError, LightdashClient } from './client';

describe('LightdashClient', () => {
  it('sends Authorization Bearer header', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          status: 'ok',
          results: {
            userUuid: 'user-1',
            firstName: 'Demo',
            lastName: 'User',
            email: 'demo@example.com',
            organizationUuid: 'org-1',
            organizationName: 'Org',
            role: 'admin',
            isActive: true,
            impersonation: null,
          },
        }),
    });

    const client = new LightdashClient('https://app.lightdash.cloud', fetchFn);
    const user = await client.getAuthenticatedUser('ldapp_test');

    expect(fetchFn).toHaveBeenCalledWith('https://app.lightdash.cloud/api/v1/user', {
      headers: { Authorization: 'Bearer ldapp_test' },
    });
    expect(user.email).toBe('demo@example.com');
  });

  it('throws LightdashAuthError on 401', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ status: 'error' }),
    });

    const client = new LightdashClient('https://app.lightdash.cloud', fetchFn);

    await expect(client.getAuthenticatedUser('bad-token')).rejects.toBeInstanceOf(
      LightdashAuthError,
    );
  });

  it('throws LightdashApiError on other non-2xx responses', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ status: 'error' }),
    });

    const client = new LightdashClient('https://app.lightdash.cloud', fetchFn);

    await expect(client.getAuthenticatedUser('token')).rejects.toBeInstanceOf(LightdashApiError);
  });
});
