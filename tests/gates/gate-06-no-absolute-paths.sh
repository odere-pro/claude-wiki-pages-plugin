#!/bin/bash
# Gate 06 — no machine-specific absolute paths leak into shipped artifacts.
# Skills, agents, scripts, src, hooks must use ${CLAUDE_PLUGIN_ROOT} / ~ / relative
# paths — never a hard-coded /Users/<name> or /home/<name>.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 2

hits="$(git ls-files -- 'skills/*' 'agents/*' 'scripts/*' 'src/*' 'hooks/*' 'commands/*' \
  | xargs grep -nE '/(Users|home)/[a-zA-Z]' 2>/dev/null || true)"

if [ -z "$hits" ]; then
  echo "OK: no absolute home paths in shipped artifacts"
  exit 0
fi
echo "FAIL: absolute paths found:"
printf '%s\n' "$hits"
exit 1
