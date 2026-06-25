#!/bin/bash
# Sourceable helper — Ollama endpoint SSRF allow-list.
#
# Single source of truth for `validate_ollama_endpoint` (extracted from
# reachability.sh so the runtime probe path AND the dev/eval produce scripts
# enforce the SAME host allow-list — no copy-paste drift). Centralising it
# resolves the guard-asymmetry between the hot path and the eval scripts.
#
# Do NOT execute directly; source it:
#   ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
#   source "$ROOT/scripts/lib-ollama-endpoint.sh"
#
# This file deliberately omits `set -euo pipefail` — it is sourced, not
# executed, and must not mutate the caller's shell options. It fails closed
# per-function (returns 1 on denial).
#
# No dependencies beyond POSIX sed/grep/tr.

# validate_ollama_endpoint — enforce a host allow-list so that a misconfigured
# or attacker-supplied endpoint cannot be used as an SSRF vector to reach
# internal services (e.g. cloud IMDS at 169.254.169.254).
#
# Allowed hosts (case-insensitive):
#   localhost           — the well-known loopback name
#   127.0.0.0/8         — the full loopback range (127.x.x.x with exactly
#                         three octets of 0-255 each)
#
# The extraction pipeline:
#   1. Strip the scheme (http:// or https://).
#   2. Strip userinfo (anything before @) — prevents 127.0.0.1@evil.com bypass.
#   3. Strip the port and any path suffix.
#   4. Lower-case for case-insensitive comparison.
#
# The 127.x.x.x pattern is anchored with a regex to match ONLY the loopback
# block — 127. followed by three dot-separated decimal groups — preventing
# 127.0.0.1.evil.com from matching the previously unanchored glob '127.*'.
#
# Prints nothing on success; writes an error to stderr and returns 1 on denial.
validate_ollama_endpoint() { # $1 = endpoint URL
  local url="$1"
  # Strip scheme, then userinfo (@), then port and path.
  local host
  host=$(printf '%s' "$url" |
    sed 's|^[^:]*://||' |
    sed 's|^[^@]*@||' |
    sed 's|[:/].*||' |
    tr '[:upper:]' '[:lower:]')
  case "$host" in
    localhost) return 0 ;;
    *)
      # Anchor the 127.x.x.x check: must be exactly 127.<octet>.<octet>.<octet>
      # with no trailing characters.  printf|grep is POSIX-portable and avoids
      # the unanchored glob '127.*' that matched 127.0.0.1.evil.com.
      if printf '%s' "$host" | grep -qE '^127\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$'; then
        return 0
      fi
      printf 'ERROR: Ollama endpoint host "%s" is not on the allow-list (must be localhost or 127.x.x.x)\n' \
        "$host" >&2
      return 1
      ;;
  esac
}
