#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [[ -f "${ROOT_DIR}/.env.local" ]]; then
  # shellcheck disable=SC1091
  set -a
  source "${ROOT_DIR}/.env.local"
  set +a
fi

TOKEN="${LIGHTDASH_ACCESS_TOKEN:-}"
PORT="${MCP_SERVER_PORT:-3100}"
SITE_URL="${LIGHTDASH_URL:-}"

if [[ -z "${TOKEN}" ]]; then
  echo "LIGHTDASH_ACCESS_TOKEN is required (set in .env.local or environment)" >&2
  exit 1
fi

echo "Calling get_authenticated_user via MCP..."
curl -sS \
  -X POST "http://localhost:${PORT}/mcp" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_authenticated_user",
      "arguments": {}
    }
  }' | jq .

if [[ -n "${SITE_URL}" ]]; then
  echo ""
  echo "Direct API comparison (GET /api/v1/user):"
  curl -sS \
    -H "Authorization: Bearer ${TOKEN}" \
    "${SITE_URL%/}/api/v1/user" | jq .
fi
