import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

const repoRoot = path.resolve(__dirname, '../../..');

loadDotenv({ path: path.join(repoRoot, '.env.local') });
loadDotenv({ path: path.join(repoRoot, '.env') });

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, '');
}

const configSchema = z
  .object({
    LIGHTDASH_URL: z.string().min(1, 'LIGHTDASH_URL is required'),
    LIGHTDASH_OAUTH_CLIENT_ID: z.string().optional(),
    LIGHTDASH_OAUTH_CLIENT_SECRET: z.string().optional(),
    MCP_SERVER_PORT: z.coerce.number().int().positive().default(3100),
    MCP_PUBLIC_URL: z
      .string()
      .optional()
      .transform((url) => {
        if (!url) {
          return undefined;
        }

        const normalized = normalizeUrl(url);
        return normalized.replace(/\/mcp$/i, '');
      }),
  })
  .transform((input) => ({
    lightdashUrl: normalizeUrl(input.LIGHTDASH_URL),
    LIGHTDASH_OAUTH_CLIENT_ID: input.LIGHTDASH_OAUTH_CLIENT_ID,
    LIGHTDASH_OAUTH_CLIENT_SECRET: input.LIGHTDASH_OAUTH_CLIENT_SECRET,
    MCP_SERVER_PORT: input.MCP_SERVER_PORT,
    MCP_PUBLIC_URL: input.MCP_PUBLIC_URL,
  }));

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return configSchema.parse({
    LIGHTDASH_URL: env.LIGHTDASH_URL,
    LIGHTDASH_OAUTH_CLIENT_ID: env.LIGHTDASH_OAUTH_CLIENT_ID,
    LIGHTDASH_OAUTH_CLIENT_SECRET: env.LIGHTDASH_OAUTH_CLIENT_SECRET,
    MCP_SERVER_PORT: env.MCP_SERVER_PORT,
    MCP_PUBLIC_URL: env.MCP_PUBLIC_URL,
  });
}
