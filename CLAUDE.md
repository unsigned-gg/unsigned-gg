# CLAUDE.md — unsigned-gg

## Overview
Landing page for unsigned — a GPU-native cloud platform for AI/ML inference and training. "Scale to zero, scale to thousands, no vendor lock-in."

## Tech Stack
- Pure HTML/CSS (single `index.html`, 28KB)
- No build tools, frameworks, or dependencies

## Deploy
- Push to `main` → GitHub Actions → GitHub Pages
- Domain: unsigned.gg (CNAME configured)

## Key Files
- `index.html` — complete site
- `.github/workflows/deploy.yml` — GitHub Pages deployment
- `CNAME` — domain config

## Conventions
- Dark theme with green accent (#00e599)
- Fonts: Inter (sans), JetBrains Mono (mono)
- CSS custom properties for theming
- Single-file architecture — no build complexity

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
