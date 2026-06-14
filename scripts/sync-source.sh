#!/bin/bash
# sync-source.sh — detect and pull docs changes from wired sources into raw/.
#
#   sync-source.sh status [--name <n>]   # report changed docs per wired source
#   sync-source.sh pull   [--name <n>]   # snapshot changed docs into raw/wired/
#
# A wired source is a git work tree registered in settings.json (see
# wire-source.sh). Change detection is git: `git diff --name-only
# <lastSyncedCommit>..HEAD`, filtered by the record's include/exclude globs
# (same simple dialect as firewall.sh: `*` within a segment, `**` across).
#
# Pull NEVER overwrites an existing raw/ file (raw is immutable): the first
# snapshot of a doc lands at raw/wired/<name>/<relpath>; a changed doc lands as
# a NEW versioned sibling <stem>--<YYYY-MM-DD>-<sha8>.<ext>. A doc whose content
# already exists in any snapshot of that relpath (sha256-12, same algorithm as
# the source manifest) is skipped — idempotent re-pulls.
#
# status always exits 0. pull exits 1 only on a hard failure (no settings,
# unknown name, vault missing).
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=resolve-vault.sh
source "${SCRIPT_DIR}/resolve-vault.sh"

SUB="${1:-}"
case "$SUB" in
  status | pull) shift ;;
  *)
    echo "usage: sync-source.sh <status|pull> [--name <n>]" >&2
    exit 1
    ;;
esac

ONLY_NAME=""
while [ $# -gt 0 ]; do
  case "$1" in
    --name)
      ONLY_NAME="$2"
      shift 2
      ;;
    *) shift ;;
  esac
done

# Same glob dialect as scripts/firewall.sh / src/core/firewall.ts.
glob_to_regex() { # ** -> .*, * -> [^/]*
  local glob="$1" re="" i c n
  n=${#glob}
  for ((i = 0; i < n; i++)); do
    c="${glob:i:1}"
    if [ "$c" = "*" ]; then
      if [ "${glob:i+1:1}" = "*" ]; then
        re+=".*"
        i=$((i + 1))
      else
        re+="[^/]*"
      fi
    elif [[ "$c" == [\\^\$.\|\?\+\(\)\[\]\{\}] ]]; then
      re+="\\$c"
    else
      re+="$c"
    fi
  done
  printf '^%s$' "$re"
}

# matches_any <path> <glob-list (newline-separated)>
matches_any() {
  local path="$1" globs="$2" g re
  [ -z "$globs" ] && return 1
  while IFS= read -r g; do
    [ -z "$g" ] && continue
    re=$(glob_to_regex "$g")
    if [[ "$path" =~ $re ]]; then return 0; fi
  done <<<"$globs"
  return 1
}

file_sha12() { # sha256, first 12 hex chars — mirrors src/core/manifest.ts checksum()
  shasum -a 256 "$1" 2>/dev/null | awk '{print substr($1,1,12)}'
}

# changed_files <repo> <lastCommit> — relpaths, one per line.
# Empty lastCommit → initial wire-up: every tracked file.
changed_files() {
  local repo="$1" last="$2"
  if [ -z "$last" ]; then
    git -C "$repo" ls-files 2>/dev/null
  else
    git -C "$repo" diff --name-only "${last}..HEAD" 2>/dev/null
  fi
}

WIRED=$(wired_read) || exit 1
if [ -z "$WIRED" ]; then
  [ "$SUB" = "status" ] && exit 0
  echo "[claude-wiki-pages] ERROR: no wired sources registered — run wire-source.sh add first" >&2
  exit 1
fi

FOUND_NAME=0
TOTAL_PULLED=0

while IFS='|' read -r NAME SRC_PATH REC_VAULT LAST_COMMIT; do
  [ -z "$NAME" ] && continue
  if [ -n "$ONLY_NAME" ] && [ "$NAME" != "$ONLY_NAME" ]; then continue; fi
  FOUND_NAME=1

  if ! git -C "$SRC_PATH" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "[claude-wiki-pages] WARN: wired source \"$NAME\" path \"$SRC_PATH\" is not a git work tree — skipping" >&2
    continue
  fi

  INCLUDE=$(wired_globs "$NAME" include)
  EXCLUDE=$(wired_globs "$NAME" exclude)

  # Collect the filtered change set.
  MATCHED=""
  COUNT=0
  while IFS= read -r rel; do
    [ -z "$rel" ] && continue
    matches_any "$rel" "$INCLUDE" || continue
    matches_any "$rel" "$EXCLUDE" && continue
    MATCHED="${MATCHED}${rel}
"
    COUNT=$((COUNT + 1))
  done < <(changed_files "$SRC_PATH" "$LAST_COMMIT")

  if [ "$SUB" = "status" ]; then
    echo "WIRED-CHANGES: ${NAME} ${COUNT}"
    [ -n "$MATCHED" ] && printf '%s' "$MATCHED" | sed 's/^/  - /'
    continue
  fi

  # ── pull ──────────────────────────────────────────────────────────────────
  VAULT="$REC_VAULT"
  [ -z "$VAULT" ] && VAULT=$(resolve_vault)
  if [ ! -d "$VAULT" ]; then
    echo "[claude-wiki-pages] ERROR: vault \"$VAULT\" for wired source \"$NAME\" does not exist" >&2
    exit 1
  fi

  DEST_ROOT="${VAULT}/raw/wired/${NAME}"
  TODAY=$(date -u +%Y-%m-%d 2>/dev/null || echo "0000-00-00")
  PULLED=0
  SKIPPED=0

  while IFS= read -r rel; do
    [ -z "$rel" ] && continue
    src="${SRC_PATH}/${rel}"
    # Deleted upstream (diff names include deletions) — nothing to snapshot.
    [ -f "$src" ] || continue

    sha=$(file_sha12 "$src")
    dest="${DEST_ROOT}/${rel}"
    dest_dir=$(dirname "$dest")
    base=$(basename "$rel")
    stem="${base%.*}"
    ext="${base##*.}"
    [ "$stem" = "$base" ] && ext="" # no extension

    # Dedup: skip when this exact content already exists in any snapshot of
    # this relpath (the original or a versioned sibling).
    dup=0
    if [ -d "$dest_dir" ]; then
      while IFS= read -r existing; do
        [ -z "$existing" ] && continue
        if [ "$(file_sha12 "$existing")" = "$sha" ]; then
          dup=1
          break
        fi
      done < <(find "$dest_dir" -maxdepth 1 -type f \( -name "$base" -o -name "${stem}--*${ext:+.$ext}" \) 2>/dev/null)
    fi
    if [ "$dup" -eq 1 ]; then
      SKIPPED=$((SKIPPED + 1))
      continue
    fi

    # No-clobber: first snapshot takes the plain relpath; a changed doc gets a
    # NEW versioned sibling. Never overwrite (raw is immutable).
    if [ -e "$dest" ]; then
      dest="${dest_dir}/${stem}--${TODAY}-${sha:0:8}${ext:+.$ext}"
      [ -e "$dest" ] && {
        SKIPPED=$((SKIPPED + 1))
        continue
      }
    fi
    # M31: confine the resolved destination to DEST_ROOT using physical-path
    # comparison before writing. A git-derived rel path that contains ".." or
    # symlink components (possible with adversarial wired-source repos) could
    # otherwise escape the raw/wired/<name>/ subtree.
    mkdir -p "$dest_dir" 2>/dev/null || true
    _abs_dest=$(cd "$dest_dir" 2>/dev/null && printf '%s/%s' "$(pwd -P)" "$base") || {
      echo "[claude-wiki-pages] WARN: could not resolve dest dir \"$dest_dir\" — skipped" >&2
      continue
    }
    _abs_dest_root=$(cd "$DEST_ROOT" 2>/dev/null && pwd -P) || {
      echo "[claude-wiki-pages] WARN: could not resolve DEST_ROOT \"$DEST_ROOT\" — skipped" >&2
      continue
    }
    case "$_abs_dest" in
      "${_abs_dest_root}/"*) : ;; # confined — allow
      *)
        echo "[claude-wiki-pages] WARN: dest \"$_abs_dest\" escapes DEST_ROOT — skipped" >&2
        continue
        ;;
    esac
    if cp "$src" "$dest" 2>/dev/null; then
      PULLED=$((PULLED + 1))
      echo "  + ${dest#"${VAULT}"/}"
    else
      echo "[claude-wiki-pages] WARN: could not copy \"$rel\" — skipped" >&2
    fi
  done <<<"$MATCHED"

  HEAD_SHA=$(git -C "$SRC_PATH" rev-parse HEAD 2>/dev/null || echo "")
  NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "?")
  [ -n "$HEAD_SHA" ] && wired_set_synced "$NAME" "$HEAD_SHA" "$NOW"

  echo "PULLED: ${NAME} ${PULLED} new snapshot(s), ${SKIPPED} unchanged (synced to ${HEAD_SHA:0:7})"
  TOTAL_PULLED=$((TOTAL_PULLED + PULLED))
done <<<"$WIRED"

if [ -n "$ONLY_NAME" ] && [ "$FOUND_NAME" -eq 0 ]; then
  echo "[claude-wiki-pages] ERROR: wired source \"$ONLY_NAME\" is not registered" >&2
  exit 1
fi

exit 0
