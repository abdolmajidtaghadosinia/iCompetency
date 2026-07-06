#!/usr/bin/env bash
# Checks that an AppView.MINIGAME_* value is fully wired: enum entry, App.tsx
# route block, hub registration, and backend allowlist. Does not check
# gameplay/visual correctness - see SKILL.md step 9 for the rest of the checklist.
#
# Usage: scripts/validate.sh MINIGAME_X

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <AppView value, e.g. MINIGAME_X>" >&2
  exit 1
fi

VIEW="$1"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$ROOT"

fail=0

check() {
  local description="$1"
  local pattern="$2"
  shift 2
  if grep -qE "$pattern" "$@" 2>/dev/null; then
    echo "OK    $description"
  else
    echo "MISSING  $description"
    fail=1
  fi
}

echo "Validating $VIEW ..."
echo

check "enum entry in types.ts" \
  "${VIEW}[[:space:]]*=[[:space:]]*'${VIEW}'" \
  types.ts

check "route block in App.tsx" \
  "AppView\.${VIEW}" \
  App.tsx

check "hub/nav registration (MiniGameHub, JourneyMap, or Sidebar)" \
  "AppView\.${VIEW}" \
  components/MiniGameHub.tsx components/JourneyMap.tsx components/Sidebar.tsx

check "backend allowlist entry in game_allowed_views()" \
  "'${VIEW}'" \
  backend/routes/game_routes.php

echo
if [[ $fail -eq 0 ]]; then
  echo "All checks passed. Still run 'npm run build' and click through the game manually."
else
  echo "One or more checks failed - see SKILL.md for which file to fix."
  exit 1
fi
