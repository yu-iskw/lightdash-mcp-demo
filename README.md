# lightdash-mcp-demo

Minimal standalone [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that delegates authentication to **Lightdash OAuth Applications**. Each user connects with their own Lightdash access token (`ldapp_…`); the server forwards that token to Lightdash REST APIs so **CASL permissions stay on the Lightdash side**.

Primary tool: **`get_authenticated_user`** — proxies [GET /api/v1/user](https://docs.lightdash.com/api-reference/my-account/get-authenticated-user).

Design notes and phased plan: [`docs/rfc.md`](docs/rfc.md).

## Quick start

### Prerequisites

- [Node.js](https://nodejs.org/) (see [`.node-version`](.node-version))
- [pnpm](https://pnpm.io/) 11+
- A Lightdash Cloud (or staging) site with permission to create **OAuth Applications**
- [ngrok](https://ngrok.com/) (or similar HTTPS tunnel) for Cursor and other remote MCP clients

### Installation

```bash
pnpm install
cp .env.example .env.local
# Edit .env.local (see Environment variables)
pnpm dev
```

In another terminal, expose the server:

```bash
ngrok http 3100
```

Set `MCP_PUBLIC_URL` in `.env.local` to the ngrok HTTPS origin (no trailing slash), restart `pnpm dev`, then add the MCP server in Cursor (see [Cursor `mcp.json`](#cursor-mcpjson)).

### Verify locally (optional)

With a personal access token or OAuth access token in `.env.local`:

```bash
# LIGHTDASH_ACCESS_TOKEN=ldapp_...  (manual testing only)
./dev/call-mcp-tool.sh
```

## Environment variables

Copy [`.env.example`](.env.example) to `.env.local`. The server loads `.env.local` then `.env` (see [`packages/mcp-server/src/config.ts`](packages/mcp-server/src/config.ts)).

| Variable                        | Required                                 | Description                                                                                                                                                                       |
| ------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LIGHTDASH_URL`                 | Yes                                      | Lightdash server URL, e.g. `https://app.lightdash.cloud` (no trailing slash). Same as [Lightdash CLI](https://docs.lightdash.com/references/lightdash-cli#environment-variables). |
| `LIGHTDASH_OAUTH_CLIENT_ID`     | For OAuth registration docs / future use | OAuth application client ID from Lightdash Settings                                                                                                                               |
| `LIGHTDASH_OAUTH_CLIENT_SECRET` | For OAuth registration docs / future use | OAuth application secret (keep out of git)                                                                                                                                        |
| `MCP_SERVER_PORT`               | No (default `3100`)                      | Local HTTP port for the MCP server                                                                                                                                                |
| `MCP_PUBLIC_URL`                | Yes for Cursor + ngrok                   | Public HTTPS base URL clients use (ngrok URL without trailing slash)                                                                                                              |
| `LIGHTDASH_ACCESS_TOKEN`        | Manual tests only                        | Bearer token for [`dev/call-mcp-tool.sh`](dev/call-mcp-tool.sh); not used by the server in normal MCP flows                                                                       |

The demo server **does not persist tokens**. Tokens are supplied per request by the MCP client in the `Authorization` header.

## OAuth registration (Lightdash)

1. In Lightdash, open **Settings → Advanced → OAuth Applications** (or your instance’s equivalent).
2. Create an application, e.g. name `lightdash-mcp-demo-local`.
3. Add **redirect URIs** required by your MCP client. For Cursor OAuth flows, follow Cursor’s current MCP OAuth redirect documentation for your platform.
4. Copy **Client ID** and **Client Secret** into `.env.local` as `LIGHTDASH_OAUTH_CLIENT_ID` and `LIGHTDASH_OAUTH_CLIENT_SECRET`.
5. Request scopes at least **`read`** (needed for `GET /api/v1/user`). Lightdash also documents `write`, `mcp:read`, and `mcp:write`; REST authorization is enforced by CASL on the API, not only by scope strings.

Lightdash OAuth metadata (authorization server):

`GET {LIGHTDASH_URL}/api/v1/oauth/.well-known/oauth-authorization-server`

## ngrok workflow

1. Start the server: `pnpm dev` (listens on `MCP_SERVER_PORT`, default 3100).
2. Start a tunnel: `ngrok http 3100`.
3. Copy the **HTTPS** forwarding URL (e.g. `https://abc123.ngrok-free.app`).
4. Set `MCP_PUBLIC_URL=https://abc123.ngrok-free.app` in `.env.local` and restart `pnpm dev`.
5. Confirm metadata is reachable:

   ```bash
   curl -sS "$MCP_PUBLIC_URL/.well-known/oauth-protected-resource" | jq .
   ```

6. Configure Cursor with `"url": "$MCP_PUBLIC_URL/mcp"` (see below).

When ngrok restarts, update `MCP_PUBLIC_URL` and Cursor config if the subdomain changes.

## Cursor `mcp.json`

Add a **remote HTTP** MCP server pointing at your tunneled `/mcp` endpoint. Example (adjust paths and names for your Cursor version):

```json
{
  "mcpServers": {
    "lightdash-mcp-demo": {
      "url": "https://your-subdomain.ngrok-free.app/mcp"
    }
  }
}
```

On first use, Cursor should receive **401** with `WWW-Authenticate` and `resource_metadata`, fetch [RFC 9728](https://www.rfc-editor.org/rfc/rfc9728) protected-resource metadata from your server, then run OAuth against Lightdash as the authorization server.

User-scoped tokens must be sent as:

`Authorization: Bearer ldapp_…`

## HTTP routes

| Method | Path                                    | Auth            | Purpose                                                                |
| ------ | --------------------------------------- | --------------- | ---------------------------------------------------------------------- |
| `GET`  | `/health`                               | No              | Liveness probe (`{ "status": "ok" }`)                                  |
| `GET`  | `/.well-known/oauth-protected-resource` | No              | OAuth protected-resource metadata (RFC 9728)                           |
| `GET`  | `/mcp`                                  | —               | Returns **405** (Streamable HTTP uses POST)                            |
| `POST` | `/mcp`                                  | Bearer required | MCP Streamable HTTP (JSON-RPC); tools such as `get_authenticated_user` |

Missing or invalid bearer on `POST /mcp` returns **401** with:

`WWW-Authenticate: Bearer resource_metadata="<MCP_PUBLIC_URL>/.well-known/oauth-protected-resource"`

## Project structure

```text
lightdash-mcp-demo/
├── packages/
│   └── mcp-server/             # Express + MCP SDK demo server (@lightdash-mcp-demo/server)
│       └── src/
│           ├── index.ts        # HTTP app, /mcp transport, /health
│           ├── config.ts       # Env loading and validation
│           ├── lightdash/      # API client, OAuth metadata, user schemas
│           ├── mcp/            # MCP tool registration
│           └── middleware/     # Bearer token gate
├── dev/
│   └── call-mcp-tool.sh        # Local curl helper (manual token)
├── docs/
│   └── rfc.md                  # Architecture RFC
└── .env.example
```

## Development commands

| Command              | Description                                                   |
| -------------------- | ------------------------------------------------------------- |
| `pnpm install`       | Install workspace dependencies                                |
| `pnpm dev`           | Run MCP server with hot reload (`@lightdash-mcp-demo/server`) |
| `pnpm build`         | Compile the MCP server (`tsc`)                                |
| `pnpm test`          | Run Vitest across the workspace                               |
| `pnpm lint:eslint`   | ESLint                                                        |
| `pnpm format:eslint` | ESLint with `--fix`                                           |
| `pnpm lint`          | Trunk check (format, lint, security scanners)                 |
| `pnpm format`        | Trunk formatters                                              |

Production start (after build):

```bash
pnpm --filter @lightdash-mcp-demo/server start
```

## E2E checklist

Use this to validate the full OAuth + MCP + Lightdash chain:

- [ ] `.env.local` has `LIGHTDASH_URL` and `MCP_PUBLIC_URL` (ngrok HTTPS).
- [ ] OAuth application exists in Lightdash with correct redirect URIs.
- [ ] `pnpm dev` logs listening on the configured port.
- [ ] `curl -sS "$MCP_PUBLIC_URL/health"` returns `{"status":"ok"}`.
- [ ] `curl -sS "$MCP_PUBLIC_URL/.well-known/oauth-protected-resource"` lists Lightdash as `authorization_servers`.
- [ ] `POST /mcp` without `Authorization` returns **401** and `WWW-Authenticate` with `resource_metadata`.
- [ ] Cursor (or client) connects to `$MCP_PUBLIC_URL/mcp` and completes Lightdash OAuth when challenged.
- [ ] Tool **`get_authenticated_user`** returns JSON matching your Lightdash user (compare with `GET /api/v1/user` using the same token).
- [ ] A second user sees **their** profile, not a shared service account.
- [ ] `./dev/call-mcp-tool.sh` works when `LIGHTDASH_ACCESS_TOKEN` is set (optional smoke test).

## Security notes

- **No token storage** on the demo server; treat logs and error messages as sensitive.
- **Never commit** `.env.local`, client secrets, or `ldapp_` / PAT tokens.
- **`LIGHTDASH_OAUTH_CLIENT_SECRET`** is for OAuth app registration and client-side flows; this spike passes through user bearer tokens and does not embed a long-lived server identity for API calls.
- Use **HTTPS** in production (`MCP_PUBLIC_URL` must be HTTPS for real clients). ngrok is for local development only.
- Permissions are enforced by **Lightdash** when the token is forwarded; the MCP server must not add a parallel authorization layer that could widen access.
- Rotate OAuth client secrets and revoke compromised tokens in Lightdash if exposed.
- Run `pnpm lint:security` / Trunk security scanners before shipping changes.

## License

Licensed under the [Apache License, Version 2.0](LICENSE).
