import {
  apiGetAuthenticatedUserResponseSchema,
  type LightdashUser,
} from '@lightdash-mcp-demo/common';

export class LightdashAuthError extends Error {
  constructor(message = 'Lightdash rejected token (expired or revoked)') {
    super(message);
    this.name = 'LightdashAuthError';
  }
}

export class LightdashApiError extends Error {
  readonly status: number;

  constructor(status: number, message = `Lightdash API error: ${String(status)}`) {
    super(message);
    this.name = 'LightdashApiError';
    this.status = status;
  }
}

export class LightdashClient {
  constructor(
    private readonly siteUrl: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async getAuthenticatedUser(accessToken: string): Promise<LightdashUser> {
    const response = await this.fetchFn(`${this.siteUrl}/api/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 401) {
      throw new LightdashAuthError();
    }

    if (!response.ok) {
      throw new LightdashApiError(response.status);
    }

    const payload: unknown = await response.json();
    const parsed = apiGetAuthenticatedUserResponseSchema.safeParse(payload);

    if (!parsed.success) {
      throw new LightdashApiError(500, 'Invalid response from Lightdash API');
    }

    return parsed.data.results;
  }
}
