# apps/ — built web apps

Each `apps/<name>/` with a `package.json` is built by `scripts/build-site.sh`
(bun install + `bun run build`, vite) and published at `https://unsigned.gg/<name>/`.

Rules:
- The landing page and `learn/` stay static, hand-authored, no-build — apps
  never absorb them.
- An app's vite config must set `base: "/<name>/"` so assets resolve under its
  path on the shared origin.
- Client-side routing on GitHub Pages needs the root `404.html` redirect
  pattern (no server rewrites): unknown paths under `/<name>/` bounce to
  `/<name>/?p=<path>` and the app restores the URL before mounting its
  router (see `onboard/src/main.tsx`).
- Design canon applies (`.impeccable.md`): dark instrument panel, #00e599
  accent, keyboard-first, WCAG AA. No secrets, no internal hostnames.
