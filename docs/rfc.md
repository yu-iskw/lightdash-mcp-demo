# RFC: Minimal Lightdash OAuth MCP Demo

**Status:** Draft (experimental spike)
**Author:** yu-iskw
**Implementation repo:** `yu-iskw/lightdash-mcp-demo` (this repository)
**Target Lightdash:** Hosted Cloud / staging
**Lightdash reference:** [lightdash/lightdash](https://github.com/lightdash/lightdash)

This document specifies a minimal standalone MCP server in TypeScript that delegates authentication to Lightdash via **OAuth Applications**, exposes one custom tool (`get_authenticated_user`), and is reachable from MCP clients through **ngrok** during local development. **No implementation code is included here** � this RFC is the blueprint for the demo repository.

---

## 1. Intent & Issue Analysis

### Stated Problem (X)

Build a minimal standalone MCP server outside the Lightdash monorepo to try the **OAuth-delegation** approach: register an OAuth application in Lightdash, run a custom MCP server locally, tunnel it with ngrok, and call Lightdash APIs as the authenticated us.

### Underlying Intent (Y)

Prove that custom MCP tools can run with **each user's Lightdash permissions** without implementing a parallel permission system. The demo should validate the end-to-end chain:

1. User authenticates to Lightdash (OAuth).
2. MCP client holds a user-scoped bearer token (`ldapp_�`).
3. Custom MCP tool forwards that token to Lightdash REST API.
4. Lightdash enforces **CASL** (roles, project access) on the API � same as the web app.

### XY Problem Check

OAuth Applications in Lightdash Settings are **necessary but not sufficient**. Registering an app only creates an OAuth client (`client_id` / `client_secret` + redirect URIs). It does not:

- Host custom MCP tools.
- Automatically wire tools into Lightdash AI agents.
- Replaermission checks.

The custom MCP server must act as a **token pass-through proxy**: it receives the user's Lightdash OAuth bearer token from the MCP client and forwards it on every downstream API call. Permissions remain entirely on the Lightdash side.

### Success Criteria

| Criterion                               | Validation                                                                                |
| --------------------------------------- | ----------------------------------------------------------------------------------------- |
| MCP client connects via ngrok HTTPS URL | Cursor (or similar) lists `lightdash-mcp-demo` server and completes OAuth when challenged |
| Tool returns real user profile          | `get_authenticated_user` output matches `GET /api/v1/user` for the same bearer token      |
| No shared service identity              | Each user sees their own `userUuid`, `email`, `role` � not an admin PAT                   |
| Isolated codebase                       | All server code lives in `lightdash-mcp-demo`, not the Lightdash monorepo                 |

### Context & Impact

Lightdash implements **two distinct OAuth directions**:

| Direction                         | Meaning                                                                | Relevant to this RFC?                        |
| --------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------- |
| **Lightdash as OAuth provider**   | External as authenticate users against Lightdash; tokens are `ldapp_�` | **Yes** � OAuth Applications UI              |
| **Lightdash as MCP/OAuth client** | Lightdash AI agents connect outbound to _your_ MCP server              | **No** � different feature (`ai_mcp_server`) |

This spike uses only the first direction.

---

## 2. Evaluation Criteria

| Criterion               | Definition                                                                        |
| ----------------------- | --------------------------------------------------------------------------------- |
| **Permission fidelity** | Tool calls execute with the authenticated user's CASL abilities via Lightdash API |
| **Security**            | No long-lived shared secrets; per-user OAuth tokens; HTTPS via ngrok              |
| **Time-to-first-demo**  | Minimal scope: one tool, one API endpoint                                         |
| **Spec compliance**     | MCP Streamable HTTP transport + OAuth protected-resource metadata (RFC 9728)      |
| **Maintainability**     | Standalone demo repo; easy to discard or evolve independently                     |

---

## 3. Approaches

### Approach 1: Custom MCP proxy + OAuth Applications (selected)

**Description:** Host a thin MCP server (localok). On tool execution, forward the user's Lightdash OAuth bearer token to `GET /api/v1/user`. MCP client obtains the token from Lightdash via standard OAuth discovery.

**Pros:** Native CASL permissions; no custom authz; matches long-term architecture for custom tools on GCP.
**Cons:** You operate the MCP server; must handle OAuth metadata and token pass-through correctly.

### Approach 2: Extend official Lightdash MCP (upstream)

**Description:** Add tools to `McpService` in the Lightdash repo; clients connect to `{siteUrl}/api/v1/mcp`.

**Pros:** Best permission fidelity; no extra infrastructure.
**Cons:** Slower iteration; requires PR review; not suitable for a private experiment repo.

### Approach 3: External MCP in AI Agent settings + token passthrough

**Description:** Register GCP MCP URL in Lightdash AI Agent config; pass user tokens through agent runtime.

**Pros:** Tools appear inside Lightdash AI agents natively.
**Cons:** Two credential layers (Lightdash?your server AND your server?Lightdash); more complex than this spike.

### Approach 4: Shared bearer / service account

**Description:** Single PAT or service account on the MCP server; all users share one identity.

**Pros:** Simplest to build.
**Cons:** Violates the goal of user-scoped permissions; over-privileged.

### Approach 5: Official MCP only (no custom server)

**Description:** Use built-in `/api/v1/mcp` tools only.

**Pros:** Minimal security surface.
**Cons:** Cannot add custom tools without Approach 2.

---

## 4. Scoring Matrix

| Approach                     | Permission fidelity | Security | Time-to-demo | Spec compliance | Maintainability | **Average** |
| :--------------------------- | :-----------------: | :------: | :----------: | :-------------: | :-------------: | :---------: |
| **1. OAuth-delegated proxy** |         95          |    85    |      75      |       85        |       80        |   **84**    |
| **2. Extend official MCP**   |         100         |    95    |      50      |       100       |       90        |   **87**    |
| **3. AI Agent external MCP** |         80          |    70    |      55      |       70        |       55        |   **66**    |
| **hared bearer**             |         15          |    40    |      95      |       60        |       50        |   **52**    |
| **5. Official MCP only**     |         100         |    95    |      90      |       100       |       95        |   **96**    |

_Scores 0�100. Approach 5 scores highest for production simplicity; Approach 1 is selected because the explicit goal is a **custom tool experiment** outside the monorepo._

---

## 5. Recommendation

Implement **Approach 1** as a spike in this repository (`yu-iskw/lightdash-mcp-demo`):

- **Lightdash Cloud** is the OAuth authorization server.
- **Demo MCP server** runs locally, exposed via **ngrok**.
- **One tool:** `get_authenticated_user` ? proxies [GET /api/v1/user](https://docs.lightdash.com/api-reference/my-account/get-authenticated-user).
- **MCP client:** Cursor (primary); others documented as optional.

Phased delivery is defined in [Section 11](#11-implementation-phases).

---

## 6. Architecture

### 6.1 Component diagram

```text
???????????????     HTTPS      ????????????     HTTP      ?????????????? ? Demo MCP Server  ?
?  (Cursor)   ?                ?  tunnel  ?               ?  localhost:3100  ?
???????????????                ????????????               ????????????????????
       ?                                                             ?
       ? OAuth authorize + token                                     ? GET /api/v1/user
       ? (when 401 challenged)                                       ? Authorization: Bearer ldapp_�
       ?                                                             ?
????????????????????????????????????????????????????????????????????????????????
?                         Lightdash Cloud                                       ?
?  /api/v1/oauth/authorize  /api/v1/oauth/token  /api/v1/user                  �lient->>Ngrok: POST /mcp tools/call
    Ngrok->>DemoMCP: forward request
    alt no Bearer token
        DemoMCP-->>MCPClient: 401 WWW-Authenticate resource_metadata
        MCPClient->>LD: OAuth authorize + token
        LD-->>MCPClient: access_token ldapp_...
        MCPClient->>Ngrok: retry with Authorization Bearer
    end
    DemoMCP->>LD: GET /api/v1/user Bearer ldapp_
    LD-->>DemoMCP: LightdashUser JSON
    DemoMCP-->>MCPClient: tool result text/JSON
```

### 6.3 Auth model

| Principle                       | Detail                                                                                                   |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Token source**                | Lightdash OAuth access token (`ldapp_` prefix per `AuthTokenPrefix.OAUTH_APP`)                           |
| **Token storage (demo server)** | **None** � token lives in MCP client session only; server reads per-request `Authorization` header       |
| **Permission enforcement**      | Lightdash REST API + CASL on `SessionUser` resolved from token                                           |
| **Scopes requested**            | `read` (minimum for `GET /api/v1/user`); optionally `mcp:read` for MCP client parity                     |
| **Scope enforcement today**     | OAuth scopes are **mostly informational** REST; CASL is authoritative (see Lightdash source notes below) |

### 6.4 Lightdash source reference (behaviors we rely on)

#### OAuth authorization server discovery

Lightdash exposes OAuth 2.0 metadata at `GET {siteUrl}/api/v1/oauth/.well-known/oauth-authorization-server`:

```441:468:packages/backend/src/routers/oauthRouter.ts
export function oauthConfig(baseUrl: string) {
    return {
        issuer: baseUrl,
        authorization_endpoint: `${baseUrl}/api/v1/oauth/authorize`,
        token_endpoint: `${baseUrl}/api/v1/oauth/token`,
        ...
        scopes_supported: [
            OAuthScope.READ,
            OAuthScope.WRITE,
            OAuthScope.MCP_READ,
            OAuthScope.MCP_WRITE,
        ],
        pkce_required: false, // PKCE is optional but recommended
    };
}
```

Supported scopes: `read`, `write`, `mcp:read`, `mcp:write`.

#### Bearer token ? full user + CASL

`allowApiKeyAuthentication` tries OAuth bearer tokens first, resolves the user, and builds an `OauthAccount` with full abilities:

```163:190:packages/backend/src/controllers/authenticaon/middlewares.ts
    // Try OAuth bearer token first
    req.services
        .getOauthService()
        .authenticate(oauthReq, oauthRes)
        .then((token) => {
            req.services
                .getUserService()
                .findSessionUser({
                    id: token.user.userUuid,
                    organization: token.user.organizationUuid,
                })
                .then((user) => {
                    ...
                    req.account = fromOauth(user, token);
```

`fromOauth` attaches the user's existing CASL `ability` � same as session or PAT.

#### Target API endpoint

```61:87:packages/backend/src/controllers/userController.ts
    @Middlewares([allowApiKeyAuthentication, isAuthenticated])
    @Get('/')
    @OperationId('GetAuthenticatedUser')
    async getAuthenticatedUser(
        @Request() req: express.Request,
    ): Promise<ApiGetAuthenticatedUserResponse> {
        assertRegisteredAccount(req.account);
        ...
        return {
            status: 'ok',
            result {
                ...UserModel.lightdashUserFromSession(
                    toSessionUser(req.account),
                ),
                impersonation,
            },
        };
    }
```

OpenAPI: `GET /api/v1/user` � [docs](https://docs.lightdash.com/api-reference/my-account/get-authenticated-user).

#### Official MCP 401 challenge pattern (to mirror)

The demo server should follow the same `WWW-Authenticate` pattern as Lightdash's built-in MCP, but point `authorization_servers` at Lightdash Cloud:

```96:115:packages/backend/src/routers/mcpRouter.ts
const returnHeaderIfUnauthenticated = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
) => {
    if (req.account?.isAuthenticated()) {
        next();
    } else {
        ...
        res.set(
            'WWW-Authenticate',
            `Bearer resource_metadata="${baseUrl}/api/v1/oauth/.well-known/oauth-protected-resource"`,
        );
        res.status(401).json({ error: 'Unauthorized' });
    };
```

For the **demo server**, `resource_metadata` should reference the demo's own `/.well-known/oauth-protected-resource`, which lists Lightdash Cloud as `authorization_servers[0]`.

#### PKCE reference (CLI)

The Lightdash CLI OAuth login uses PKCE (`code_challenge` S256). Align manual OAuth testing with:

```40:43:packages/cli/src/handlers/oauthLogin.ts
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);
    const state = generators.state();
```

#### Scope enforcement note (not relied upon for this spike)

MCP scope checks are intentionally disabled in Lightdash today:

```3072:3083:packages/backend/src/ee/services/McpService/McpService.ts
        // Do not enforce client scopes for now until more MCP clients support this
        /*
        if (
            !scopes.includes(OAuthScope.MCP_READ) &&
            !scopes.includes(OAuthScope.MCP_WRITE)
        ) {
            throw new ForbiddenError('You are not allowed to access MCP');
        }
        */
```

---

## 7. OAuth & ngrok Setup (Lightdash Cloud)

### 7.1 Prerequisites checklist

- [ ] Org **admin** access on target Lightdash Cloud / staging instance
- [ ] [ngrok](https://ngrok.com/) installed and authenticated (`ngrok config add-authtoken �`)
- [ ] Node.js ? 24 (per `lightdash-mcp-demo` `.node-version`)
- [ ] pnpm ? 11

### 7.2 Register OAuth application (Lightdash UI)

1. Log in to Lightdash Cloud as an org admin.
2. Navigate to **Settings ? Organization ? OAuth applications**.
3. Click **Register new application**.
4. Fill in:
   - **Application name:** `lightdash-mcp-demo` (or similar)
   - **Redirect URI:** See [Section 7.4](#74-redirect-uri-strategy) � at least one HTTPS callback URL
5. Click **Register application**.
6. Copy **Client ID** (`oauth-�`) and **Client secret** immediately (secret shown once).

Registration API (equivalent): `POST /api/v1/oauth/clients` with `{ clientNams }` � requires org admin session.

### 7.3 ngrok workflow

```bash
# Terminal 1 � start demo MCP server (after implementation)
cd lightdash-mcp-demo
pnpm --filter @lightdash-mcp-demo/server dev   # listens on MCP_SERVER_PORT (default 3100)

# Terminal 2 � expose HTTPS tunnel
ngrok http 3100
```

Copy the **Forwarding** HTTPS URL (e.g. `https://abc123.ngrok-free.app`). Set:

```bash
MCP_PUBLIC_URL=https://abc123.ngrok-free.app
```

MCP endpoint for clients: `{MCP_PUBLIC_URL}/mcp`

**ngrok caveats:**

- Free tier URLs change on restart ? update Cursor config and possibly OAuth redirect URIs.
- ngrok may show an interstitial browser warning on first visit � usually not an issue for API clients.
- Prefer a reserved domain (paid) if iterating over multiple days.

### 7.4 Redirect URI strategy

OAuth redirect URIs registered in Lightdash must **exactly match** what the OAuth client uses during authorization code exchange.

| Cpical redirect URI               | Notes                                           |
| --------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Manual / curl spike (Phase 2)** | `http://localhost:PORT/callback`                | Register in OAuth app; run local callback server                                    |
| **Cursor MCP OAuth**              | Cursor-specific callback (varies by version)    | Inspect Cursor MCP OAuth logs or network tab during first connect                   |
| **Dynamic registration**          | `POST /api/v1/oauth/register` (unauthenticated) | Creates `mcp-�` client IDs; used by some MCP clients � **out of scope for Phase 1** |

**De-risking order:**

1. Phase 2: manual OAuth with localhost callback + hardcoded `ldapp_` token.
2. Phase 3: demo server `401` + `WWW-Authenticate` metadata.
3. Phase 4: Cursor + ngrok end-to-end.

### 7.5 Environment variables

Create `.env.local` in `lightdash-mcp-demo` (gitignored):

| Variable                        | Required     | Example                          | Purpose                                                    |
| ------------------------------- | ------------ | -------------------------------- | ---------------------------------------------------------- |
| `LIGHTDASH_URL`                 | Yes          | `https://app.lightdash.cloud`    | Lightdash server URL (no trailing slash)                   |
| `LIGHTDASH*OAUTH_CLIENT*        | Yes          | `oauth-xxxxxxxx`                 | From OAuth application registration                        |
| `LIGHTDASH_OAUTH_CLIENT_SECRET` | Yes          | `(secret)`                       | From registration (one-time display)                       |
| `MCP_SERVER_PORT`               | No           | `3100`                           | Local HTTP port                                            |
| `MCP_PUBLIC_URL`                | Phase 3+     | `https://abc123.ngrok-free.app`  | Public HTTPS origin for OAuth resource metadata            |
| `OAUTH_REDIRECT_URI`            | Phase 2+     | `http://localhost:3847/callback` | Must match registered redirect URI                         |
| `LIGHTDASH_ACCESS_TOKEN`        | Phase 2 only | `ldapp_�`                        | Manual token for curl testing before OAuth challenge works |

Example `.env.local`:

```bash
LIGHTDASH_URL=https://app.lightdash.cloud
LIGHTDASH_OAUTH_CLIENT_ID=oauth-xxxxxxxxxxxxxxxx
LIGHTDASH_OAUTH_CLIENT_SECRET=your-secret-here
MCP_SERVER_PORT=3100
MCP_PUBLIC_URL=https://abc123.ngrok-free.app
```

### 7.6 Manual OAuth smoke test (Phase 2)

Before wiring Cursor, verify token issuance against Cloud:

```bash
# 1. Open in browser (replace values):
# ${LIGHTDASH_URL}/api/v1/oauth/authori
#   ?response_type=code
#   &client_id=${LIGHTDASH_OAUTH_CLIENT_ID}
#   &redirect_uri=${OAUTH_REDIRECT_URI}
#   &scope=read
#   &state=random-state
#   &code_challenge=${CODE_CHALLENGE}
#   &code_challenge_method=S256

# 2. Exchange code at POST ${LIGHTDASH_URL}/api/v1/oauth/token

# 3. Verify user endpoint:
curl -s -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  "${LIGHTDASH_URL}/api/v1/user" | jq .
```

Expected: `{ "status": "ok", "results": { "userUuid": "�", "email": "�", � } }`

Token lifetime defaults: **1 hour** access, **14 days** refresh (`AUTH_OAUTH_SERVER_ACCESS_TOKEN_LIFETIME`, `AUTH_OAUTH_SERVER_REFRESH_TOKEN_LIFETIME` on the Lightdash instance).

---

## 8. MCP Server Design (`lightdash-mcp-demo`)

### 8.1 Repository context

Current state of this repository (`yu-iskw/lightdash-mcp-demo`):

- pnpm workspace with a single package: `packages/mcp-server` (`@lightdash-mcp-demo/server`)

### 8.2 Package layout

```text
lightdash-mcp-demo/
└── packages/
    └── mcp-server/                # @lightdash-mcp-demo/server
        ├── package.json
        ├── tsconfig.json
        └── src/
            ├── index.ts           # Express app entry, listen()
            ├── config.ts          # zod-validated env
            ├── lightdash/
            │   ├── client.ts      # getAuthenticatedUser(accessToken)
            │   ├── lightdash-user.ts
            │   └── oauth-metadata.ts
            ├── mcp/
            │   └── create-server.ts
            └── middleware/
                └── require-bearer.ts
```

### 8.3 Dependencies (implementation)

| Package                     | Version guidance                   | Purpose                                      |
| --------------------------- | ---------------------------------- | -------------------------------------------- |
| `@modelcontextprotocol/sdk` | `1.29.0` (match Lightdash backend) | `McpServer`, `StreamableHTTPServerTransport` |
| `express`                   | latest compatible                  | HTTP server                                  |
| `zod`                       | latest                             | env + response validation                    |
| `typescript`                | ^5.9                               | already in template                          |

Reference pattern in Lightdash tests:

```103:139:packages/backend/src/ee/services/AiAgentService/AiAgentService.integration.test.ts
            const server = new McpServer({
                name: 'test-mcp-server',
                version: '1.0.0',
            });
            ...
            const transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: undefined,
            });
            await server.connect(transport);
            await transport.handleRequest(req, res, req.body);
```

### 8.4 HTTP routes

| Method | Path                                    | Auth            | Purpose                                                |
| ------ | --------------------------------------- | --------------- | ------------------------------------------------------ |
| `GET`  | `/health`                               | None            | Liveness (`{ "status": "ok" }`)                        |
| `GET`  | `/.well-known/oauth-protected-resource` | None            | MCP OAuth resource metadata                            |
| `POST` | `/mcp`                                  | Bearer required | MCP Streamable HTTP (JSON-RPC)                         |
| `GET`  | `/mcp`                                  | �               | `405 Method not allowed` (match Lightdash test server) |

#### Protected resource metadata (demo server)

```json
{
  "resource": "https://<MCP_PUBLIC_URL>/mcp",
  "authorization_servers": ["https://app.lightdash.cloud"],
  "bearer_methods_supported": ["header"],
  "scopes_supported": ["read", "write", "mcp:read", "mcp:write"]
}
```

MCP clients discover Lightdash as the authorization server; tokens issued by Lightdash are accepted by the demo server.

#### 401 response (unauthenticated MCP request)

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer resource_metadata="https://<MCP_PUBLIC_URL>/.well-known/oauth-protected-resource"
Content-Type: application/json

{ "error": "Unauthorized" }
```

### 8.5 Tool contract: `get_autnticated_user`

| Field            | Value                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------- |
| **Name**         | `get_authenticated_user`                                                              |
| **Title**        | Get authenticated user                                                                |
| **Description**  | Returns the Lightdash profile for the OAuth-authenticated user who invoked this tool. |
| **Input schema** | `{}` (no properties)                                                                  |
| **Output**       | MCP `content: [{ type: "text", text: "<pretty JSON>" }]`                              |
| **Annotations**  | `readOnlyHint: true`, `destructiveHint: false`, `openWorldHint: false`                |

#### Handler pseudocode

```text
on get_authenticated_user(args, extra):
  token = extra.authInfo.token
  if not token:
    return error content, isError: true

  response = GET ${LIGHTDASH_URL}/api/v1/user
             Header: Authorization: Bearer ${token}

  if response.status == 401:
    return "Lightdash rejected token (expired or revoked)", isError: true

  if response.status != 200:
    return "Lightdash API error: ${status}", isError: true

  return JSON.stringify(response.results, null, 2)
```

#### Example success payload (redacted)

```json
{
  "status": "ok",
  "results": {
    "userUuid": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    "firstName": "Demo",
    "lastName": "User",
    "email": "demo@example.com",
    "organizationUuid": "ffffffff-1111-2222-3333-444444444444",
    "organizationName": "My Organization",
    "role": "admin",
    "isActive": true,
    "impersonation": null
  }
}
```

---

## 9. MCP Client Configuration (Cursor)

### 9.1 Cursor `mcp.json`

Add to Cursor MCP settings (path varies by OS):

```json
{
  "mcpServers": {
    "lightdash-mcp-demo": {
      "url": "https://<ngrok-host>/mcp"
    }
  }
}
```

Replace `<ngrok-host>` with the current ngrok forwarding domain.

### 9.2 Expected connect flow

1. Cursor sends `POST /mcp` (e.g. `initialize` or `tools/list`) without `Authorization`.
2. Demo server responds `401` + `WWW-Authenticate` with `resource_metadata` URL.
3. Cursor fetches `/.well-known/oauth-protected-resource` ? discovers Lightdash Cloud as auth server.
4. Cursor opens browser OAuth against Lightdash`/api/v1/oauth/authorize`).
5. User approves; Cursor obtains `ldapp_�` access token.
6. Cursor retries MCP requests with `Authorization: Bearer ldapp_�`.
7. User invokes `get_authenticated_user` ? sees their Lightdash profile.

### 9.3 Known limitations

| Limitation                                | Mitigation                                                                                         |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| ngrok URL rotation                        | Update `mcp.json` and `MCP_PUBLIC_URL`; re-register redirect URI if needed                         |
| Access token expiry (1h default)          | Cursor should refresh via `refresh_token`; demo server does not store refresh tokens               |
| OAuth client secret in env                | Never commit; use `.env.local` only                                                                |
| `/oauth/introspect` requires session      | Do not use for server-side validation � forward token to `/api/v1/user` instead                    |
| Cursor OAuth callback URL unknown upfront | Complete Phase 2 manual OAuth first; add Cursor callback URI to Lightdash OAuth app before Phase 4 |

---

## 10. Security & Non-Goals

### In scope

- Per-user bearer token delegation (no share HTTPS termination via ngrok
- Secrets in local environment only
- Fail closed: no token ? 401, invalid token ? tool error

### Explicit non-goals

- Server-side refresh token persistence
- Custom RBAC or permission mapping
- Production GCP / Cloud Run deployment
- Additional tools beyond `get_authenticated_user`
- Token introspection endpoint usage
- Dynamic client registration (`/api/v1/oauth/register`)
- Integration with Lightdash AI Agent external MCP settings

### Risks

| Risk                                   | Severity         | Mitigation                                                 |
| -------------------------------------- | ---------------- | ---------------------------------------------------------- |
| Leaked `client_secret`                 | High             | `.gitignore` `.env.local`; rotate client in Lightdash UI   |
| Leaked `ldapp_` token in logs          | High             | Never log `Authorization` header; redact in error messages |
| Over-broad OAuth scopes                | Medium           | Request `read` only for this tool                          |
| ngrok exposes local server to internet | Medium           | Spike only; stop tunnel when not testing                   |
| OAuth scopes not enforced on REST      | Low (documented) | Rely onL; re-evaluate when Lightdash enforces scopes       |

---

## 11. Implementation Phases

| Phase | Goal                           | Exit criteria                                                                 |
| ----- | ------------------------------ | ----------------------------------------------------------------------------- |
| **0** | RFC approved                   | This document reviewed                                                        |
| **1** | Scaffold `packages/mcp-server` | `pnpm dev` ? `GET /health` returns 200                                        |
| **2** | MCP + tool with manual token   | `curl` POST `/mcp` with `LIGHTDASH_ACCESS_TOKEN` env ? tool returns user JSON |
| **3** | OAuth metadata + 401 challenge | Unauthenticated request returns `WWW-Authenticate`; metadata lists Lightdash  |
| **4** | Cursor + ngrok + Cloud E2E     | `get_authenticated_user` in Cursor returns real Cloud user                    |

### Phase 1 tasks (implementation)

- [ ] Add `packages/mcp-server` to `pnpm-workspace.yaml`
- [ ] Wire root `pnpm dev` script
- [ ] Add `.env.local.example`
- [ ] Implement `/health`

### Phase 2 tasks

- [ ] `LightdashClient.getAuthenticatedUser(token)`
- [ ] Register `get_authenticated_user` tool on `McpServer`
- [ ] `POScp` with Streamable HTTP transport
- [ ] Manual curl test script in `dev/`

### Phase 3 tasks

- [ ] `GET /.well-known/oauth-protected-resource`
- [ ] `requireBearer` middleware on `POST /mcp`
- [ ] Pass `authInfo.token` into tool handler

### Phase 4 tasks

- [ ] Document Cursor `mcp.json` in demo repo README
- [ ] Register Cursor OAuth redirect URI in Lightdash
- [ ] Record demo video or screenshot for spike retrospective

---

## 12. Test Plan

### Unit tests (`packages/mcp-server`)

| Test                                                                         | Assertion                                    |
| ---------------------------------------------------------------------------- | -------------------------------------------- |
| `LightdashClient.getAuthenticatedUser` sends `Authorization: Bearer <token>` | Header present                               |
| `LightdashClient` handles 401                                                | Throws typed error                           |
| `config.ts` rejects missing `LIGHTDASH_URL`                                  | Zod validation error                         |
| `oauthMetadata` response shape                                               | `authorization_servers[0] === LIGHTDASH_URL` |

Use Vitest (already in template). Mock `fetch` � no real Cloud calls in unit tests.

### Integration tests (manual / optional CI with secrets)

```bash
# Compa MCP tool output vs direct API
TOKEN="ldapp_..."
SITE="https://app.lightdash.cloud"

curl -s -H "Authorization: Bearer $TOKEN" "$SITE/api/v1/user" > /tmp/direct.json

# Invoke MCP tool via JSON-RPC POST to /mcp (after Phase 2 script exists)
# Assert userUuid and email match between /tmp/direct.json and tool output
```

### Manual E2E checklist (Phase 4)

- [ ] ngrok tunnel active; `curl https://<ngrok>/health` OK
- [ ] Cursor shows `lightdash-mcp-demo` server connected
- [ ] Browser OAuth consent page shows correct org name
- [ ] `get_authenticated_user` returns logged-in user's email
- [ ] Token expiry: after 1h, tool fails gracefully until Cursor re-authenticates
- [ ] Second user in same org gets their own profile (not first user's)

---

## Appendix A: Glossary

| Term                            | Meaning                                                                      |
| ------------------------------- | ---------------------------------------------------------------------------- |
| **OAuth Application**           | Org-registered OAuth client in Lightdash Settings                            |
| **ldapp\_**                     | Prefix for Lightdash OAuth access tokens                                     |
| **CASL**                        | Lightdash authorization library; enforces role-based abilities               |
| **Streamable HTTP**             | MCP transport over HTTP POST (replaces legacy SSE-only)                      |
| **Protected resource metadata** | RFC 9728 JSON document telling MCP clients which authorization server to use |

## Appendix B: Related Lightdash docs

- [Get authenticated user API](https://docs.lightdash.com/api-reference/my-account/get-authenticated-user)
- [Personal access tokens](https://docs.lightdash.com/references/personal_tokens) (not used in this spike)
- Internal: `docs/mcp-oauth-credential-resolution.md` (outbound MCP credentials � different feature)

---

_End of RFC._
