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

export type FetchFn = typeof fetch;

export class LightdashClient {
  constructor(
    private readonly siteUrl: string,
    private readonly fetchFn: FetchFn = fetch,
  ) {}

  async getAuthenticatedUser(accessToken: string): Promise<LightdashUser> {
    console.log('Fetching authenticated user from:', `${this.siteUrl}/api/v1/user`);
    const response = await this.fetchFn(`${this.siteUrl}/api/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log('Response status:', response.status, 'ok:', response.ok);

    if (response.status === 401) {
      throw new LightdashAuthError();
    }

    if (!response.ok) {
      throw new LightdashApiError(response.status);
    }

    const payload: unknown = await response.json();
    console.log('Parsed response:', payload);
    try {
      const parsed = apiGetAuthenticatedUserResponseSchema.parse(payload);
      console.log('Validation passed, returning user');
      return parsed.results;
    } catch (error) {
      console.error('Validation error:', error);
      throw new LightdashApiError(500, `Invalid response from Lightdash API: ${String(error)}`);
    }
  }
}
