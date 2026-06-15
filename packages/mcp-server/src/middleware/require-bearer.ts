import { getProtectedResourceMetadataUrl } from '../lightdash/oauth-metadata';

import type { AppConfig } from '../config';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { NextFunction, Request, Response } from 'express';


export type AuthenticatedRequest = Request & { auth?: AuthInfo };

function extractBearerToken(authorizationHeader: string | undefined): string | undefined {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return undefined;
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();
  return token.length > 0 ? token : undefined;
}

export function createRequireBearerMiddleware(config: AppConfig) {
  const resourceMetadataUrl = getProtectedResourceMetadataUrl(config);

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      res.set(
        'WWW-Authenticate',
        `Bearer resource_metadata="${resourceMetadataUrl}"`,
      );
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    req.auth = {
      token,
      clientId: 'lightdash-oauth-pass-through',
      scopes: ['read'],
    };
    next();
  };
}
