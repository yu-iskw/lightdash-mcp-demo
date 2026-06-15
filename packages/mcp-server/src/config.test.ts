import { describe, expect, it } from 'vitest';

import { loadConfig } from './config';

describe('loadConfig', () => {
  it('rejects missing LIGHTDASH_URL', () => {
    expect(() =>
      loadConfig({
        MCP_SERVER_PORT: '3100',
      }),
    ).toThrow();
  });

  it('strips trailing slash from LIGHTDASH_URL', () => {
    const config = loadConfig({
      LIGHTDASH_URL: 'https://app.lightdash.cloud/',
      MCP_SERVER_PORT: '3100',
    });

    expect(config.lightdashUrl).toBe('https://app.lightdash.cloud');
  });

  it('defaults MCP_SERVER_PORT to 3100', () => {
    const config = loadConfig({
      LIGHTDASH_URL: 'https://app.lightdash.cloud',
    });

    expect(config.MCP_SERVER_PORT).toBe(3100);
  });

  it('strips accidental /mcp suffix from MCP_PUBLIC_URL', () => {
    const config = loadConfig({
      LIGHTDASH_URL: 'https://app.lightdash.cloud',
      MCP_PUBLIC_URL: 'https://abc123.ngrok-free.app/mcp',
    });

    expect(config.MCP_PUBLIC_URL).toBe('https://abc123.ngrok-free.app');
  });
});
