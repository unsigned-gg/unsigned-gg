# CLAUDE.md — unsigned-gg

## Charter
The unsigned **web/brand monorepo** and the **canonical design-system home**
(OPS-393). All public brand surfaces of unsigned — a GPU-native cloud platform
for AI/ML inference and training — ship from here via GitHub Pages. The
SSO-backed services (onboard-api, etc.) stay in unsigned-paas.

## Layout
- `index.html` — landing page. Static, hand-authored HTML/CSS, **no build**.
- `learn/` — /learn interactive platform explainers. Static, **no build**.
- `apps/<name>/` — built web apps (bun + vite), published at `/<name>/` on
  unsigned.gg. See `apps/README.md` for the rules.
- `scripts/build-site.sh` — composes the Pages artifact: static surfaces
  copied as-is + each app's `dist/` at `/<name>/`.

## Deploy
- Push to `main` → `.github/workflows/deploy.yml` → GitHub Pages
- PR gate: `.github/workflows/ci-site.yml` (site composes; CNAME present)
- Domain: unsigned.gg (`CNAME` — must land in the artifact root)

## Conventions
- Dark theme with green accent (#00e599)
- Fonts: Inter (sans), JetBrains Mono (mono)
- CSS custom properties for theming
- Landing + /learn stay single-file/no-build; build complexity is confined
  to `apps/`

## Design Context (canon: .impeccable.md)
This repo is the canonical home of the unsigned brand/design system — see
`.impeccable.md` for the full design canon (users, personality, aesthetic,
principles). Binding highlights: dark instrument panel (#0a0a0a + #00e599),
hacker-confident-playful voice with Linear-grade restraint, teach-by-doing
interactivity, keyboard-first + Cmd-K command bar on every page, WCAG AA +
prefers-reduced-motion, no SaaS-template patterns / gradient text /
glassmorphism / neon. Public repo: no secrets, no internal hostnames/IPs/
usernames; live-looking data is CI-published sanitized snapshots or labeled
demo data.
