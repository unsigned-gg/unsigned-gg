# @unsigned-gg/tokens

unsigned brand design tokens — the dark instrument panel (`#0a0a0a` + `#00e599`,
Inter/JetBrains Mono). Canonical source of truth for every unsigned-brand
surface; see `.impeccable.md` at the repo root for the full design canon and
`unsigned-component-lib-scope-2026-07-08.md` (operator archive) for the layer plan.

Do NOT mix with the Cerebral brand family (Catppuccin living-terminal —
mission-control, files-portal, @cerebral/design). The two families share
component behavior, never tokens.

## Consume

- **No-build pages on unsigned.gg** — the composed site serves the artifact at
  the root: `<link rel="stylesheet" href="/tokens.css">`
- **Apps in this repo** — workspace import: `import tokens from "@unsigned-gg/tokens"`
  or `@import "@unsigned-gg/tokens/tokens.css"`
- **Out-of-repo surfaces (dash, …)** — `npm install @unsigned-gg/tokens`
  (public npm — operator decision D1, 2026-07-08)

## Edit

Change `tokens.json`, run `bun run build`, commit source + `dist/` together —
CI regenerates and fails on mismatch. Never edit `dist/` by hand.
