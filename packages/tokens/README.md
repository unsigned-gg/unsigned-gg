# @unsigned-gg/tokens

unsigned brand design tokens — the dark instrument panel (`#0a0a0a` + `#00e599`,
Inter/JetBrains Mono). Canonical source of truth for every unsigned-brand
surface; see `.impeccable.md` at the repo root for the full design canon and
`unsigned-component-lib-scope-2026-07-08.md` (operator archive) for the layer plan.

Do NOT mix with the Cerebral brand family (@cerebral/design — files-portal,
lab, voicenotes, dreamcode). The two families share component behavior,
never tokens. (Deliberate: parallel grammars, operator decision 2026-07-10.)

## Grammar (foundation expansion 2026-07-10)

- **Legacy bare vars are FROZEN** at the original 20 names (`--bg`,
  `--surface*`, `--border*`, `--dim/--mid/--bright/--white`, the 7 hues,
  `--mono/--sans`, `--ease`). Nothing new ever emits bare except roles.
- **Roles** are the semantic API — bind these, not hues: `--accent`,
  `--accent-dim`, `--focus`, `--ok`, `--info`, `--warn`, `--danger`
  (emitted as `var()` refs; a hue change propagates).
- **Everything else is prefixed** `--<group>-<name>`: `--text-*` (type
  scale, 10–28px from observed usage), `--space-0..8`, `--radius-xs..xl,
  round`, `--z-grid/content/rail/header/overlay`, `--motion-fast..xslow`,
  `--grid-cell` (the 60px engineering grid).
- Scales were **derived from live /learn usage and normalized** — off-scale
  literals (9px, 12.5px, 5px radius) deliberately stay literal in surfaces
  until a scale step earns them.

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
