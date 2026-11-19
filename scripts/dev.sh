#!/usr/bin/env bash
# Local dev launcher (FIX-1): checks node and npm, installs if needed, warns when the
# backend is down, then starts Vite. No make needed. Usage: bash scripts/dev.sh
set -u
cd "$(dirname "$0")/.."

command -v node >/dev/null 2>&1 || { echo "ERROR: node not found. Install Node 26 (see README)." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "ERROR: npm not found. It ships with Node." >&2; exit 1; }

want="$(tr -d 'v \r\n' < .nvmrc 2>/dev/null)"
have="$(node -v | tr -d 'v\r\n')"
[ -n "$want" ] && [ "$want" != "$have" ] && echo "WARN: Node $have found, .nvmrc pins $want. Continuing; update when convenient."

[ -d node_modules ] || { echo "node_modules missing: running npm ci"; npm ci || exit 1; }

backend="${VITE_BACKEND_URL:-http://127.0.0.1:8000}"
if command -v curl >/dev/null 2>&1; then
  curl -fsS --max-time 3 "$backend/health/" >/dev/null 2>&1 \
    || echo "WARN: backend $backend/health/ is not up. Start the backend first; the UI will load but API calls will fail."
fi

exec npm run dev
