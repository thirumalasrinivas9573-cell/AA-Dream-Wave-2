#!/usr/bin/env bash
# DW-ARCH-002 — fail if canonical runtime couples to quarantined trees
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FAIL=0

echo "Architecture boundary verify (canonical → legacy)"

SERVER_HITS=$(rg -n --glob '!**/node_modules/**' --glob '!**/src/mj/**' \
  'src/mj|dream-wave-ai/' server 2>/dev/null || true)
# Allow package name / deploy service name strings that are not path imports
SERVER_HITS=$(echo "$SERVER_HITS" | grep -v 'QUARANTINE\|package.json\|package-lock\|render.yaml' || true)
if [[ -n "${SERVER_HITS// }" ]]; then
  echo "$SERVER_HITS"
  echo "FAIL: canonical server references quarantined paths"
  FAIL=1
else
  echo "OK: server has no runtime coupling to quarantined trees"
fi

CLIENT_HITS=$(rg -n --glob '!**/node_modules/**' 'dream-wave-ai/|src/mj' client/src 2>/dev/null || true)
if [[ -n "${CLIENT_HITS// }" ]]; then
  echo "$CLIENT_HITS"
  echo "FAIL: client references quarantined trees"
  FAIL=1
else
  echo "OK: client has no coupling to quarantined trees"
fi

node -e "
const s = require('./package.json').scripts || {};
const blob = JSON.stringify(s);
if (/dream-wave-ai\\/|src\\/mj|mobile\\//.test(blob)) {
  console.error('FAIL: root scripts reference non-canonical trees');
  process.exit(1);
}
console.log('OK: root scripts are canonical-only');
" || FAIL=1

for f in dream-wave-ai/QUARANTINE.md server/src/mj/QUARANTINE.md ARCHITECTURE_BOUNDARIES.md; do
  if [[ ! -f "$f" ]]; then
    echo "FAIL: missing $f"
    FAIL=1
  else
    echo "OK: $f present"
  fi
done

if [[ "$FAIL" -ne 0 ]]; then
  echo "Boundary verification FAILED"
  exit 1
fi
echo "Boundary verification PASSED"
exit 0
