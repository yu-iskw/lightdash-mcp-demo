import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express, { json } from 'express';
import { rateLimit } from 'express-rate-limit';

import { loadConfig } from './config';
import { LightdashClient } from './lightdash/client';
import { buildOAuthProtectedResourceMetadata } from './lightdash/oauth-metadata';
import { createMcpServer } from './mcp/create-server';
import { createRequireBearerMiddleware } from './middleware/require-bearer';

function main(): void {
  const config = loadConfig();
  const app = express();
  const lightdashClient = new LightdashClient(config.lightdashUrl);
  const requireBearer = createRequireBearerMiddleware(config);
  const apiRateLimiter = rateLimit({
    windowMs: 60_000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(apiRateLimiter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/.well-known/oauth-protected-resource', (_req, res) => {
    res.json(buildOAuthProtectedResourceMetadata(config));
  });

  app.get('/mcp', (_req, res) => {
    res.status(405).json({ error: 'Method not allowed' });
  });

  app.post('/mcp', json(), requireBearer, async (req, res) => {
    const mcpServer = createMcpServer(lightdashClient);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.once('close', () => {
      void transport.close();
      void mcpServer.close();
    });

    try {
      await mcpServer.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  });

  app.listen(config.MCP_SERVER_PORT, () => {
    console.log(`lightdash-mcp-demo listening on port ${String(config.MCP_SERVER_PORT)}`);
  });
}

try {
  main();
} catch (error: unknown) {
  console.error(error);
  process.exit(1);
}
