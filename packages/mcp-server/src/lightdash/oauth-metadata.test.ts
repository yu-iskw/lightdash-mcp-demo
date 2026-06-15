import { describe, expect, it } from 'vitest';

import { loadConfig } from '../config';

import {
  buildOAuthProtectedResourceMetadata,
  getProtectedResourceMetadataUrl,
} from './oauth-metadata';

describe('oauth metadata', () => {
  const config = loadConfig({
    LIGHTDASH_URL: 'https://app.lightdash.cloud',
    MCP_PUBLIC_URL: 'https://abc123.ngrok-free.app',
    MCP_SERVER_PORT: '3100',
  });

  it('lists Lightdash as the authorization server', () => {
    const metadata = buildOAuthProtectedResourceMetadata(config);

    expect(metadata.authorization_servers[0]).toBe('https://app.lightdash.cloud');
    expect(metadata.resource).toBe('https://abc123.ngrok-free.app/mcp');
  });

  it('builds protected resource metadata URL', () => {
    expect(getProtectedResourceMetadataUrl(config)).toBe(
      'https://abc123.ngrok-free.app/.well-known/oauth-protected-resource',
    );
  });
});
