import { describe, expect, it } from 'vitest';

import { apiGetAuthenticatedUserResponseSchema } from './lightdash-user';

describe('apiGetAuthenticatedUserResponseSchema', () => {
  it('parses a valid authenticated user response', () => {
    const payload = {
      status: 'ok' as const,
      results: {
        userUuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        firstName: 'Demo',
        lastName: 'User',
        email: 'demo@example.com',
        organizationUuid: 'ffffffff-1111-2222-3333-444444444444',
        organizationName: 'My Organization',
        role: 'admin',
        isActive: true,
        impersonation: null,
      },
    };

    expect(apiGetAuthenticatedUserResponseSchema.parse(payload)).toEqual(payload);
  });
});
