#!/usr/bin/env bash
# Roadmap data guard — validates roadmap/data/roadmap.json before it can ship.
# Two jobs: (1) schema sanity, (2) a leak guard for the public site.
#
# The roadmap is a curated, sanitized projection of the internal platform
# roadmap (docs/platform-roadmap.md in unsigned-paas is the canonical order+
# status source). Because a human edits this file, this guard is the net that
# stops an internal identifier, hostname, IP, or credential from reaching the
# public site — the exact failure class the design canon's "Data honesty" rule
# forbids. Runs in CI (ci-site) and locally.
set -euo pipefail

DATA="${1:-roadmap/data/roadmap.json}"
fail() { echo "roadmap-guard: FAIL — $*" >&2; exit 1; }
[ -f "$DATA" ] || fail "missing $DATA"

# --- 1. schema sanity (pure jq; no deps) ---
jq -e '
  (.meta.generatedAt | type == "string") and
  (.meta.demo | type == "boolean") and
  (.horizons | type == "array" and length >= 1) and
  (all(.horizons[];
      (.id | type=="string") and (.label | type=="string") and
      (.items | type=="array") and
      all(.items[];
        (.title|type=="string") and (.blurb|type=="string") and
        (.area|type=="string") and
        (.status | IN("shipped","building","planned")))))
' "$DATA" >/dev/null || fail "schema invalid (fields/types/status enum). Status must be shipped|building|planned."

# --- 2. leak guard: internal identifiers must never appear ---
# Scans string values only. Patterns are the site's data-honesty denylist:
# ticket IDs, tailnet/internal hostnames, private IP ranges, credentials,
# usernames, and internal project codenames.
VALUES="$(jq -r '[.. | strings] | join("\n")' "$DATA")"
DENY='(OPS-[0-9]|CER-[0-9]|[a-z0-9-]+\.ts\.net|\.dev\.unsigned\.gg|\bbao\.|10\.[0-9]{1,3}\.[0-9]|100\.[0-9]{1,3}\.|op://|openbao-bootstrap|1[Pp]assword|cerebral-bot|harbor\.dev|kubeconfig-tenant|\bctodie\b|\btodie\b|\bcygnus\b|\brina\b|\bhoplite\b|\bkagent\b|\bhermes\b|ashburn|b200|48.?b200)'
if echo "$VALUES" | grep -inE "$DENY"; then
  fail "leak guard tripped — an internal identifier/hostname/codename reached the public roadmap. Sanitize before shipping."
fi

# --- 3. honesty nudge: >60% shipped is suspicious for a live roadmap ---
TOTAL=$(echo "$VALUES" >/dev/null; jq '[.horizons[].items[]] | length' "$DATA")
SHIPPED=$(jq '[.horizons[].items[] | select(.status=="shipped")] | length' "$DATA")
echo "roadmap-guard: OK — ${TOTAL} items, ${SHIPPED} shipped, schema + leak guard clean."
