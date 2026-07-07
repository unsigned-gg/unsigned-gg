#!/usr/bin/env bash
# build-site.sh — compose the unsigned.gg GitHub Pages artifact (OPS-393).
#
# Two kinds of surface, one published site:
#   1. Static surfaces (landing index.html, learn/) — copied as-is, NO build
#      step. This is charter: the brand surfaces stay hand-authored HTML/CSS.
#   2. Built apps — every apps/<name>/ with a package.json is built with
#      bun (vite) and published at /<name>/ on the site.
#
# CNAME must land in the artifact root or the unsigned.gg custom domain
# detaches on the next deploy — ci-site.yml asserts it.
set -euo pipefail

OUT="${1:?usage: build-site.sh <out-dir>}"
rm -rf "$OUT"
mkdir -p "$OUT"

# Static root — everything except repo/tooling surfaces that must not publish.
rsync -a \
  --exclude '.git' \
  --exclude '.github' \
  --exclude 'apps' \
  --exclude 'docs' \
  --exclude 'scripts' \
  --exclude 'node_modules' \
  --exclude "$OUT" \
  --exclude 'CLAUDE.md' \
  --exclude '.impeccable.md' \
  --exclude '.design-sync.json' \
  --exclude '.gitignore' \
  ./ "$OUT/"

# Built apps: apps/<name>/ → /<name>/
for dir in apps/*/; do
  [ -f "${dir}package.json" ] || continue
  name="$(basename "$dir")"
  echo "==> building app: $name"
  (cd "$dir" && bun install --frozen-lockfile && bun run build)
  mkdir -p "$OUT/$name"
  cp -r "${dir}dist/." "$OUT/$name/"
done

echo "==> site composed at $OUT"
