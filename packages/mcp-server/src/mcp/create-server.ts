import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { LightdashApiError, LightdashAuthError } from '../lightdash/client';

import type { LightdashClient } from '../lightdash/client';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';

export function createMcpServer(lightdashClient: LightdashClient): McpServer {
  const server = new McpServer({
    name: 'lightdash-mcp-demo',
    version: '1.0.0',
  });

  server.registerTool(
    'get_authenticated_user',
    {
      title: 'Get authenticated user',
      description:
        'Returns the Lightdash profile for the OAuth-authenticated user who invoked this tool.',
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async (_args, extra: { authInfo?: AuthInfo }) => {
      try {
        const user = await lightdashClient.getAuthenticatedUser(extra.authInfo!.token);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(user, null, 2),
            },
          ],
        };
      } catch (error) {
        if (error instanceof LightdashAuthError || error instanceof LightdashApiError) {
          return {
            content: [{ type: 'text' as const, text: error.message }],
            isError: true,
          };
        }

        throw error;
      }
    },
  );

  return server;
}
