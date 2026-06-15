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

if [[ -f "${ROOT_DIR}/.env" ]]; then
  # shellcheck disable=SC1091
  set -a
  source "${ROOT_DIR}/.env"
  set +a
fi

CLIENT_ID="${LIGHTDASH_OAUTH_CLIENT_ID:-}"
CLIENT_SECRET="${LIGHTDASH_OAUTH_CLIENT_SECRET:-}"
SITE_URL="${LIGHTDASH_URL:-}"

if [[ -z "${CLIENT_ID}" || -z "${CLIENT_SECRET}" || -z "${SITE_URL}" ]]; then
  echo "Set LIGHTDASH_URL, LIGHTDASH_OAUTH_CLIENT_ID, LIGHTDASH_OAUTH_CLIENT_SECRET in .env.local or .env" >&2
  exit 1
fi

echo "Probing token endpoint with dummy authorization code..."
response="$(
  curl -sS -X POST "${SITE_URL%/}/api/v1/oauth/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=authorization_code" \
    -d "code=invalid-probe-code" \
    -d "redirect_uri=http://localhost:8787/callback" \
    -d "client_id=${CLIENT_ID}" \
    -d "client_secret=${CLIENT_SECRET}" \
    -d "code_verifier=invalid-probe-verifier"
)"

echo "${response}"

if echo "${response}" | rg -q 'Invalid client'; then
  echo "FAIL: client_id/client_secret pair is rejected by Lightdash." >&2
  exit 1
fi

if echo "${response}" | rg -q 'Invalid grant|invalid_grant'; then
  echo "OK: client credentials accepted; only the dummy code/PKCE was rejected (expected)."
  exit 0
fi

echo "Unexpected response; inspect manually." >&2
exit 2
