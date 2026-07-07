# unsigned.gg — Hosting & Release-Sync Architecture

**Status:** Decided 2026-06-06 · Revised 2026-07-07 (hosting swapped to Cloudflare Pages)
**Scope:** Where the public `unsigned.gg` website lives, and how it stays in sync with the unsigned-paas platform's release cadence.

---

## TL;DR

- **Hosting:** **Cloudflare Pages** (since 2026-07-07 — see Decision 2). Not the VKE cluster. Cloudflare is both DNS/CDN and origin.
- **Source:** Stays in its own repo, `unsigned-gg/unsigned-gg` — now a small monorepo: hand-authored static surfaces (landing, `/learn`) plus built apps under `apps/`, composed by `scripts/build-site.sh`. Decoupled from the platform monorepo's CI.
- **Sync:** **Push, not pull.** On a platform release, `unsigned-paas` fires a `repository_dispatch` to `unsigned-gg` carrying the version + release-note text in the payload. The site renders that data and redeploys. No scraping, no cron, no cross-repo read token, no cluster coupling. *(Designed; not yet wired.)*

---

## Decision 1 — Host off the cluster *(unchanged)*

The public site stays on a static CDN-fronted host, **not** the VKE cluster.

- The VKE cluster is a billable, autoscaling compute plane built for GPU inference + platform services. Serving a marketing/docs page from it would require a Helm chart + ArgoCD app + Vultr LB + Traefik route + cert-manager + PDB/NetworkPolicy (every CLAUDE.md chart requirement) for something a CDN does better and cheaper — while widening the cluster's public attack surface.
- **Failure isolation:** a cluster incident (node cycling, DB-egress/Harbor churn) must never take down the public shopfront. Keep the storefront off the factory floor.
- The cluster *would* only enter the picture for low-latency in-cluster data (live inference demos, Keycloak-authed dashboards) — and even then the pattern is *site-on-CDN calls a Kong/Traefik-exposed API*, not hosting the site on the cluster.

## Decision 2 — Cloudflare Pages *(revised 2026-07-07; originally GitHub Pages)*

The 2026-06-06 decision kept **GitHub Pages** because the site was a single static file and migration was pure churn, with an explicit revisit clause: *"Revisit CF Pages if we start wanting per-PR visual preview deploys, the site grows a real build pipeline, or we want to collapse everything onto the Cloudflare plane."*

All three revisit conditions arrived with the monorepo work (OPS-393/OPS-394): the repo grew a real build pipeline (`apps/` built with bun+vite, composed by `build-site.sh`), per-deploy preview URLs became useful, and the Cerebral house pattern is CF Pages direct upload. Operator decision 2026-07-07: **swap to Cloudflare Pages** (project `unsigned-gg`, direct upload from `.github/workflows/deploy.yml`).

- Domains: `unsigned.gg` + `www.unsigned.gg` as proxied CNAMEs → `unsigned-gg.pages.dev`.
- GitHub Pages was decommissioned 2026-07-07 (hard cut, operator decision — no soak): Pages disabled on the repo, `CNAME` file and its CI assert removed. Rollback to GH Pages would now require re-enabling Pages and re-adding the CNAME, not just DNS.
- **Caution (incident 2026-07-07):** CF Pages keeps *every* deployment publicly reachable on a per-deployment preview URL, and a local `wrangler pages deploy` publishes whatever is in the artifact directory — including untracked files. `build-site.sh` therefore composes from an explicit allowlist; never deploy a hand-assembled directory.

## Decision 3 — Separate repo *(unchanged)*

The site source stays out of the `unsigned-paas` monorepo so that:

- Copy edits don't trigger the platform's Terraform / Helm / Checkov / Gitleaks CI graph.
- The infra CLAUDE.md hard-rules (kebab-case everything, pinned images, daemonless builds) don't awkwardly bind a static web app.
- The site keeps its own cadence, reviewers, and risk profile.

---

## The sync model — push, not pull *(designed; not yet wired)*

**Goal:** the public site reflects the platform's current release state without scraping the cluster or polling.

**Constraint that decides the design:** `unsigned-paas` is **private**, `unsigned-gg` is **public**.
- ❌ Client-side fetch of the GitHub Releases API from the public page — can't read a private repo without an embedded token (never embed a token in a public page).
- ❌ Deep-linking the site to a release/changelog page on the private repo — 404 for every public visitor.
- ✅ **Push the data outward.** The private repo sends what the public site needs, when it changes.

### Flow

```
release-please merges Release PR in unsigned-paas
        │  (GitHub Release published)
        ▼
unsigned-paas release workflow
        │  repository_dispatch  event_type = "platform-release"
        │  payload = { version, date, notes }   ← release-note TEXT, not a private link
        ▼
unsigned-gg/.github/workflows/deploy.yml  (on: repository_dispatch)
        │  write data/release.json  (or template into index.html)
        │  compose artifact → deploy to Cloudflare Pages
        ▼
unsigned.gg shows the new version
```

### Source of truth
release-please output in `unsigned-paas` (`CHANGELOG.md` + GitHub Releases + tags). One source, zero drift. The site never invents version data.

### Rendering on the site (impl choice, left to the ticket)
Two ways to surface the data, both keep the static surfaces framework-free:
1. **Static JSON + tiny JS** — workflow writes `data/release.json`; a few lines of same-origin `fetch` in `index.html` render a "latest release" element. No build step.
2. **Build-time inject** — a small step in `deploy.yml` templates the version straight into `index.html` before composing the artifact. Zero client JS.

Either is fine; pick at implementation. **The site renders carried text only — it must not link back to the private `unsigned-paas` repo.**

### Triggers on `unsigned-gg/deploy.yml`
Keep existing `push: [main]` and `workflow_dispatch`; **add** `repository_dispatch: [platform-release]`.

### Secrets / token
The dispatch from `unsigned-paas` → `unsigned-gg` needs a fine-scoped credential (GitHub App install or PAT) with permission to send a `repository_dispatch` to `unsigned-gg`, stored in the org secret vault and surfaced to Actions — never committed.

---

## Out of scope (future / optional)

- **Live platform status on the site** (current model availability, cluster health): would use a read-only JSON endpoint exposed via Kong/Traefik, fetched client-side. Speculative — not scaffolded now. Tracked as a low-priority future ticket.

---

## Linear tickets

Filed in project **unsigned-paas** (team OPS). See the tickets for acceptance criteria:

- Wire platform release → `repository_dispatch` from `unsigned-paas` (incl. provisioning the dispatch credential).
- Consume the release payload on `unsigned-gg` and render current version.
- CF Pages follow-through (OPS-447): GH Pages decommissioned 2026-07-07; token hygiene items remain.
- *(future)* Live platform status endpoint on the site.
