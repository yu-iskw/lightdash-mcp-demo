import type { AppConfig } from '../config';

export type OAuthProtectedResourceMetadata = {
  resource: string;
  authorization_servers: string[];
  bearer_methods_supported: string[];
  scopes_supported: string[];
};

export function getPublicBaseUrl(config: AppConfig): string {
  return config.MCP_PUBLIC_URL ?? `http://localhost:${String(config.MCP_SERVER_PORT)}`;
}

export function buildOAuthProtectedResourceMetadata(
  config: AppConfig,
): OAuthProtectedResourceMetadata {
  const publicUrl = getPublicBaseUrl(config);

  return {
    resource: `${publicUrl}/mcp`,
    authorization_servers: [config.lightdashUrl],
    bearer_methods_supported: ['header'],
    scopes_supported: ['read', 'write', 'mcp:read', 'mcp:write'],
  };
}

export function getProtectedResourceMetadataUrl(config: AppConfig): string {
  return `${getPublicBaseUrl(config)}/.well-known/oauth-protected-resource`;
}
