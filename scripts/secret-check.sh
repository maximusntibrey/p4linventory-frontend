#!/usr/bin/env bash
# Blocks commits that add private keys or obvious secrets (pre-commit local hook).
set -euo pipefail
bad=0
for f in "$@"; do
  case "$f" in .env.example|scripts/secret-check.sh) continue ;; esac
  if grep -InE -e '-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----' -e 'AKIA[0-9A-Z]{16}' -e '(secret|password|token|api_key)[A-Za-z_]*[[:space:]]*=[[:space:]]*["'"'"'][^"'"'"' ]{12,}["'"'"']' "$f"; then
    echo "possible secret in $f"; bad=1
  fi
done
exit $bad
