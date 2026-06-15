import { describe, expect, it, vi } from 'vitest';

import { loadConfig } from '../config';

import {
  createRequireBearerMiddleware,
  type AuthenticatedRequest,
} from './require-bearer';

import type { NextFunction, Response } from 'express';

function createMockResponse(): Response & {
  statusCode?: number;
  body?: unknown;
  headers: Record<string, string>;
} {
  const res = {
    statusCode: undefined as number | undefined,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    set(name: string, value: string) {
      if (name === 'WWW-Authenticate') {
        this.headers['WWW-Authenticate'] = value;
      }
      return this;
    },
  };

  return res as Response & typeof res;
}

describe('createRequireBearerMiddleware', () => {
  const config = loadConfig({
    LIGHTDASH_URL: 'https://app.lightdash.cloud',
    MCP_PUBLIC_URL: 'https://abc123.ngrok-free.app',
    MCP_SERVER_PORT: '3100',
  });

  it('returns 401 with WWW-Authenticate when bearer token is missing', () => {
    const middleware = createRequireBearerMiddleware(config);
    const req = { headers: {} } as AuthenticatedRequest;
    const res = createMockResponse();
    const next = vi.fn() as NextFunction;

    middleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
    expect(res.headers['WWW-Authenticate']).toBe(
      'Bearer resource_metadata="https://abc123.ngrok-free.app/.well-known/oauth-protected-resource"',
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('sets req.auth when bearer token is present', () => {
    const middleware = createRequireBearerMiddleware(config);
    const req = {
      headers: { authorization: 'Bearer ldapp_test_token' },
    } as AuthenticatedRequest;
    const res = createMockResponse();
    const next = vi.fn() as NextFunction;

    middleware(req, res, next);

    expect(req.auth).toEqual({
      token: 'ldapp_test_token',
      clientId: 'lightdash-oauth-pass-through',
      scopes: ['read'],
    });
    expect(next).toHaveBeenCalledOnce();
  });
});
