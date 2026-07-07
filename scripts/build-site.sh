#!/usr/bin/env bash
# build-site.sh — compose the unsigned.gg Pages artifact (OPS-393).
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

# Static root — explicit allowlist. Never copy the whole tree: a local
# `wrangler pages deploy` of the artifact publishes everything in it, so any
# stray untracked file at repo root would go public (incident 2026-07-07:
# untracked CSV + dotfiles shipped in a local direct-upload deployment).
# New static surfaces must be added here deliberately.
for f in index.html 404.html CNAME; do
  cp "$f" "$OUT/"
done
cp -r learn "$OUT/learn"

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
