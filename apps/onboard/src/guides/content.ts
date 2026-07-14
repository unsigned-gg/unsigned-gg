// In-app guides — structured content, bundled at build time. No fetches.
// Facts are sourced from the platform repo (awesome-unsigned/onboarding/*,
// scripts/tenant-provision.sh, helm/security/app-sso/README.md, helm chart
// values); when a doc and this file disagree, the repo doc wins — fix here.

export type GuideSection =
  | { kind: "h2"; text: string; id?: string }
  | { kind: "p"; text: string }
  | { kind: "code"; label?: string; lines: string[] }
  | { kind: "list"; ordered?: boolean; items: string[] }
  | { kind: "callout"; tone: "info" | "warn"; text: string }
  | { kind: "table"; headers: string[]; rows: string[][] };

export interface Guide {
  slug: string;
  title: string;
  purpose: string;
  sections: GuideSection[];
}

// Step slug → in-app guide. Rendered on the step detail page next to learnUrl.
const STEP_GUIDES: Record<string, { guide: string; anchor?: string }> = {
  "access-tailnet": { guide: "access-walkthrough", anchor: "tailnet" },
  "access-keycloak": { guide: "login-sso" },
  "access-namespace": { guide: "tenant-namespace" },
  "access-bastion": { guide: "access-walkthrough", anchor: "bastion" },
  "access-kubeconfig": { guide: "access-walkthrough", anchor: "kubeconfig" },
  "module-access-model": { guide: "cluster-access-paths" },
};

export function guideForStep(stepSlug: string): { guide: Guide; anchor?: string } | null {
  const m = STEP_GUIDES[stepSlug];
  if (!m) return null;
  const guide = GUIDES.find((g) => g.slug === m.guide);
  return guide ? { guide, anchor: m.anchor } : null;
}

export function guideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export const GUIDES: Guide[] = [
  // ── day-one-quest ───────────────────────────────────────────────────────────
  {
    slug: "day-one-quest",
    title: "Day one, end to end",
    purpose: "A guided sequence from a fresh account to proven access to everything. Each step unlocks the next; the last one is how the platform verifies you're live.",
    sections: [
      {
        kind: "p",
        text: "You arrive with credentials staged across several systems. Run these in order — most legs are operator-provisioned, so where a step is blocked it's a ping, not a debug session. Real hostnames, IPs, and your personal values live in the signed-in Reference (they aren't in this public page); the shape of the day is here.",
      },
      { kind: "h2", text: "0. Secure your identity first" },
      {
        kind: "p",
        text: "Log into Google Workspace with your `<you>@cerebral.work` account and the temp password from your secure handoff. You'll be forced to change it — do that, then enroll 2FA immediately. Every downstream login (Keycloak/SSO, the forge) flows through this account.",
      },
      { kind: "callout", tone: "warn", text: "If you're 2SV-enrolled and lose your device, a password reset alone won't get you in — you also need a backup code. Ask your operator for one if you're locked out." },
      { kind: "h2", text: "1. Accept the GitHub org invite" },
      { kind: "p", text: "Accept the invite to the `unsigned-gg` org and publish your SSH public key on your GitHub profile — the bastion trusts `https://github.com/<handle>.keys` at provision time." },
      { kind: "h2", text: "2. Join the tailnet — step: access-tailnet" },
      { kind: "code", lines: ["curl -fsSL https://tailscale.com/install.sh | sh", "sudo tailscale up   # authenticate with your Workspace account"] },
      { kind: "p", text: "Once your device is authenticated and operator-approved, your engineer network grant goes live (it's staged to merge only once your device exists — no dead-letter grants). This step verifies itself from your authenticated, approved device." },
      { kind: "h2", text: "3. Sign in to the platform — step: access-keycloak" },
      { kind: "p", text: "Signing into this app via Keycloak (Google sign-in) IS the proof — the verifier watches login events. Group membership is authorization; if the UI is empty after login, an operator needs to add you to the engineers group. See the login-sso guide." },
      { kind: "h2", text: "4. kubectl against the cluster — step: access-kubeconfig" },
      { kind: "p", text: "You'll receive a kubeconfig (OIDC via Keycloak/Google, reached over the tailnet). First call opens a browser to authenticate; then you should see nodes:" },
      { kind: "code", lines: ["export KUBECONFIG=<your-kubeconfig>", "kubectl get nodes"] },
      { kind: "h2", text: "5. The LLM gateway" },
      { kind: "p", text: "You get a personal, budgeted key for the LLM gateway. Confirm it works, then use any model in the catalog. See the llm-gateway guide." },
      { kind: "code", lines: ["curl https://llm.unsigned.gg/v1/models -H \"Authorization: Bearer $LLM_KEY\""] },
      { kind: "h2", text: "6. First clone from the forge" },
      { kind: "p", text: "Clone from the canonical self-hosted Forgejo (GitHub is mirror-only); the exact host is in the signed-in Reference. The tailnet policy repo is a good first read — it's the file that grants your own access." },
      { kind: "h2", text: "7. Prove access — the closer", id: "proof" },
      { kind: "p", text: "Mint the `access-kubeconfig` challenge on your board and run the printed command — it writes a ConfigMap `onboard-proof-<nonce>` in YOUR `tenant-<you>` namespace. That single artifact proves a working kubeconfig AND your tenant RBAC; the platform marks you verified when it lands." },
      { kind: "callout", tone: "info", text: "You're wired in when the proof ConfigMap exists. Good first pickup: the ArgoCD application tree — that's where the cluster's declarative state lives." },
    ],
  },

  // ── welcome-email ─────────────────────────────────────────────────────────
  {
    slug: "welcome-email",
    title: "Your welcome email, decoded",
    purpose: "What the welcome email covers, and the two things only you can do.",
    sections: [
      { kind: "p", text: "New engineers get one instructions-only welcome email (it never carries a password — credentials come via a separate secure handoff). It summarizes what's been provisioned and points here." },
      { kind: "h2", text: "What it lists" },
      {
        kind: "list",
        items: [
          "Your Google Workspace account (temp password handed over separately).",
          "GitHub org invite (accept it).",
          "A personal LLM gateway key (budgeted).",
          "A tailnet engineer grant, staged to go live once your device joins.",
          "A kubeconfig for the cluster (OIDC, over the tailnet).",
          "Platform sign-in via Keycloak (Google), with group membership added by an operator.",
        ],
      },
      { kind: "h2", text: "The two things only you can do" },
      { kind: "list", ordered: true, items: ["Change your Workspace password and enroll 2FA.", "Accept the GitHub org invite."] },
      { kind: "callout", tone: "info", text: "Everything else chains from those two. Then run the day-one-quest guide in order." },
    ],
  },

  // ── provisioning-overview ───────────────────────────────────────────────────
  {
    slug: "provisioning-overview",
    title: "How provisioning works",
    purpose: "The legs that get provisioned for a new engineer, what each does, and who owns it.",
    sections: [
      { kind: "p", text: "Onboarding runs as a set of independent legs (mirrored from the platform's provisioning pipeline). Most are operator-owed; a couple are self-service. This is the shape — the live per-user values are in the signed-in Reference." },
      {
        kind: "table",
        headers: ["Leg", "What it does", "Owner"],
        rows: [
          ["Keycloak", "Creates your realm identity / maps your Google login; group membership = authorization", "operator"],
          ["Tailnet", "Adds your engineer network grant (staged until your device exists)", "operator (you join the device)"],
          ["LLM key", "Mints your personal, budgeted gateway key", "operator"],
          ["Kubeconfig", "Renders your OIDC kubeconfig for the cluster (context tenant-<you>)", "operator"],
          ["Workspace", "Creates your @cerebral.work account in the members OU", "operator"],
          ["Welcome email", "Instructions-only note pointing you here (no credentials)", "operator"],
        ],
      },
      { kind: "callout", tone: "info", text: "Access closes out when you log into Keycloak, join the tailnet with an approved device, and write the onboard-proof ConfigMap in your tenant namespace (see day-one-quest §7)." },
    ],
  },

  // ── llm-gateway ─────────────────────────────────────────────────────────────
  {
    slug: "llm-gateway",
    title: "The LLM gateway",
    purpose: "Use your personal key against the OpenAI-compatible model gateway.",
    sections: [
      { kind: "p", text: "`https://llm.unsigned.gg/v1` is an OpenAI-compatible gateway fronting many models (Claude, GLM, DeepSeek, Qwen, GPT, Gemini, and more). Every engineer gets a personal key with a spend budget and tags; it comes in your secure handoff, not this page." },
      { kind: "h2", text: "List the catalog" },
      { kind: "code", lines: ["curl https://llm.unsigned.gg/v1/models -H \"Authorization: Bearer $LLM_KEY\" | jq -r '.data[].id'"] },
      { kind: "h2", text: "Chat completion" },
      {
        kind: "code",
        lines: [
          "curl https://llm.unsigned.gg/v1/chat/completions \\",
          "  -H \"Authorization: Bearer $LLM_KEY\" -H 'Content-Type: application/json' \\",
          "  -d '{\"model\":\"claude-sonnet-5\",\"messages\":[{\"role\":\"user\",\"content\":\"ping\"}]}'",
        ],
      },
      { kind: "callout", tone: "warn", text: "It's OpenAI-compatible, so point any SDK at the base URL with your key as the API key. Key management (minting, budgets) is admin-only and not exposed publicly." },
    ],
  },

  // ── a. access-walkthrough ──────────────────────────────────────────────────
  {
    slug: "access-walkthrough",
    title: "Platform access walkthrough",
    purpose: "Zero to a working shell on the bastion and kubectl against the dev cluster.",
    sections: [
      {
        kind: "p",
        text: "Condensed from awesome-unsigned/onboarding/platform-access.md. Each leg maps to an access-track step on your board. There is no prod cluster yet — everything below is the live dev environment.",
      },
      { kind: "h2", text: "0. Prerequisites — operator-provisioned" },
      {
        kind: "p",
        text: "Four of the five access legs are provisioned by an operator (currently `ctodie`), not self-service. Ask for:",
      },
      {
        kind: "list",
        ordered: true,
        items: [
          "GitHub: membership in the `unsigned-gg` org, with your SSH public keys published on your profile.",
          "Tailnet: an invite to the Tailscale tailnet (`<tailnet>.ts.net`), device approval, and an ACL grant for `tag:bastion` (SSH) and `tag:k8s` (admin UIs).",
          "Bastion account: a unix account baked into bastion provisioning. Naming convention: first-letter + lastname (`apramesi` for Aria Pramesi) — it does not have to match your GitHub handle.",
          "Keycloak account: created by an admin in the `unsigned-paas` realm at https://auth.unsigned.gg. Group membership IS authorization.",
          "(Infra work only) credentials for the Terraform state backend (Cloudflare R2), plus your egress IP added to the cluster-API CIDR allowlist.",
        ],
      },
      { kind: "h2", text: "1. Publish your SSH keys on GitHub" },
      {
        kind: "p",
        text: "The bastion fetches `https://github.com/<handle>.keys` at provision time and writes them — and only them — into your `authorized_keys`. No shared keys, no ops account.",
      },
      {
        kind: "code",
        label: "verify what the bastion will trust",
        lines: ["curl -fsSL https://github.com/<your-handle>.keys"],
      },
      {
        kind: "callout",
        tone: "warn",
        text: "If that returns nothing, upload a key at github.com → Settings → SSH keys first, THEN ask for the bastion account — provisioning hard-fails on an empty keyset.",
      },
      { kind: "h2", text: "2. Join the tailnet — step: access-tailnet", id: "tailnet" },
      {
        kind: "code",
        lines: [
          "curl -fsSL https://tailscale.com/install.sh | sh   # or your distro package",
          "sudo tailscale up",
        ],
      },
      {
        kind: "p",
        text: "`tailscale up` prints a login URL — authenticate, then ask the operator to approve the device. Verify:",
      },
      {
        kind: "code",
        lines: [
          "tailscale status            # your device listed and not \"expired\"",
          "ping bastion-dev            # MagicDNS name of the bastion",
        ],
      },
      {
        kind: "p",
        text: "If ping fails, your device is either unapproved or the ACL doesn't grant you `tag:bastion` yet — both are operator-side fixes, nothing to debug locally. The `access-tailnet` step verifies itself once your device is authenticated and approved.",
      },
      { kind: "h2", text: "3. Keycloak login — step: access-keycloak" },
      {
        kind: "p",
        text: "Logging into this app is itself the proof — the verifier watches Keycloak login events. If sign-in fails, see the login-sso guide.",
      },
      { kind: "h2", text: "4. Sandbox namespace — step: access-namespace" },
      {
        kind: "p",
        text: "Operator-owed, batched per cohort — nothing for you to run. Your personal `tenant-<you>` namespace arrives with quota, policies, and your admin role. See the tenant-namespace guide for what's inside.",
      },
      { kind: "h2", text: "5. SSH to the bastion — step: access-bastion", id: "bastion" },
      { kind: "code", lines: ["ssh <your-unix-user>@bastion-dev"] },
      {
        kind: "p",
        text: "There is no public SSH. The bastion closes port 22 to the internet as soon as its tailnet interface comes up; the public IP (`140.82.6.109`) only answers SSH in a documented recovery mode. If you can't SSH, fix your tailnet standing (§2) — retrying against the public IP is expected to fail.",
      },
      {
        kind: "list",
        items: [
          "Auth: key-only, `PermitRootLogin no`, `MaxAuthTries 3`. Tailscale SSH is also enabled, gated by the tailnet ACL.",
          "Privilege: sudo via the `wheel` group — currently `ctodie` and `pgray` only. Login-only accounts with no root are by design.",
          "Tooling: full admin workstation — kubectl, Helm, Terraform, k9s, ArgoCD CLI, bao CLI, Go/Rust/Node/Python, gh, Trivy, Checkov.",
          "Monitoring: fail2ban, auditd, UFW deny-by-default. Treat the box as shared and logged.",
        ],
      },
      {
        kind: "p",
        text: "The `access-bastion` step verifies from your first successful SSH login observed in the bastion's shipped auth log.",
      },
      { kind: "h2", text: "6. Cluster access (kubectl) — step: access-kubeconfig", id: "kubeconfig" },
      {
        kind: "p",
        text: "The dev cluster is VKE (managed control plane). The kubeconfig is a static-credential file exposed as a sensitive Terraform output — not distributed via the bastion, not OIDC-based. With R2 state-backend credentials configured:",
      },
      {
        kind: "code",
        lines: [
          "cd infrastructure/terraform/environments/dev",
          "terraform init -backend-config=backend.hcl",
          "terraform output -raw kubeconfig | base64 -d > ~/.kube/unsigned-paas-dev.yaml",
          "chmod 600 ~/.kube/unsigned-paas-dev.yaml",
          "export KUBECONFIG=~/.kube/unsigned-paas-dev.yaml",
          "",
          "kubectl config use-context unsigned-paas-dev",
          "kubectl get nodes    # expect 3 cpu-pool nodes, Ready",
        ],
      },
      {
        kind: "callout",
        tone: "warn",
        text: "Handle the file like a credential: it grants full cluster access with no per-user identity. Never commit it, never copy it into a repo.",
      },
      {
        kind: "p",
        text: "To verify the step: open `access-kubeconfig` on your board, mint a challenge, and run the printed command — it creates a configmap named `onboard-proof-<nonce>` in YOUR tenant namespace. Two legs, one artifact: a working kubeconfig AND your tenant RBAC.",
      },
      {
        kind: "p",
        text: "Worker nodes are not SSH targets — VKE manages them. Use `kubectl debug node/<name>` or `kubectl exec` instead.",
      },
      { kind: "h2", text: "7. Web UIs" },
      {
        kind: "p",
        text: "Public wildcard `*.dev.unsigned.gg` behind Keycloak, plus tailnet-only admin UIs. Full directory: the platform-map guide.",
      },
      { kind: "h2", text: "Troubleshooting" },
      {
        kind: "table",
        headers: ["symptom", "likely cause", "fix"],
        rows: [
          ["ssh bastion-dev hangs/refused", "Device unapproved or no tag:bastion ACL grant", "Operator approves device / grants ACL"],
          ["SSH to 140.82.6.109 times out", "Working as designed — public 22 is closed", "Use the tailnet"],
          ["SSH auth fails as the right user", "Your GitHub keys changed after provisioning", "Operator re-runs bastion/bootstrap-users.sh"],
          ["sudo: not allowed on bastion", "You're not in wheel", "Intentional; ask if your role needs it"],
          ["kubectl times out", "Egress IP not in allowed_api_cidrs", "Operator adds your CIDR"],
          ["terraform output fails", "No R2 backend creds / terraform init not run", "Prereq 5, then §6"],
          ["OIDC login works, UI is empty", "Keycloak account has no groups", "Admin adds you to the right realm group"],
        ],
      },
    ],
  },

  // ── b. login-sso ──────────────────────────────────────────────────────────
  {
    slug: "login-sso",
    title: "Signing in (Google SSO)",
    purpose: "First login to this app and every SSO-gated platform service.",
    sections: [
      {
        kind: "p",
        text: "Platform identity lives in the Keycloak realm `unsigned-paas` at https://auth.unsigned.gg. Google Workspace sign-in is brokered into that realm, hosted-domain locked to `cerebral.work` — only cerebral.work Workspace accounts may broker in.",
      },
      { kind: "h2", text: "Prerequisites" },
      {
        kind: "list",
        items: [
          "A `cerebral.work` Google Workspace account (Google path), or a Keycloak account created by an admin in the `unsigned-paas` realm (credentials path).",
        ],
      },
      { kind: "h2", text: "Steps" },
      {
        kind: "list",
        ordered: true,
        items: [
          "Open https://onboard.dev.unsigned.gg — you are redirected to Keycloak at auth.unsigned.gg.",
          "Choose Google and pick your `cerebral.work` account.",
          "First Google login only: a one-time profile-completion page asks you to review/confirm your name and email. Submit it once; you won't see it again. Your realm account is created just-in-time and lands in the `member` group — the least-privilege platform tier. `admin` and `operator` are manual, operator-granted promotions.",
          "If prompted to set up OTP, complete it — it's required for realm accounts.",
        ],
      },
      { kind: "h2", text: "Troubleshooting" },
      {
        kind: "callout",
        tone: "warn",
        text: "\"We are sorry… Restart login cookie not found\" — a stale tab. The login flow in that tab has expired. Do NOT click \"Back to Application\". Open a fresh tab to https://onboard.dev.unsigned.gg and sign in from there.",
      },
      {
        kind: "list",
        items: [
          "Google account rejected: the broker only accepts `cerebral.work` identities — other Google accounts cannot enter the realm.",
          "Login works but a service shows you nothing: the account is fine and the group is missing. Group membership IS authorization — ask an admin to add you to the right realm group.",
        ],
      },
    ],
  },

  // ── c. tenant-namespace ───────────────────────────────────────────────────
  {
    slug: "tenant-namespace",
    title: "Your tenant namespace",
    purpose: "What tenant-<you> gives you, and how to prove your kubeconfig reaches it.",
    sections: [
      {
        kind: "p",
        text: "Your sandbox is the namespace `tenant-<you>`, rendered by the `tenant` Helm chart and provisioned by the operator (`scripts/tenant-provision.sh <slug>` covers the external systems that can't be GitOps'd). It's operator-owed and batched per cohort — you wait, then you build.",
      },
      { kind: "h2", text: "What provisioning creates" },
      {
        kind: "list",
        items: [
          "OpenBao: a read-only policy scoped to `secret/data/tenants/<you>/*` and a Kubernetes-auth role `tenant-<you>` bound to ServiceAccount `tenant-<you>-eso` — the auth leg for the namespace's own SecretStore `tenant-<you>-openbao`.",
          "Harbor: a private project `tenant-<you>` plus a project-scoped pull robot; its credential is seeded directly into OpenBao at `secret/tenants/<you>/harbor-pull` (fields: username/password/registry) — never printed.",
          "Namespace guardrails from the chart: default-deny NetworkPolicy with additive egress toggles (DNS, Harbor, OpenBao, cluster API), a ResourceQuota (defaults: 4 CPU / 8Gi requests, 8 CPU / 16Gi limits, 50 pods; per-tenant overlays may reduce this), a LimitRange (defaultRequest 50m CPU / 64Mi), and two Kyverno ValidatingPolicies shipped Audit-only.",
          "Your admin Role in the namespace — you can create workloads, configmaps, secrets inside `tenant-<you>`, nothing outside it.",
        ],
      },
      { kind: "h2", text: "Once it exists" },
      {
        kind: "code",
        label: "look around your namespace",
        lines: [
          "kubectl -n tenant-<you> get resourcequota,limitrange",
          "kubectl -n tenant-<you> get networkpolicy",
        ],
      },
      {
        kind: "p",
        text: "Pull secrets for workloads come via ExternalSecret against the namespaced SecretStore — see the harbor-pull guide. GPU quota is disabled by default; it's enabled per-tenant only.",
      },
      { kind: "h2", text: "The onboard-proof challenge (step: access-kubeconfig)" },
      {
        kind: "list",
        ordered: true,
        items: [
          "Open the `access-kubeconfig` step on your board and mint a challenge. It hands you a single-use nonce and the exact command.",
          "Run the printed command with YOUR kubeconfig — it creates a configmap named `onboard-proof-<nonce>` in `tenant-<you>`.",
          "The onboard API watches configmaps in tenant namespaces, matches the nonce, and marks the step verified. It then deletes the proof configmap — cleanup is automatic.",
        ],
      },
      {
        kind: "callout",
        tone: "info",
        text: "The configmap must land in your OWN tenant namespace. A challenge created in a foreign namespace is rejected and the nonce is preserved — mint once, run once, in the right place. Creating it proves two legs at once: a working kubeconfig AND your tenant RBAC.",
      },
    ],
  },

  // ── d. harbor-pull ────────────────────────────────────────────────────────
  {
    slug: "harbor-pull",
    title: "Pulling images from Harbor",
    purpose: "Consume your tenant's pull robot in a workload, and docker login for local dev.",
    sections: [
      {
        kind: "p",
        text: "Provisioning seeds a project-scoped pull robot for `harbor.dev.unsigned.gg/tenant-<you>` into OpenBao at `secret/tenants/<you>/harbor-pull` (fields: username, password, registry). Workloads consume it as a `kubernetes.io/dockerconfigjson` Secret materialized by an ExternalSecret — no credential ever lands in git.",
      },
      { kind: "h2", text: "Prerequisites" },
      {
        kind: "list",
        items: [
          "Your tenant namespace exists and `scripts/tenant-provision.sh <you>` has run (the SecretStore `tenant-<you>-openbao` shows Ready).",
          "An image pushed to `harbor.dev.unsigned.gg/tenant-<you>/<app>:<tag>` — pinned tags only, never `latest`.",
        ],
      },
      { kind: "h2", text: "1. ExternalSecret → pull Secret" },
      {
        kind: "p",
        text: "Pattern mirrors `gitops/pact/pact-harbor-pull-externalsecret.yaml`, with two tenant-specific changes: reference your NAMESPACED SecretStore (never the cluster-wide `vault-openbao` ClusterSecretStore — the tenant store is the isolation gate), and template the dockerconfigjson from the robot's username/password/registry fields.",
      },
      {
        kind: "code",
        label: "harbor-pull-externalsecret.yaml (replace <you>)",
        lines: [
          "apiVersion: external-secrets.io/v1",
          "kind: ExternalSecret",
          "metadata:",
          "  name: <you>-harbor-pull",
          "  namespace: tenant-<you>",
          "spec:",
          "  refreshInterval: 1h",
          "  secretStoreRef:",
          "    name: tenant-<you>-openbao",
          "    kind: SecretStore",
          "  target:",
          "    name: <you>-harbor-pull",
          "    creationPolicy: Owner",
          "    deletionPolicy: Retain",
          "    template:",
          "      type: kubernetes.io/dockerconfigjson",
          "      data:",
          "        .dockerconfigjson: |",
          "          {\"auths\":{\"{{ .registry }}\":{\"username\":\"{{ .username }}\",\"password\":\"{{ .password }}\",\"auth\":\"{{ printf \"%s:%s\" .username .password | b64enc }}\"}}}",
          "  data:",
          "    - secretKey: username",
          "      remoteRef: {key: tenants/<you>/harbor-pull, property: username}",
          "    - secretKey: password",
          "      remoteRef: {key: tenants/<you>/harbor-pull, property: password}",
          "    - secretKey: registry",
          "      remoteRef: {key: tenants/<you>/harbor-pull, property: registry}",
        ],
      },
      {
        kind: "callout",
        tone: "warn",
        text: "Owner-GC footgun: deleting an ExternalSecret with `creationPolicy: Owner` garbage-collects its target Secret. `deletionPolicy: Retain` keeps the data on remote-read failures, not on ExternalSecret deletion — don't delete the ExternalSecret casually.",
      },
      { kind: "h2", text: "2. Reference it in the Deployment" },
      {
        kind: "code",
        lines: [
          "spec:",
          "  template:",
          "    spec:",
          "      imagePullSecrets:",
          "        - name: <you>-harbor-pull",
          "      containers:",
          "        - name: app",
          "          image: harbor.dev.unsigned.gg/tenant-<you>/<app>:<tag>",
        ],
      },
      { kind: "h2", text: "3. Local dev: docker login" },
      {
        kind: "code",
        lines: [
          "docker login harbor.dev.unsigned.gg",
          "# Username: your Keycloak username (robot account tokens for CI)",
        ],
      },
      { kind: "h2", text: "Troubleshooting" },
      {
        kind: "list",
        items: [
          "Secret never materializes: check the SecretStore — `kubectl -n tenant-<you> get secretstore` — NotReady means provisioning hasn't run for your slug yet (harmless, operator-side).",
          "ImagePullBackOff with the secret present: robots are project-scoped — the tenant robot pulls `tenant-<you>/*` only, not `platform/*` or other projects.",
        ],
      },
    ],
  },

  // ── e. app-sso-optin ──────────────────────────────────────────────────────
  {
    slug: "app-sso-optin",
    title: "Putting an app behind SSO",
    purpose: "Opt a tenant app into the shared oauth2-proxy ForwardAuth gate — no app-side OIDC code.",
    sections: [
      {
        kind: "p",
        text: "One oauth2-proxy per zone (`app-sso-unsigned` for `.dev.unsigned.gg`, SSO host sso.dev.unsigned.gg, realm `unsigned-paas`); apps opt in by referencing a Traefik middleware. No per-app proxy deployments. Release names are load-bearing: middlewares are named `<release>-<policy>`.",
      },
      { kind: "h2", text: "Prerequisites" },
      {
        kind: "list",
        items: [
          "The app-sso release for your zone is live BEFORE your instance syncs — a missing middleware fails the whole route.",
          "Your app is reachable on a `*.dev.unsigned.gg` host via IngressRoute or the pwa-host chart.",
        ],
      },
      { kind: "h2", text: "1a. pwa-host instances: two values lines" },
      {
        kind: "code",
        lines: ["sso:", "  enabled: true", "  policy: sso   # or sso-admin"],
      },
      {
        kind: "p",
        text: "Tenant apps get the gate STANDARD-ON; an instance values file opting out is the audited exception.",
      },
      { kind: "h2", text: "1b. Other charts: middleware ref on the IngressRoute" },
      {
        kind: "code",
        label: "two literal lines on the route (or unsigned-lib.ssoMiddlewareRef, lib ≥ 0.3.0)",
        lines: [
          "middlewares:",
          "  - name: app-sso-unsigned-sso     # or -sso-admin",
          "    namespace: app-sso",
        ],
      },
      { kind: "h2", text: "2. Pick the policy" },
      {
        kind: "table",
        headers: ["policy", "grants"],
        rows: [
          ["sso", "any authenticated realm user"],
          ["sso-admin", "realm group `admin` only"],
        ],
      },
      {
        kind: "p",
        text: "New policies (e.g. per-tenant groups) are values entries in the app-sso chart — each renders a chain + forwardAuth pair; group gating uses `/oauth2/auth?allowed_groups=…`.",
      },
      { kind: "h2", text: "How the flow works" },
      {
        kind: "p",
        text: "Traefik consults `GET /oauth2/auth` per request: a valid zone cookie gets 202 plus `X-Auth-Request-{User,Email,Groups}` headers forwarded to your app; otherwise the 401 is rewritten into a 302 to the SSO host → Keycloak → callback → zone-scoped cookie (`.dev.unsigned.gg`) → redirect back. One login spans the zone.",
      },
      { kind: "h2", text: "Verify after deploy" },
      {
        kind: "list",
        ordered: true,
        items: [
          "`curl -I https://<your-app-host>/` unauthenticated → 302 to the SSO host.",
          "Browser login → app loads; check the `X-Auth-Request-*` headers reach the app.",
          "An `sso-admin`-gated route rejects a non-member (403) after login.",
          "Cookie domain is the zone apex (`.dev.unsigned.gg`), `Secure`, `SameSite=Lax`.",
        ],
      },
      {
        kind: "callout",
        tone: "warn",
        text: "Opt-out is silent: removing the middleware ref makes the app public again with no error anywhere. State it explicitly in any gate-change brief.",
      },
    ],
  },

  // ── f. cluster-access-paths ───────────────────────────────────────────────
  {
    slug: "cluster-access-paths",
    title: "Cluster access paths",
    purpose: "Which door for which surface: tailnet, SSO, bastion, kubeconfig.",
    sections: [
      {
        kind: "p",
        text: "Two exposure tiers plus a direct API path. Public web UIs ride the `*.dev.unsigned.gg` wildcard behind Keycloak SSO; admin/observability UIs are tailnet-only; the Kubernetes API is a static kubeconfig behind a CIDR allowlist.",
      },
      { kind: "h2", text: "The three doors" },
      {
        kind: "table",
        headers: ["surface", "gate", "you need"],
        rows: [
          ["Web UIs (*.dev.unsigned.gg)", "Keycloak SSO (realm unsigned-paas)", "Realm account + the right group"],
          ["Admin UIs (*.<tailnet>.ts.net) + bastion SSH", "Tailnet ACL", "Approved device + tag grant"],
          ["Kubernetes API (6443)", "CIDR allowlist + static kubeconfig", "R2 state creds, allowlisted egress IP"],
        ],
      },
      { kind: "h2", text: "Tailnet-gated" },
      {
        kind: "list",
        items: [
          "Bastion SSH: `ssh <your-unix-user>@bastion-dev` — tailnet-only, no public SSH (recovery mode excepted).",
          "Grafana `grafana.<tailnet>.ts.net`, Prometheus `prometheus.<tailnet>.ts.net`, Alertmanager `alertmanager.<tailnet>.ts.net`, Loki `loki.<tailnet>.ts.net` (API; explore via Grafana), OpenBao admin `openbao.<tailnet>.ts.net` — deliberately NOT on the public wildcard.",
        ],
      },
      { kind: "h2", text: "SSO-gated (public wildcard)" },
      {
        kind: "p",
        text: "ArgoCD, Harbor, the Control Panel, kagent, onboard — Keycloak OIDC, groups mapped to roles. Apps opt in via the shared app-sso gate (see the app-sso-optin guide) or their own OIDC client. Full list with URLs: the platform-map guide.",
      },
      { kind: "h2", text: "Bastion → kubeconfig" },
      {
        kind: "p",
        text: "The bastion is a fully-tooled admin workstation, but the kubeconfig does NOT come from it — it's a sensitive Terraform output from the R2-backed state:",
      },
      {
        kind: "code",
        lines: [
          "ssh <your-unix-user>@bastion-dev",
          "",
          "cd infrastructure/terraform/environments/dev",
          "terraform init -backend-config=backend.hcl",
          "terraform output -raw kubeconfig | base64 -d > ~/.kube/unsigned-paas-dev.yaml",
          "chmod 600 ~/.kube/unsigned-paas-dev.yaml",
          "export KUBECONFIG=~/.kube/unsigned-paas-dev.yaml",
          "kubectl config use-context unsigned-paas-dev",
        ],
      },
      {
        kind: "p",
        text: "Keycloak protects the web UIs, not `kubectl` — the kubeconfig uses VKE's static credentials; there is no oidc-login/krew step. A `kubectl` timeout from a new location means your egress IP isn't in `allowed_api_cidrs` — operator change, not a client problem.",
      },
      { kind: "h2", text: "The control panel" },
      {
        kind: "p",
        text: "`https://ccp.dev.unsigned.gg` — Cluster Control Panel: React PWA frontend + Go API on one host (`/api` → the API, everything else → the app shell), Keycloak OIDC (client `cluster-control-panel`). Your read-only window into cluster state when you don't want to reach for kubectl.",
      },
      { kind: "h2", text: "What does NOT exist" },
      {
        kind: "list",
        items: [
          "No prod cluster — `v1.0.0` GA is the first production milestone.",
          "Teleport is scaffolded and disabled; Tailscale is the access plane.",
          "No GPU nodes yet — charts are ready, substrate decision pending.",
          "No self-service: tailnet devices, bastion accounts, Keycloak users, and API allowlist entries are all operator-provisioned.",
        ],
      },
    ],
  },

  // ── g. platform-map ───────────────────────────────────────────────────────
  {
    slug: "platform-map",
    title: "Platform map",
    purpose: "Every service, its URL, and which door it's behind.",
    sections: [
      {
        kind: "p",
        text: "Dev environment service directory. SSO = Keycloak realm `unsigned-paas` (groups decide what you see); tailnet = approved Tailscale device with the right ACL tag; operator-only = exists, but not an engineer surface.",
      },
      { kind: "h2", text: "Public wildcard — *.dev.unsigned.gg" },
      {
        kind: "table",
        headers: ["service", "url", "auth", "purpose"],
        rows: [
          ["Keycloak", "https://auth.unsigned.gg", "Keycloak credentials + OTP / Google", "Identity provider — realm unsigned-paas"],
          ["ArgoCD", "https://argo.dev.unsigned.gg", "SSO (groups → roles)", "GitOps — every deploy goes through it"],
          ["Harbor", "https://harbor.dev.unsigned.gg", "SSO / robot accounts", "Registry — images + Helm charts"],
          ["Control Panel", "https://ccp.dev.unsigned.gg", "SSO", "Cluster state PWA (Go API + React)"],
          ["onboard", "https://onboard.dev.unsigned.gg", "SSO (PKCE SPA)", "This app — onboarding tracks + verifiers"],
          ["kagent", "https://kagent.dev.unsigned.gg", "SSO", "In-cluster AI agents"],
          ["OpenBao", "https://bao.dev.unsigned.gg", "token / OIDC", "Secrets — backing store for ESO"],
          ["SSO gate", "https://sso.dev.unsigned.gg", "n/a (is the gate)", "oauth2-proxy ForwardAuth endpoint for the zone"],
        ],
      },
      { kind: "h2", text: "Tailnet-only — *.<tailnet>.ts.net" },
      {
        kind: "table",
        headers: ["service", "url", "auth", "purpose"],
        rows: [
          ["Grafana", "https://grafana.<tailnet>.ts.net", "tailnet + SSO", "Dashboards; Loki via Explore"],
          ["Prometheus", "https://prometheus.<tailnet>.ts.net", "tailnet", "Metrics"],
          ["Alertmanager", "https://alertmanager.<tailnet>.ts.net", "tailnet", "Alert routing"],
          ["Loki", "https://loki.<tailnet>.ts.net", "tailnet", "Log API (use Grafana to explore)"],
          ["OpenBao (admin)", "https://openbao.<tailnet>.ts.net", "tailnet + token", "OpenBao admin surface"],
          ["Bastion", "ssh <you>@bastion-dev", "tailnet + your GitHub keys", "Tooled admin workstation"],
        ],
      },
      {
        kind: "callout",
        tone: "info",
        text: "Container registry login for local dev: `docker login harbor.dev.unsigned.gg` — Keycloak username, robot tokens for CI. If a UI logs you in but shows nothing, your account is fine and the group is missing.",
      },
    ],
  },
];
