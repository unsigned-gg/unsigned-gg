/* unsigned/learn — no build, no framework, no dependencies.
   Design canon: ../.impeccable.md */
'use strict';

/* ---------- tiny utils ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- gate state ---------- */
const GATE_KEY = 'unsigned.learn.gate.v1';
const gate = {
  read() { try { return JSON.parse(localStorage.getItem(GATE_KEY)) || {}; } catch { return {}; } },
  set(step) { const s = this.read(); s[step] = Date.now(); localStorage.setItem(GATE_KEY, JSON.stringify(s)); onGateChange(); },
  reset() { localStorage.removeItem(GATE_KEY); onGateChange(); },
  get bits() { const s = this.read(); return ['ts','ssh','kc'].map(k => !!s[k]); },
  get done() { return this.bits.every(Boolean); },
};

/* Validators check the SHAPE of real command output. This is a training
   gate, not a security control — enforcement lives in the tailnet ACL. */
const validators = {
  ts(text) {
    if (!text.trim()) return { ok: false, msg: 'empty paste — run the command first.' };
    // tailnet addresses live in CGNAT space 100.64.0.0/10
    const ips = text.match(/\b100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}\b/g);
    if (!ips) return { ok: false, msg: 'no tailnet address found. expected at least one 100.64.0.0/10 IP — is tailscale up?' };
    if (/Logged out|stopped/i.test(text)) return { ok: false, msg: 'tailscaled reports logged out / stopped. run `sudo tailscale up` and authenticate.' };
    return { ok: true, msg: `tailnet address ${ips[0]} acknowledged. ${ips.length} device${ips.length > 1 ? 's' : ''} visible.` };
  },
  ssh(text) {
    if (!text.trim()) return { ok: false, msg: 'empty paste — run the two commands on the bastion.' };
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const host = lines.find(l => /^bastion-[a-z0-9][a-z0-9-]*$/.test(l));
    if (!host) return { ok: false, msg: 'no `bastion-<env>` hostname line found. run `hostname` ON the bastion, not your laptop.' };
    const user = lines.find(l => l !== host && !/^bastion-/.test(l) && /^[a-z_][a-z0-9_-]{0,31}$/.test(l));
    if (!user) return { ok: false, msg: 'no username line found. include the output of `id -un`.' };
    if (user === 'root') return { ok: false, msg: 'root login is disabled on the bastion — that output is not from this box.' };
    if (user === 'ubuntu') return { ok: false, msg: '`ubuntu` is not an interactive account here. use YOUR user.' };
    return { ok: true, msg: `${user}@${host} — shell acknowledged.` };
  },
  kc(text) {
    if (!text.trim()) return { ok: false, msg: 'empty paste — run `kubectl get nodes` first.' };
    if (/No resources found|connection refused|Unable to connect|error:/i.test(text)) return { ok: false, msg: 'that looks like an error, not a node list. check the access tutorial: API allowlist or kubeconfig path.' };
    if (!/^NAME\s+STATUS\s+ROLES/m.test(text)) return { ok: false, msg: 'expected the `kubectl get nodes` table header (NAME STATUS ROLES ...).' };
    const ready = (text.match(/\bReady\b/g) || []).length;
    if (!ready) return { ok: false, msg: 'no Ready nodes in that output.' };
    return { ok: true, msg: `${ready} Ready node${ready > 1 ? 's' : ''}. kubeconfig confirmed.` };
  },
};

/* ---------- routes ---------- */
/* locked: requires the gate. t: target-stage (designed, not deployed). */
const ROUTES = [
  { id: 'home',    hex: '',     title: 'overview',            group: null,      locked: false, hidden: true },
  { id: 'gate',    hex: '0x00', title: 'the gate',            group: 'boot',    locked: false },
  { id: 'access',  hex: '0x01', title: 'access model',        group: 'boot',    locked: false },
  { id: 'gitops',  hex: '0x02', title: 'gitops deploys',      group: 'platform', locked: true },
  { id: 'ingress', hex: '0x03', title: 'ingress + tls',       group: 'platform', locked: true },
  { id: 'secrets', hex: '0x04', title: 'secrets',             group: 'platform', locked: true },
  { id: 'policy',  hex: '0x05', title: 'admission policy',    group: 'platform', locked: true },
  { id: 'observ',  hex: '0x06', title: 'observability',       group: 'platform', locked: true },
  { id: 'auth',    hex: '0x07', title: 'identity',            group: 'platform', locked: true },
  { id: 'builds',  hex: '0x08', title: 'daemonless builds',   group: 'platform', locked: true },
  { id: 'gpu',     hex: '0x09', title: 'gpu scheduling',      group: 'platform', locked: true, t: true },
  { id: 'infer',   hex: '0x0a', title: 'inference serving',   group: 'platform', locked: true, t: true },
  { id: 'substrate', hex: '0x0b', title: 'dual substrate',    group: 'platform', locked: true, t: true },
  { id: 'dash',    hex: '0x10', title: 'cluster monitor',     group: 'instruments', locked: true },
  { id: 'cost',    hex: '0x11', title: 'cost engineering',    group: 'instruments', locked: true },
];
const GROUPS = { boot: 'BOOT SEQUENCE', platform: 'PLATFORM', instruments: 'INSTRUMENTS' };
const order = ROUTES.filter(r => !r.hidden).map(r => r.id);

/* ---------- generic step-through sequence player ---------- */
function seqPanel({ title, stages, playLabel = 'play sequence' }) {
  const rows = stages.map((s, i) => `
    <div class="seq-stage" data-i="${i}">
      <div class="seq-node" role="img" aria-label="${esc(s.node)}"><span class="t">${esc(s.tag)}</span>${esc(s.node)}</div>
      <div class="seq-arrow" aria-hidden="true">${i < stages.length - 1 ? '│' : ' '}</div>
      <div class="seq-note">${s.note}</div>
    </div>`).join('');
  return `
  <div class="panel" data-seq>
    <div class="panel-bar">${esc(title)}<span class="spacer"></span>
      <button class="btn" data-play>${esc(playLabel)}</button>
      <button class="btn ghost" data-reset-seq>reset</button>
    </div>
    <div class="panel-body"><div class="seq">${rows}</div></div>
  </div>`;
}
function wireSeq(root) {
  $$('[data-seq]', root).forEach(panel => {
    const stages = $$('.seq-stage', panel);
    let timer = null;
    const reset = () => { clearTimeout(timer); stages.forEach(st => { $('.seq-node', st).classList.remove('on', 'err'); $('.seq-note', st).classList.remove('on'); }); };
    const light = (i) => {
      if (i >= stages.length) return;
      $('.seq-node', stages[i]).classList.add('on');
      $('.seq-note', stages[i]).classList.add('on');
      timer = setTimeout(() => light(i + 1), REDUCED ? 0 : 650);
    };
    $('[data-play]', panel).addEventListener('click', () => { reset(); light(0); });
    $('[data-reset-seq]', panel).addEventListener('click', reset);
    // click any stage to light up to that point
    stages.forEach((st, i) => st.addEventListener('click', () => { reset(); for (let k = 0; k <= i; k++) { $('.seq-node', stages[k]).classList.add('on'); $('.seq-note', stages[k]).classList.add('on'); } }));
  });
}

const sot = (lines) => `<div class="sot"><b>SOURCE OF TRUTH</b><br>${lines.map(esc).join('<br>')}</div>`;
const targetBadge = `<span class="badge-t" title="designed and chart-complete; not deployed on the dev cluster">TARGET</span>`;

/* ---------- views ---------- */
const views = {

  home: () => `
    <div class="crumb"><span class="addr">unsigned/learn</span> · interactive platform explainers</div>
    <h1>Learn the platform by operating it.</h1>
    <p class="lede">Eleven interactive explainers covering every major subsystem of the unsigned
    platform — locked behind a three-step boot sequence that proves you can actually reach it:
    tailnet up, bastion shell, working kubeconfig.</p>
    <div class="panel"><div class="panel-body">
      <p style="margin-top:0"><strong>Why a gate?</strong> Reading about a platform you can't touch
      is trivia. The gate makes you finish the access setup first, so every explainer after it is
      something you can immediately try. It validates the <em>shape</em> of your command output in
      your browser — nothing you paste leaves this page.</p>
      <button class="btn" data-nav="gate">begin boot sequence →</button>
      <span class="foot-note" style="margin-left:14px">3 steps · ~15 minutes if your operator pre-provisioned you</span>
    </div></div>
    <h2>What's inside</h2>
    <ul>
      <li><strong>Boot</strong> — the access model: tailnet, bastion, cluster API.</li>
      <li><strong>Platform</strong> — GitOps deploys, ingress/TLS, secrets, admission policy, observability, identity, daemonless builds — plus three <span class="badge-t">TARGET</span> explainers for GPU scheduling, inference serving, and the dual-substrate plan.</li>
      <li><strong>Instruments</strong> — a coarse live cluster monitor and an interactive cost model.</li>
    </ul>
    <p class="foot-note">keyboard-first: <kbd>⌘K</kbd> command bar · <kbd>[</kbd> <kbd>]</kbd> prev/next · <kbd>?</kbd> all keys</p>`,

  gate: () => {
    const [b1, b2, b3] = gate.bits;
    const s = gate.read();
    const step = (key, n, title, done, body) => `
      <details class="gate-step ${done ? 'done' : ''}" ${!done && gate.bits.filter(Boolean).length === n - 1 ? 'open' : ''}>
        <summary><span class="num">${done ? '✓' : '0' + n}</span><span class="st-title">${title}</span>
        <span class="st-state">${done ? 'VERIFIED ' + new Date(s[key]).toISOString().slice(0, 10) : 'PENDING'}</span></summary>
        <div class="st-body">${body}</div>
      </details>`;
    return `
    <div class="crumb"><span class="addr">0x00</span> · boot sequence</div>
    <h1>The gate.</h1>
    <p class="lede">Three bits. Set all three by pasting real command output — the page checks its
    shape locally and stores progress in your browser. No paste ever leaves this page.</p>
    <div class="bitfield" aria-label="gate progress: ${gate.bits.filter(Boolean).length} of 3 bits set">
      <div class="bit ghost" title="sign bit: absent. as intended.">s</div>
      <div class="bit ${b3 ? 'set' : ''}">${b3 ? 1 : 0}</div>
      <div class="bit ${b2 ? 'set' : ''}">${b2 ? 1 : 0}</div>
      <div class="bit ${b1 ? 'set' : ''}">${b1 ? 1 : 0}</div>
    </div>
    <div class="bitfield-label">${gate.done
      ? '<span class="g">0x7 — all bits set. platform unlocked.</span> sign bit: absent. as intended.'
      : `progress: 0x${gate.bits.filter(Boolean).length === 2 ? '3' : gate.bits.filter(Boolean).length === 1 ? '1' : '0'} of 0x7 · the dashed slot is where a sign bit would go. we don't carry one.`}</div>

    ${step('ts', 1, 'Join the tailnet', b1, `
      <p>Everything human-facing rides the tailnet — there is <strong>no public SSH anywhere</strong>.
      Your operator sends the invite and approves your device; you bring the client:</p>
      <pre><span class="c"># install, then authenticate via the printed URL</span>
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
tailscale status<button class="copy-btn">copy</button></pre>
      <p>Paste the output of <code>tailscale status</code>:</p>
      <textarea data-v="ts" aria-label="paste tailscale status output" placeholder="100.x.y.z   your-machine   you@…   linux   -"></textarea>
      <div class="verdict" data-verdict="ts" role="status"></div>
      <p style="margin-top:14px"><button class="btn" data-check="ts">verify</button></p>`)}

    ${step('ssh', 2, 'Shell on the bastion', b2, `
      <p>The bastion is a hardened, fully-tooled admin box. Key-only auth, per-user accounts
      seeded from <em>your</em> GitHub keys, allowlisted users, sudo for a named few. SSH to it
      over the tailnet — the public IP does not answer:</p>
      <pre>ssh &lt;your-unix-user&gt;@bastion-&lt;env&gt;
<span class="c"># then, on the bastion:</span>
hostname &amp;&amp; id -un<button class="copy-btn">copy</button></pre>
      <p>Paste those two output lines:</p>
      <textarea data-v="ssh" aria-label="paste bastion hostname and username" placeholder="bastion-dev&#10;you"></textarea>
      <div class="verdict" data-verdict="ssh" role="status"></div>
      <p style="margin-top:14px"><button class="btn" data-check="ssh">verify</button></p>`)}

    ${step('kc', 3, 'Working kubeconfig', b3, `
      <p>The kubeconfig is a <strong>sensitive Terraform output</strong>, pulled from remote state —
      not distributed by hand, not OIDC. Treat the file like a credential (<code>chmod 600</code>,
      never commit it):</p>
      <pre>cd infrastructure/terraform/environments/&lt;env&gt;
terraform init -backend-config=backend.hcl
terraform output -raw kubeconfig | base64 -d &gt; ~/.kube/&lt;env&gt;.yaml
chmod 600 ~/.kube/&lt;env&gt;.yaml
KUBECONFIG=~/.kube/&lt;env&gt;.yaml kubectl get nodes<button class="copy-btn">copy</button></pre>
      <p>Paste the <code>kubectl get nodes</code> output:</p>
      <textarea data-v="kc" aria-label="paste kubectl get nodes output" placeholder="NAME        STATUS   ROLES    AGE   VERSION"></textarea>
      <div class="verdict" data-verdict="kc" role="status"></div>
      <p style="margin-top:14px"><button class="btn" data-check="kc">verify</button></p>`)}

    ${gate.done ? `<div class="panel"><div class="panel-body">
      <p style="margin:0"><strong>Unlocked.</strong> Every explainer and instrument is now open.
      Start with <a href="#/gitops">0x02 gitops deploys</a> — it's how everything ships.</p>
    </div></div>` : ''}
    <p class="foot-note">honesty note: this is a training gate, not a security control. real enforcement
    is the tailnet ACL, the sshd allowlist, and the API firewall — which is exactly why the gate makes
    you touch all three. <button class="btn ghost" data-gate-reset style="margin-left:8px">reset gate</button></p>
    ${sot(['infrastructure/terraform/modules/bastion/main.tf  (sshd + tailscale enrollment)',
           'infrastructure/terraform/modules/networking/main.tf  (API + SSH firewall)',
           'awesome-unsigned/onboarding/platform-access.md  (full tutorial, private repo)'])}`;
  },

  access: () => `
    <div class="crumb"><span class="addr">0x01</span> · boot sequence</div>
    <h1>Access model.</h1>
    <p class="lede">Three doors, one rule: humans ride the tailnet. The public internet sees TLS on
    443 and nothing else it can use.</p>
    ${seqPanel({ title: 'A REQUEST FOR SHELL — WHAT ACTUALLY HAPPENS', stages: [
      { tag: 'YOU', node: 'laptop · tailscale client', note: 'device authenticated to the tailnet, approved by an operator. identity comes from the IdP; MFA and key expiry live there.' },
      { tag: 'ACL', node: 'tailnet ACL', note: 'grants are explicit: your identity → <code>tag:bastion</code>. no grant, no route — the packet never leaves the overlay.' },
      { tag: 'HOST', node: 'bastion-<env>', note: 'public :22 was deleted the moment the tailnet came up. sshd re-checks: key-only, allowlisted users, 3 auth tries.' },
      { tag: 'PRIV', node: 'wheel group', note: 'login ≠ root. sudo is a separate, named grant — some accounts are deliberately shell-only.' },
    ]})}
    <h2>The three doors</h2>
    <ul>
      <li><strong>Tailnet</strong> — the human network layer. Admin UIs that would be reckless on the public wildcard (metrics, secret store) are exposed as tailnet-only services.</li>
      <li><strong>Bastion</strong> — a fully-tooled workstation (kubectl, helm, terraform, k9s, the works), not a thin jump box. Per-user accounts seeded from each user's GitHub keys.</li>
      <li><strong>Cluster API</strong> — port 6443 behind a CIDR allowlist; the kubeconfig is a sensitive Terraform output. Worker nodes take no SSH at all — <code>kubectl debug</code> is the path.</li>
    </ul>
    <h2>What deliberately doesn't exist</h2>
    <ul>
      <li>Public SSH. Shared accounts. Passwords.</li>
      <li>Self-service enrollment — every leg (tailnet device, bastion account, IdP user, API allowlist) is operator-granted.</li>
      <li>A prod cluster (yet) — one dev cluster is the whole world until v1.0.0 GA.</li>
    </ul>
    ${sot(['infrastructure/terraform/modules/bastion/main.tf', 'helm/access/tailscale/  (operator chart)', 'feature-flags.yaml  (access.teleport: false — tailscale is the plane)'])}`,

  gitops: () => `
    <div class="crumb"><span class="addr">0x02</span> · platform</div>
    <h1>GitOps deploys.</h1>
    <p class="lede">ArgoCD doesn't watch this repo's file tree. It watches a chart registry, and
    deploys exactly the version an ApplicationSet pins. Shipping is a <em>triple</em>, and CI
    refuses partial triples.</p>
    ${seqPanel({ title: 'ONE CHANGE, COMMIT → CLUSTER', stages: [
      { tag: 'GIT', node: 'PR merged to main', note: 'chart change lands with a <code>Chart.yaml</code> version bump. main is PR-required — nothing lands directly.' },
      { tag: 'CI', node: 'lint · test · scan · build', note: 'daemonless image build, trivy/checkov scans, per-chart version gate.' },
      { tag: 'OCI', node: 'chart → registry', note: 'the chart is published as an OCI artifact. images are pinned tags — <code>latest</code> is a lint failure.' },
      { tag: 'PIN', node: 'AppSet chartVersion', note: 'the ApplicationSet entry pins the new version. no pin update = no deploy, ever.' },
      { tag: 'SYNC', node: 'ArgoCD reconcile', note: 'server-side apply reconciles the cluster to the pinned chart. some app groups auto-sync; sensitive ones are manually gated.' },
    ]})}
    <div class="panel"><div class="panel-bar">BREAK THE TRIPLE — SEE WHAT SHIPS</div><div class="panel-body">
      <div class="toggle-row"><button class="switch" role="switch" aria-checked="true" data-triple="bump"></button><label>Chart.yaml version bumped</label></div>
      <div class="toggle-row"><button class="switch" role="switch" aria-checked="true" data-triple="pin"></button><label>AppSet chartVersion pin updated</label></div>
      <div class="toggle-row"><button class="switch" role="switch" aria-checked="true" data-triple="push"></button><label>chart published to the registry</label></div>
      <div class="verdict ok" data-triple-verdict role="status">✓ triple complete — the new version deploys on next sync.</div>
    </div></div>
    <h2>Why a pin and not "track main"?</h2>
    <p>Pins make deploys <strong>deliberate and diffable</strong>: the cluster state is exactly the
    set of pinned versions in git, rollback is a one-line pin revert, and a broken chart can't ride
    in on someone else's merge. The price is the discipline the toggle above just taught you.</p>
    <p>One hardening rule worth knowing early: apps that autoscale get their <code>replicas</code>
    excluded from sync — otherwise server-side apply would arm-wrestle the autoscaler on every
    reconcile. Forced-SSA-vs-autoscaler is a real fight; the platform declines it structurally.</p>
    <h2>When the sync goes red.</h2>
    <p>The debug ladder, in the order that finds it fastest — each rung is one command:</p>
    <ol class="debug-ladder">
      <li><strong>App status</strong> — <code>kubectl -n argocd get application &lt;app&gt;</code>.
        <code>OutOfSync</code> means live ≠ pinned (someone touched the cluster by hand, or the pin
        points at a version the registry doesn't have). <code>Degraded</code> means pods.</li>
      <li><strong>Pods</strong> — <code>kubectl -n &lt;ns&gt; get pods</code>, then
        <code>describe</code> the sad one. <code>ImagePullBackOff</code> = tag doesn't exist or pull
        secret missing · <code>CrashLoopBackOff</code> = read the logs · <code>Pending</code> =
        resources, affinity, or an unbound PVC · <code>OOMKilled</code> = raise the memory limit.</li>
      <li><strong>Events</strong> — <code>kubectl -n &lt;ns&gt; get events --sort-by='.lastTimestamp'</code>.
        The scheduler and kubelet narrate here.</li>
      <li><strong>NetworkPolicy</strong> — pod runs but can't reach anything? Every chart ships its
        own policy; the usual missing egress allowances are the registry, DNS, and upstream APIs.</li>
      <li><strong>Admission</strong> — rejected outright? <code>kubectl get clusterpolicies</code>
        (what's enforced vs audit) and <code>kubectl -n &lt;ns&gt; get policyreport</code>. Policies
        ramp audit → warn → enforce, so today's report line is next month's block — fix it either way.</li>
    </ol>
    ${sot(['gitops/argocd-apps/unsigned-paas-apps.yaml', 'docs/argocd-appset-hardening.md', 'docs/chart-versioning-design.md', 'awesome-unsigned/faq/common-questions.md'])}`,

  ingress: () => `
    <div class="crumb"><span class="addr">0x03</span> · platform</div>
    <h1>Ingress + TLS.</h1>
    <p class="lede">One wildcard cert, one edge proxy, DNS that writes itself. A new public service
    is a hostname in a values file — everything else is already true.</p>
    ${seqPanel({ title: 'HTTPS REQUEST, EDGE → POD', stages: [
      { tag: 'DNS', node: 'external-dns → cloudflare', note: 'watches ingress resources; syncs records for the platform zone. scoped to exactly that zone — it cannot touch anything else.' },
      { tag: 'LB', node: 'cloud load balancer', note: 'PROXY protocol preserves the real client IP across the hop.' },
      { tag: 'EDGE', node: 'traefik', note: 'terminates TLS with the wildcard cert from its default store; routes on host/path.' },
      { tag: 'CERT', node: 'cert-manager · DNS-01', note: 'the wildcard is proven by DNS-01 (a TXT record), so it renews without exposing anything — and covers every subdomain at once.' },
      { tag: 'POD', node: 'service → pod', note: 'in-cluster, network policies decide who may talk to whom. default is deny.' },
    ]})}
    <h2>The two-tier exposure rule</h2>
    <ul>
      <li><strong>Public wildcard</strong> — product and platform UIs that carry their own auth (OIDC in front of everything).</li>
      <li><strong>Tailnet-only</strong> — observability and secret-store admin UIs. They get tailnet load-balancer services and simply do not exist on the public edge.</li>
    </ul>
    <p>Deciding which tier a service belongs to is a one-line choice in its chart — which is the
    point. Exposure is a reviewed, diffable decision, not an accident.</p>
    ${sot(['helm/networking/traefik/values.yaml', 'helm/networking/cert-manager/values.yaml  (wildcard + DNS-01)', 'helm/networking/external-dns/values.yaml  (zone-scoped)'])}`,

  secrets: () => `
    <div class="crumb"><span class="addr">0x04</span> · platform</div>
    <h1>Secrets.</h1>
    <p class="lede">Git never holds a secret. OpenBao holds the truth; the External Secrets Operator
    projects it into the cluster; charts reference paths, not values.</p>
    ${seqPanel({ title: 'A SECRET\'S PATH TO A POD', stages: [
      { tag: 'BAO', node: 'openbao · kv v2', note: 'the source of truth. unseal keys live offline — a restart re-seals the vault on purpose.' },
      { tag: 'CSS', node: 'ClusterSecretStore', note: 'ESO authenticates to OpenBao once, cluster-wide, via a kubernetes service account.' },
      { tag: 'ES', node: 'ExternalSecret CR', note: 'declares path + field → target Secret. this is the only thing a chart ships — a reference.' },
      { tag: 'K8S', node: 'kubernetes Secret', note: 'materialized and refreshed on an interval. pods consume it as env or volume, none the wiser.' },
    ]})}
    <div class="panel"><div class="panel-bar">THE GC FOOTGUN — TRY IT</div><div class="panel-body">
      <p style="margin-top:0">An ExternalSecret with <code>creationPolicy: Owner</code> <em>owns</em> its
      target Secret. Delete the ExternalSecret and Kubernetes garbage-collects the Secret with it.</p>
      <div class="toggle-row"><button class="switch" role="switch" aria-checked="false" data-gc-toggle></button><label>delete the ExternalSecret (creationPolicy: Owner)</label></div>
      <div class="seq" style="margin-top:12px">
        <div class="seq-stage"><div class="seq-node on" data-gc-es><span class="t">CR</span>ExternalSecret</div>
        <div class="seq-arrow">│</div><div class="seq-note on" data-gc-note>owns ↓</div></div>
        <div class="seq-stage"><div class="seq-node on" data-gc-secret><span class="t">K8S</span>Secret · app credentials</div>
        <div class="seq-arrow"> </div><div class="seq-note on" data-gc-note2>mounted by the workload</div></div>
      </div>
      <div class="verdict" data-gc-verdict role="status"></div>
      <p class="foot-note">with <code>creationPolicy: Merge</code> the Secret survives — the trade is ESO no longer cleans up after itself.</p>
    </div></div>
    <h2>Rules that hold the line</h2>
    <ul>
      <li><strong>No secret in git, ever</strong> — pre-commit and CI both scan; a leaked value is treated as already compromised and rotated, not quietly deleted.</li>
      <li><strong>Paths in charts, values in the vault</strong> — a chart review can never leak what it never contained.</li>
      <li><strong>Bootstrap material lives offline</strong> — unseal keys and root tokens are in the operator vault, not the cluster.</li>
    </ul>
    ${sot(['helm/security/openbao/', 'helm/security/external-secrets/  (ClusterSecretStore)', 'any chart\'s templates/externalsecret.yaml  (the reference pattern)'])}`,

  policy: () => `
    <div class="crumb"><span class="addr">0x05</span> · platform</div>
    <h1>Admission policy.</h1>
    <p class="lede">Kyverno (CEL) + Pod Security Admission + native validating policies. New rules
    never start by blocking anyone — they earn enforcement one policy at a time.</p>
    <div class="panel"><div class="panel-bar">THE RAMP — SLIDE A POLICY THROUGH ITS LIFECYCLE</div><div class="panel-body">
      <div style="display:flex;gap:8px;margin-bottom:18px" role="radiogroup" aria-label="policy mode">
        <button class="btn ghost" data-ramp="audit" aria-pressed="true">1 · audit</button>
        <button class="btn ghost" data-ramp="warn" aria-pressed="false">2 · warn</button>
        <button class="btn ghost" data-ramp="enforce" aria-pressed="false">3 · enforce</button>
      </div>
      <pre style="margin-top:0">apiVersion: apps/v1
kind: Deployment            <span class="c"># submitted by a well-meaning engineer</span>
spec:
  template:
    spec:
      containers:
        - name: app
          image: registry.example/app:<span class="g" data-ramp-img>latest</span>   <span class="c" data-ramp-imgnote># ← unpinned tag</span>
          securityContext: {}                    <span class="c"># ← no runAsNonRoot</span></pre>
      <div class="verdict" data-ramp-verdict role="status" style="display:block"></div>
      <p class="foot-note" data-ramp-note></p>
    </div></div>
    <h2>Why ramp instead of enforce-on-day-one?</h2>
    <p>Enforcement that fires on false positives gets disabled — permanently, by an annoyed human at
    2am. The ramp soaks each policy in <strong>audit</strong> until its report is quiet, surfaces
    <strong>warn</strong>ings to authors in their own workflow, and only then <strong>enforce</strong>s.
    Guardrails people trust are guardrails that stay on.</p>
    <ul>
      <li><strong>PSA</strong> sets the namespace floor (baseline/restricted).</li>
      <li><strong>Kyverno</strong> carries the org rules: pinned images, security contexts, required labels.</li>
      <li><strong>Native VAP</strong> handles cluster-scoped CEL rules with zero controller overhead.</li>
    </ul>
    ${sot(['helm/security/kyverno-policies/', 'docs/cluster-policy-tooling-research.md  (why kyverno; gatekeeper retired)'])}`,

  observ: () => `
    <div class="crumb"><span class="addr">0x06</span> · platform</div>
    <h1>Observability.</h1>
    <p class="lede">Three signals, one collector, one pane of glass. Pick a signal and trace its
    path.</p>
    <div class="panel"><div class="panel-bar">FOLLOW A SIGNAL<span class="spacer"></span>
      <button class="btn ghost" data-sig="metrics" aria-pressed="true">metrics</button>
      <button class="btn ghost" data-sig="logs" aria-pressed="false">logs</button>
      <button class="btn ghost" data-sig="traces" aria-pressed="false">traces</button></div>
    <div class="panel-body"><div class="seq" data-sig-seq></div></div></div>
    <h2>House rules</h2>
    <ul>
      <li><strong>Every chart exports or it doesn't ship</strong> — probes, resource limits, and scrape annotations are chart-lint requirements, not favors.</li>
      <li><strong>Dashboards are tailnet-only.</strong> Metrics describe your infrastructure with enthusiasm; the public internet doesn't get to read them.</li>
      <li><strong>Alerts page on symptoms, not causes</strong> — a full disk pages; the 40 things that can fill a disk get dashboards.</li>
    </ul>
    <p>One operational scar worth inheriting: <em>verify on the cluster, not from lint.</em> A chart
    that templates cleanly can still crashloop on a real node — deployed-and-observed is the only
    "done" this platform recognizes.</p>
    ${sot(['helm/observability/{prometheus,grafana,loki,alloy,jaeger}/', 'gitops/argocd-apps/unsigned-paas-apps.yaml  (monitoring namespace)'])}`,

  auth: () => `
    <div class="crumb"><span class="addr">0x07</span> · platform</div>
    <h1>Identity.</h1>
    <p class="lede">One IdP (Keycloak), realm-per-tenant, and a single load-bearing idea:
    <strong>group membership IS authorization</strong>. Accounts are created by admins — realm
    imports never create users.</p>
    <div class="panel"><div class="panel-bar">GROUPS → ROLES — FLIP A MEMBERSHIP</div><div class="panel-body">
      <div class="toggle-row"><button class="switch" role="switch" aria-checked="false" data-grp="admin"></button><label>group: <code>admin</code></label></div>
      <div class="toggle-row"><button class="switch" role="switch" aria-checked="true" data-grp="operator"></button><label>group: <code>operator</code></label></div>
      <div class="dash-grid" style="margin-top:16px">
        <div class="tile"><div class="k">GITOPS UI</div><div class="v" data-role-argo>—</div><div class="sub">from groups claim</div></div>
        <div class="tile"><div class="k">DASHBOARDS</div><div class="v" data-role-graf>—</div><div class="sub">from groups claim</div></div>
        <div class="tile"><div class="k">CONTROL PANEL</div><div class="v" data-role-ccp>—</div><div class="sub">from groups claim</div></div>
      </div>
      <p class="foot-note">logged in but the UI is empty? your <em>account</em> is fine — your <em>group</em> is missing. this is the #1 first-week support question.</p>
    </div></div>
    <h2>The realm rules</h2>
    <ul>
      <li><strong>master realm = instance admin only.</strong> Never GitOps-managed, never holds humans beyond the bootstrap admin.</li>
      <li><strong>One realm per trust domain.</strong> Platform services share the platform realm; separate products get separate realms on separate instances — no cross-contamination.</li>
      <li><strong>Realm imports create realms, groups, clients — never users.</strong> First humans are made in the admin console, with OTP, by a person.</li>
    </ul>
    ${sot(['docs/specs/keycloak-realm-topology.md', 'helm/security/keycloak/'])}`,

  builds: () => `
    <div class="crumb"><span class="addr">0x08</span> · platform</div>
    <h1>Daemonless builds.</h1>
    <p class="lede">No Docker daemon exists anywhere on this platform — not in CI, not in-cluster.
    Answer two questions and the build tool picks itself.</p>
    <div class="panel"><div class="panel-bar">CHOOSE YOUR BUILDER</div><div class="panel-body">
      <h3 style="margin-top:0">Is it Go?</h3>
      <div style="display:flex;gap:8px">
        <button class="btn ghost" data-bq1="yes" aria-pressed="false">yes</button>
        <button class="btn ghost" data-bq1="no" aria-pressed="false">no</button>
      </div>
      <div data-bq2-wrap style="display:none">
        <h3>Do you already have a Dockerfile?</h3>
        <div style="display:flex;gap:8px">
          <button class="btn ghost" data-bq2="yes" aria-pressed="false">yes</button>
          <button class="btn ghost" data-bq2="no" aria-pressed="false">no</button>
          <button class="btn ghost" data-bq2="dockerd" aria-pressed="false">can't I just use dockerd?</button>
        </div>
      </div>
      <div class="verdict" data-build-verdict role="status"></div>
    </div></div>
    <h2>Why daemonless is a hard rule</h2>
    <ul>
      <li><strong>The daemon is a root-privileged single point of compromise.</strong> Rootless, daemonless builders shrink the blast radius to the build pod itself.</li>
      <li><strong>ko</strong> (Go) needs no Dockerfile at all and emits an SBOM for free.</li>
      <li><strong>Buildpacks</strong> give non-Go services reproducible images from a <code>project.toml</code>.</li>
      <li><strong>kaniko</strong> executes existing Dockerfiles unprivileged, in-cluster — Dockerfiles are welcome; the daemon is not.</li>
    </ul>
    <p>Field notes from running kaniko for real: it needs its default capability set (over-hardening
    the build pod breaks it), and a brand-new node can race DNS on first pull. Both are documented
    scars, not folklore.</p>
    ${sot(['CLAUDE.md  hard rules (private repo)', 'docs — kaniko build infra notes (private repo)'])}`,

  gpu: () => `
    <div class="crumb"><span class="addr">0x09</span> · platform ${targetBadge}</div>
    <h1>GPU scheduling.</h1>
    <p class="lede">Charts are ready; the GPU pool currently runs <strong>zero nodes</strong> while
    the substrate decision lands. This explainer covers the designed behavior — honestly labeled.</p>
    <div class="panel"><div class="panel-bar">MIG — SLICE ONE GPU</div><div class="panel-body">
      <p style="margin-top:0">Multi-Instance GPU partitions one physical card into hardware-isolated
      instances. Pick a profile:</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn ghost" data-mig="7" aria-pressed="true">7 × 1g (many small)</button>
        <button class="btn ghost" data-mig="3" aria-pressed="false">3 × 2g</button>
        <button class="btn ghost" data-mig="2" aria-pressed="false">2 × 3g</button>
        <button class="btn ghost" data-mig="1" aria-pressed="false">1 × 7g (whole card)</button>
      </div>
      <div data-mig-view style="display:flex;gap:6px;margin-top:16px" aria-label="GPU partition view"></div>
      <p class="foot-note" data-mig-note></p>
    </div></div>
    ${seqPanel({ title: 'SCALE FROM ZERO — A JOB ARRIVES', playLabel: 'submit job', stages: [
      { tag: 'JOB', node: 'Job → LocalQueue', note: 'workloads queue in Kueue; a ClusterQueue owns quota per namespace. nobody schedules around the queue.' },
      { tag: 'KEDA', node: 'scaler fires', note: 'queue depth / GPU-utilization metrics trip the autoscaler: pool 0 → 1.' },
      { tag: 'NODE', node: 'gpu node provisions', note: 'expect minutes, not seconds — node boot plus driver install. cold starts are a budgeted cost, not a surprise.' },
      { tag: 'RUN', node: 'job admitted → runs', note: 'Kueue admits against quota; MIG (or time-slicing in dev) hands it an isolated slice.' },
      { tag: 'ZERO', node: 'pool drains → 0', note: 'idle pool scales back to zero. you pay for GPU minutes used, none held.' },
    ]})}
    <p><strong>Design choices:</strong> prod isolates with MIG <code>single</code> strategy; dev
    time-slices for density. DRA enables fractional GPU requests on modern clusters.</p>
    ${sot(['helm/compute/{keda,kueue,nvidia-gpu-operator}/  (charts complete)', 'feature-flags.yaml  (gpu flags)', 'substrate decision — in flight'])}`,

  infer: () => `
    <div class="crumb"><span class="addr">0x0a</span> · platform ${targetBadge}</div>
    <h1>Inference serving.</h1>
    <p class="lede">NVIDIA Dynamo-Triton is the designed serving plane — one server process, many
    models, dynamic batching. Not yet deployed; it lands with the GPU substrate.</p>
    ${seqPanel({ title: 'ONE INFERENCE REQUEST', stages: [
      { tag: 'API', node: 'gateway → triton', note: 'requests enter through the platform edge with normal auth; the gateway routes by model name.' },
      { tag: 'BATCH', node: 'dynamic batcher', note: 'triton coalesces concurrent requests into one GPU pass — the single biggest throughput lever, tunable per model with a latency budget.' },
      { tag: 'EXEC', node: 'model on a MIG slice', note: 'the model runs on its isolated GPU instance. multiple models share one card without sharing fate.' },
      { tag: 'OBS', node: 'per-model metrics', note: 'latency, queue depth, and throughput export per model — the KEDA signals for 0x09 come from here.' },
    ]})}
    <h2>Design positions</h2>
    <ul>
      <li><strong>Triton first, TF-Serving as fallback</strong> — one serving plane unless a model genuinely can't live there.</li>
      <li><strong>Models are versioned artifacts</strong> in the registry, pulled by pinned reference — the same no-<code>latest</code> rule as every other image.</li>
      <li><strong>Scale-to-zero applies</strong> — an idle model costs storage, not GPU.</li>
    </ul>
    ${sot(['helm/inference/  (charts complete, undeployed)', 'depends on: 0x09 gpu substrate'])}`,

  substrate: () => `
    <div class="crumb"><span class="addr">0x0b</span> · platform ${targetBadge}</div>
    <h1>Dual substrate.</h1>
    <p class="lede">One chart tree, two targets: the managed dev cluster that exists, and the
    bare-metal GA home being built. A single <code>deploymentTarget</code> flag flips the
    substrate-specific layers.</p>
    <div class="panel"><div class="panel-bar">FLIP THE FLAG<span class="spacer"></span>
      <button class="btn ghost" data-sub="vke" aria-pressed="true">managed-vke · live dev</button>
      <button class="btn ghost" data-sub="talos" aria-pressed="false">baremetal/talos · GA target</button></div>
    <div class="panel-body">
      <div class="dash-grid" data-sub-grid></div>
      <p class="foot-note" data-sub-note></p>
    </div></div>
    <h2>Why carry two substrates at once?</h2>
    <p><strong>Dev velocity now, GA economics later.</strong> The managed cluster made the platform
    real months before racking metal; bare-metal ownership is what makes GPU economics work at GA.
    Keeping both behind one flag forces every chart to stay substrate-honest — anything
    substrate-specific must declare itself, so the migration is a flag flip plus a punch list
    instead of a rewrite.</p>
    <p>The doctrine is multicloud on purpose: a GA home, a dev bench, burst capacity, and an edge —
    with node source a per-workload-class routing decision rather than an ideology.</p>
    ${sot(['feature-flags.yaml  (deploymentTarget)', 'docs/critical-path-v1.md  (two-spine plan)', 'multicloud ADR (private repo)'])}`,

  dash: () => `
    <div class="crumb"><span class="addr">0x10</span> · instruments</div>
    <h1>Cluster monitor.</h1>
    <p class="lede">Coarse health of the live dev cluster — node count, sync ratio, cert validity.
    Deliberately no service names, hostnames, or versions beyond Kubernetes itself: a public page
    gets a heartbeat, not a blueprint.</p>
    <div class="panel"><div class="panel-bar">DEV CLUSTER<span class="spacer"></span><span data-dash-badge class="badge-demo">DEMO DATA</span></div>
    <div class="panel-body">
      <div class="dash-grid" data-dash-grid style="margin:0"></div>
      <p class="foot-note" data-dash-fresh></p>
    </div></div>
    <h2>How this stays honest on a public page</h2>
    <ul>
      <li>A scheduled job <em>inside the private platform</em> gathers state, strips it to the coarse fields above, and publishes a small JSON snapshot here.</li>
      <li>This page polls that snapshot — no credentials, no API access, nothing to steal.</li>
      <li>If the snapshot is missing or stale, you get clearly-labeled demo data — never a silent fake, never a leaked real. (That's a design principle, not a caveat.)</li>
    </ul>
    ${sot(['learn/data/cluster-snapshot.json  (this repo — published by CI)', 'snapshot publisher workflow (private repo)'])}`,

  cost: () => `
    <div class="crumb"><span class="addr">0x11</span> · instruments</div>
    <h1>Cost engineering.</h1>
    <p class="lede">The platform's economics in one interactive model. Slide the workload; watch
    where each class of compute wants to live. Figures are illustrative public list prices —
    not internal spend.</p>
    <div class="panel"><div class="panel-bar">MONTHLY COST MODEL — ILLUSTRATIVE LIST PRICES</div><div class="panel-body">
      <div class="cost-grid">
        <div class="cost-controls">
          <label>steady CPU nodes <output data-o="cpu">3</output></label>
          <input type="range" min="1" max="12" value="3" data-c="cpu" aria-label="steady CPU nodes">
          <label>GPU hours / month <output data-o="gpu">200</output></label>
          <input type="range" min="0" max="1440" step="20" value="200" data-c="gpu" aria-label="GPU hours per month">
          <label>egress TB / month <output data-o="egress">1</output></label>
          <input type="range" min="0" max="20" value="1" data-c="egress" aria-label="egress terabytes per month">
        </div>
        <div class="cost-bars" data-cost-bars aria-live="polite"></div>
      </div>
      <p class="foot-note" data-cost-note></p>
    </div></div>
    <h2>The doctrine behind the sliders</h2>
    <ul>
      <li><strong>Steady base load → owned/dedicated metal.</strong> Anything running 24/7 wants the substrate with the lowest €/hour and free egress allowances — that's the GA home.</li>
      <li><strong>Dev and experiments → cheap managed cloud.</strong> Velocity matters more than unit cost at dev scale.</li>
      <li><strong>Bursty GPU → rent the peak.</strong> Scale-to-zero (0x09) means the expensive substrate is only billed while a queue is non-empty. The crossover the sliders reveal: steady GPU load pays for dedicated cards shockingly fast.</li>
      <li><strong>Egress is the silent tax.</strong> Cloud egress pricing can dominate a serving workload; metal providers bundle generous allowances. Slide egress up and watch.</li>
    </ul>
    ${sot(['multicloud doctrine ADR (private repo)', 'public list prices, 2026-07 — illustrative only'])}`,
};

/* ---------- interactive wiring per view ---------- */
const wire = {
  gate(root) {
    $$('[data-check]', root).forEach(btn => btn.addEventListener('click', () => {
      const k = btn.dataset.check;
      const out = validators[k]($(`[data-v="${k}"]`, root).value);
      const v = $(`[data-verdict="${k}"]`, root);
      v.className = 'verdict ' + (out.ok ? 'ok' : 'no');
      v.textContent = (out.ok ? '✓ ' : '✗ ') + out.msg;
      if (out.ok) setTimeout(() => { gate.set(k); render(); }, REDUCED ? 0 : 700);
    }));
    const rst = $('[data-gate-reset]', root);
    if (rst) rst.addEventListener('click', () => { if (confirm('Clear gate progress on this browser?')) { gate.reset(); render(); } });
  },

  gitops(root) {
    const state = { bump: true, pin: true, push: true };
    const verdictEl = $('[data-triple-verdict]', root);
    const update = () => {
      const missing = Object.entries(state).filter(([, v]) => !v).map(([k]) => ({ bump: 'no version bump → registry still serves the old chart', pin: 'pin not updated → ArgoCD keeps deploying the OLD version, forever, silently', push: 'chart never published → sync fails: version pinned but nothing to pull' }[k]));
      if (!missing.length) { verdictEl.className = 'verdict ok'; verdictEl.textContent = '✓ triple complete — the new version deploys on next sync.'; }
      else { verdictEl.className = 'verdict no'; verdictEl.textContent = '✗ ' + missing[0]; }
    };
    $$('[data-triple]', root).forEach(sw => sw.addEventListener('click', () => {
      const k = sw.dataset.triple; state[k] = !state[k];
      sw.setAttribute('aria-checked', String(state[k])); update();
    }));
  },

  secrets(root) {
    const sw = $('[data-gc-toggle]', root);
    sw.addEventListener('click', () => {
      const deleted = sw.getAttribute('aria-checked') !== 'true';
      sw.setAttribute('aria-checked', String(deleted));
      $('[data-gc-es]', root).classList.toggle('err', deleted);
      $('[data-gc-es]', root).classList.toggle('on', !deleted);
      $('[data-gc-secret]', root).classList.toggle('err', deleted);
      $('[data-gc-secret]', root).classList.toggle('on', !deleted);
      const v = $('[data-gc-verdict]', root);
      v.className = 'verdict ' + (deleted ? 'no' : 'ok');
      v.textContent = deleted
        ? '✗ Secret garbage-collected with its owner. every pod mounting it fails on next restart. this has bitten real operators — hence the toggle.'
        : '✓ ExternalSecret restored; Secret re-materializes on the next refresh interval.';
    });
  },

  policy(root) {
    const modes = {
      audit:   { verdict: 'ADMITTED · 2 violations recorded in the PolicyReport', cls: 'ok', note: 'nothing blocks. operators review reports after a soak period and separate real violations from false positives.' },
      warn:    { verdict: 'ADMITTED · warnings returned to the author on apply', cls: 'ok', note: 'the author sees the violation in their own terminal at apply time — feedback lands where the fix happens.' },
      enforce: { verdict: 'DENIED · admission webhook rejected the Deployment', cls: 'no', note: 'the unpinned tag and missing security context are now hard failures. by this point the report has been quiet for days — no one is surprised.' },
    };
    const set = (m) => {
      $$('[data-ramp]', root).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ramp === m)));
      const v = $('[data-ramp-verdict]', root);
      v.className = 'verdict ' + modes[m].cls; v.style.display = 'block';
      v.textContent = (modes[m].cls === 'ok' ? '✓ ' : '✗ ') + modes[m].verdict;
      $('[data-ramp-note]', root).textContent = modes[m].note;
    };
    $$('[data-ramp]', root).forEach(b => b.addEventListener('click', () => set(b.dataset.ramp)));
    set('audit');
  },

  observ(root) {
    const paths = {
      metrics: [
        { tag: 'POD', node: 'workload /metrics', note: 'every chart exposes metrics — a lint requirement, not a favor.' },
        { tag: 'SCRAPE', node: 'prometheus', note: 'scrapes on interval; retention tuned for the dashboard window.' },
        { tag: 'VIEW', node: 'grafana (tailnet)', note: 'one pane of glass, tailnet-only, IdP login.' },
        { tag: 'PAGE', node: 'alertmanager', note: 'symptom-based alerts route to humans.' }],
      logs: [
        { tag: 'POD', node: 'stdout / stderr', note: 'structured logging is the standard — parseable beats pretty.' },
        { tag: 'SHIP', node: 'alloy (per node)', note: 'the collector tails every container on its node and labels streams.' },
        { tag: 'STORE', node: 'loki', note: 'indexes labels, not content — cheap to keep, fast to grep.' },
        { tag: 'VIEW', node: 'grafana explore', note: 'same pane of glass; LogQL alongside the metrics that flagged the problem.' }],
      traces: [
        { tag: 'POD', node: 'instrumented spans', note: 'services propagate trace context across calls.' },
        { tag: 'SHIP', node: 'collector', note: 'spans batch out-of-band; sampling keeps overhead honest.' },
        { tag: 'STORE', node: 'jaeger', note: 'assembles spans into request trees.' },
        { tag: 'VIEW', node: 'trace timeline', note: 'the "why is p99 bad" answer machine — which hop, which call, how long.' }],
    };
    const holder = $('[data-sig-seq]', root);
    const setSig = (sig) => {
      $$('[data-sig]', root).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sig === sig)));
      holder.innerHTML = paths[sig].map((s, i) => `
        <div class="seq-stage"><div class="seq-node on"><span class="t">${esc(s.tag)}</span>${esc(s.node)}</div>
        <div class="seq-arrow">${i < paths[sig].length - 1 ? '│' : ' '}</div>
        <div class="seq-note on">${esc(s.note)}</div></div>`).join('');
    };
    $$('[data-sig]', root).forEach(b => b.addEventListener('click', () => setSig(b.dataset.sig)));
    setSig('metrics');
  },

  auth(root) {
    const state = { admin: false, operator: true };
    const update = () => {
      const role = state.admin ? ['role:admin', 'Admin', 'full control'] : state.operator ? ['role:readonly', 'Editor', 'operate + view'] : ['(no access)', '(no access)', '(no access)'];
      const set = (sel, val, ok) => { const n = $(sel, root); n.textContent = val; n.className = 'v ' + (ok ? 'ok' : 'warn'); };
      set('[data-role-argo]', role[0], state.admin || state.operator);
      set('[data-role-graf]', role[1], state.admin || state.operator);
      set('[data-role-ccp]', role[2], state.admin || state.operator);
    };
    $$('[data-grp]', root).forEach(sw => sw.addEventListener('click', () => {
      const g = sw.dataset.grp; state[g] = !state[g];
      sw.setAttribute('aria-checked', String(state[g])); update();
    }));
    update();
  },

  builds(root) {
    const v = $('[data-build-verdict]', root);
    const answers = {};
    const resolve = () => {
      if (answers.q1 === 'yes') { v.className = 'verdict ok'; v.textContent = '✓ ko. no Dockerfile, direct-to-registry, SBOM included. done.'; return; }
      if (answers.q1 === 'no') $('[data-bq2-wrap]', root).style.display = 'block';
      if (answers.q2 === 'yes') { v.className = 'verdict ok'; v.textContent = '✓ kaniko. your Dockerfile runs unprivileged, in-cluster. the file was never the problem — the daemon was.'; }
      else if (answers.q2 === 'no') { v.className = 'verdict ok'; v.textContent = '✓ Cloud Native Buildpacks. write a project.toml, get a reproducible image, keep not thinking about base layers.'; }
      else if (answers.q2 === 'dockerd') { v.className = 'verdict no'; v.textContent = '✗ EPERM: dockerd not found (and it never will be). a root daemon is a platform-wide blast radius wearing a convenience costume. pick a lane above.'; }
    };
    $$('[data-bq1]', root).forEach(b => b.addEventListener('click', () => { answers.q1 = b.dataset.bq1; answers.q2 = null; $$('[data-bq1]', root).forEach(x => x.setAttribute('aria-pressed', String(x === b))); $$('[data-bq2]', root).forEach(x => x.setAttribute('aria-pressed', 'false')); v.className = 'verdict'; resolve(); }));
    $$('[data-bq2]', root).forEach(b => b.addEventListener('click', () => { answers.q2 = b.dataset.bq2; $$('[data-bq2]', root).forEach(x => x.setAttribute('aria-pressed', String(x === b))); resolve(); }));
  },

  gpu(root) {
    const profiles = {
      7: { n: 7, note: '7 isolated 1g instances — right-sized for small models and many tenants. hardware isolation, not cgroup theater.' },
      3: { n: 3, note: '3 × 2g — mid-size models, still multi-tenant per card.' },
      2: { n: 2, note: '2 × 3g — larger models, two tenants share fate-free.' },
      1: { n: 1, note: 'the whole card. training runs and models that need every byte of HBM.' },
    };
    const view = $('[data-mig-view]', root);
    const set = (p) => {
      $$('[data-mig]', root).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mig === p)));
      const { n, note } = profiles[p];
      view.innerHTML = Array.from({ length: n }, (_, i) =>
        `<div class="bit set" style="flex:${7 / n};width:auto;height:44px;font-size:11px">${n === 1 ? '7g' : (p === '7' ? '1g' : (p === '3' ? '2g' : '3g'))}</div>`).join('');
      $('[data-mig-note]', root).textContent = note;
    };
    $$('[data-mig]', root).forEach(b => b.addEventListener('click', () => set(b.dataset.mig)));
    set('7');
  },

  substrate(root) {
    const data = {
      vke:  { rows: [['STATE', 'LIVE · since 2026-06', 1], ['K8S', 'managed control plane', 1], ['CNI', 'calico', 1], ['ENCRYPT', 'TLS everywhere; mesh later', 1], ['GPU', 'cloud pool (0 today)', 0], ['ECONOMICS', 'velocity-priced', 0]], note: 'the cluster you gated into. managed control plane bought months of platform progress.' },
      talos: { rows: [['STATE', 'GA TARGET · building', 0], ['K8S', 'talos — immutable, API-driven', 1], ['CNI', 'cilium eBPF', 1], ['ENCRYPT', 'wireguard node-to-node', 1], ['GPU', 'dedicated cards (decision in flight)', 0], ['ECONOMICS', 'owned-metal pricing', 1]], note: 'the v1.0.0 home. same charts, flipped flag, punch list instead of rewrite.' },
    };
    const grid = $('[data-sub-grid]', root);
    const set = (s) => {
      $$('[data-sub]', root).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sub === s)));
      grid.innerHTML = data[s].rows.map(([k, v, ok]) =>
        `<div class="tile"><div class="k">${esc(k)}</div><div class="v ${ok ? 'ok' : ''}" style="font-size:14px">${esc(v)}</div></div>`).join('');
      $('[data-sub-note]', root).textContent = data[s].note;
    };
    $$('[data-sub]', root).forEach(b => b.addEventListener('click', () => set(b.dataset.sub)));
    set('vke');
  },

  async dash(root) {
    const grid = $('[data-dash-grid]', root);
    const badge = $('[data-dash-badge]', root);
    const fresh = $('[data-dash-fresh]', root);
    const DEMO = { nodesReady: 3, nodesTotal: 3, appsSynced: 24, appsTotal: 27, certValid: true, k8s: 'v1.3x', pools: { cpu: 3, gpu: 0 }, generatedAt: null };
    const paint = (d, live) => {
      badge.className = live ? 'badge-live' : 'badge-demo';
      badge.textContent = live ? 'LIVE · SANITIZED' : 'DEMO DATA';
      grid.innerHTML = `
        <div class="tile"><div class="k">NODES READY</div><div class="v ${d.nodesReady === d.nodesTotal ? 'ok' : 'warn'}">${d.nodesReady}<small>/${d.nodesTotal}</small></div></div>
        <div class="tile"><div class="k">APPS SYNCED</div><div class="v ${d.appsSynced === d.appsTotal ? 'ok' : 'warn'}">${d.appsSynced}<small>/${d.appsTotal}</small></div></div>
        <div class="tile"><div class="k">WILDCARD CERT</div><div class="v ${d.certValid ? 'ok' : 'warn'}" style="font-size:16px">${d.certValid ? 'VALID' : 'CHECK'}</div></div>
        <div class="tile"><div class="k">KUBERNETES</div><div class="v" style="font-size:16px">${esc(d.k8s)}</div></div>
        <div class="tile"><div class="k">CPU POOL</div><div class="v">${d.pools.cpu}<small> nodes</small></div></div>
        <div class="tile"><div class="k">GPU POOL</div><div class="v">${d.pools.gpu}<small> nodes</small><div class="sub">scale-to-zero · see 0x09</div></div></div>`;
      fresh.textContent = live
        ? `snapshot generated ${new Date(d.generatedAt).toUTCString()} — refreshed by CI on a schedule, polled by this page.`
        : 'demo data — the CI snapshot is not wired (or is stale >24h). numbers are representative, and say so.';
    };
    paint(DEMO, false);
    const poll = async () => {
      try {
        const r = await fetch('data/cluster-snapshot.json', { cache: 'no-store' });
        if (!r.ok) return;
        const d = await r.json();
        const ageOk = d.generatedAt && (Date.now() - Date.parse(d.generatedAt)) < 24 * 3600e3;
        if (d.demo !== true && ageOk) paint(d, true);
      } catch { /* offline or absent — demo stands */ }
    };
    poll();
    root._dashTimer = setInterval(poll, 60000);
  },

  cost(root) {
    /* Illustrative 2026-07 PUBLIC list prices (monthly, EUR≈USD flattened for the model):
       dedicated GPU server ~€850/mo flat; cloud CPU node ~$60/mo dev-grade vs ~€40 metal-grade;
       rented cloud GPU ~$2.5/hr; dedicated egress bundled vs cloud ~$10/TB. */
    const P = {
      metal: { cpuNode: 42, gpuFlat: 850, gpuHr: 0, egressTB: 1, label: 'GA home · owned/dedicated metal', note: 'GPU = flat dedicated card (worth it past the crossover); egress ~bundled.' },
      cloud: { cpuNode: 60, gpuFlat: 0, gpuHr: 2.5, egressTB: 10, label: 'dev bench · managed cloud', note: 'GPU rented by the hour; egress metered.' },
      burst: { cpuNode: 0, gpuFlat: 0, gpuHr: 3.2, egressTB: 12, label: 'burst · rented GPU peak', note: 'zero standing cost — pay only while the queue is non-empty.' },
    };
    const bars = $('[data-cost-bars]', root);
    const state = { cpu: 3, gpu: 200, egress: 1 };
    const calc = () => {
      const rows = [
        ['', 'metal', P.metal.cpuNode * state.cpu + (state.gpu > 0 ? P.metal.gpuFlat : 0) + P.metal.egressTB * state.egress],
        ['alt', 'cloud', P.cloud.cpuNode * state.cpu + P.cloud.gpuHr * state.gpu + P.cloud.egressTB * state.egress],
        ['alt2', 'burst', P.burst.gpuHr * state.gpu + P.burst.egressTB * state.egress],
      ];
      const max = Math.max(...rows.map(r => r[2]), 1);
      bars.innerHTML = rows.map(([cls, key, total]) => `
        <div class="cbar ${cls}">
          <div class="cb-head"><b>${esc(P[key].label)}</b><span>~$${Math.round(total).toLocaleString()}/mo</span></div>
          <div class="track"><div class="fill" style="width:${Math.max(2, (total / max) * 100)}%"></div></div>
          <div class="cb-note">${esc(P[key].note)}</div>
        </div>`).join('');
      const crossover = P.metal.gpuFlat / P.cloud.gpuHr; // hours where dedicated beats rented
      $('[data-cost-note]', root).textContent =
        `crossover: past ~${Math.round(crossover)} GPU-hours/month, a dedicated card beats renting — you're at ${state.gpu}. ` +
        (state.gpu > crossover ? 'steady load: metal wins.' : 'bursty load: rent the peak, scale to zero.');
    };
    $$('[data-c]', root).forEach(inp => inp.addEventListener('input', () => {
      state[inp.dataset.c] = +inp.value;
      $(`[data-o="${inp.dataset.c}"]`, root).textContent = inp.value;
      calc();
    }));
    calc();
  },
};

/* ---------- router + shell ---------- */
const main = $('main');

function current() {
  const id = (location.hash.replace(/^#\/?/, '') || 'home').split('/')[0];
  return ROUTES.find(r => r.id === id) || ROUTES[0];
}

function renderRail() {
  const rail = $('nav.rail');
  const cur = current();
  let html = '';
  for (const g of Object.keys(GROUPS)) {
    html += `<div class="rail-group">${GROUPS[g]}</div>`;
    for (const r of ROUTES.filter(x => x.group === g)) {
      const locked = r.locked && !gate.done;
      html += `<a class="item ${locked ? 'locked' : ''}" href="#/${r.id}" ${cur.id === r.id ? 'aria-current="page"' : ''}>
        <span class="hex">${r.hex}</span>${esc(r.title)}${r.t ? ' <span class="badge-t">T</span>' : ''}</a>`;
    }
  }
  rail.innerHTML = html;
}

function lockedView(r) {
  return `
    <div class="crumb"><span class="addr">${r.hex}</span> · ${esc(GROUPS[r.group] || '').toLowerCase()}</div>
    <h1>${esc(r.title)}</h1>
    <div class="locked-view">
      <div class="lk">▝▘ LOCKED — GATE INCOMPLETE (0x${gate.bits.filter(Boolean).length === 2 ? '3' : gate.bits.filter(Boolean).length} of 0x7)</div>
      <p>This explainer assumes you can run what it teaches. Finish the boot sequence first —
      tailnet, bastion shell, kubeconfig — and everything unlocks at once.</p>
      <p style="margin-bottom:0"><button class="btn" data-nav="gate">→ 0x00 · the gate</button></p>
    </div>`;
}

function render() {
  const r = current();
  const prev = $('main > .view-enter');
  if (prev && prev._dashTimer) clearInterval(prev._dashTimer);
  const wrap = document.createElement('div');
  wrap.className = 'view-enter';
  const locked = r.locked && !gate.done;
  wrap.innerHTML = locked ? lockedView(r) : views[r.id]();

  if (!locked && !r.hidden && r.id !== 'gate') {
    const i = order.indexOf(r.id);
    const p = ROUTES.find(x => x.id === order[i - 1]);
    const n = ROUTES.find(x => x.id === order[i + 1]);
    wrap.innerHTML += `<div class="pager">
      ${p ? `<a href="#/${p.id}"><span>← PREV ${p.hex}</span>${esc(p.title)}</a>` : '<span></span>'}
      ${n ? `<a class="next" href="#/${n.id}"><span>NEXT ${n.hex} →</span>${esc(n.title)}</a>` : '<span></span>'}
    </div>`;
  }
  main.replaceChildren(wrap);
  if (!locked && wire[r.id]) wire[r.id](wrap);
  wireSeq(wrap);
  $$('[data-nav]', wrap).forEach(b => b.addEventListener('click', () => { location.hash = '#/' + b.dataset.nav; }));
  $$('.copy-btn', wrap).forEach(b => b.addEventListener('click', () => {
    const txt = b.parentElement.textContent.replace(/copy$/, '').trim();
    navigator.clipboard?.writeText(txt);
    b.textContent = 'copied'; setTimeout(() => b.textContent = 'copy', 1200);
  }));
  renderRail();
  document.title = r.id === 'home' ? 'unsigned/learn' : `${r.hex} ${r.title} — unsigned/learn`;
  main.focus({ preventScroll: true });
  scrollTo({ top: 0, behavior: 'instant' });
}

function onGateChange() {
  const chip = $('.gate-chip');
  chip.className = 'gate-chip ' + (gate.done ? 'verified' : 'unverified');
  $('.gate-chip .txt').textContent = gate.done ? 'VERIFIED 0x7' : `GATE ${gate.bits.filter(Boolean).length}/3`;
  renderRail();
}

/* ---------- command palette (shared engine: /palette.js, OPS-580) ----------
   The engine owns the dialog DOM, ⌘K/Ctrl-K, '/', Escape, and arrow keys;
   this list is /learn's own — lock state is read at each keystroke. */
function palItems(q) {
  const actions = [
    ...ROUTES.filter(r => !r.hidden).map(r => ({
      hex: r.hex, label: r.title, k2: r.locked && !gate.done ? 'locked' : '',
      run: () => { location.hash = '#/' + r.id; },
    })),
    { hex: 'cmd', label: 'reset gate progress', k2: '', run: () => { gate.reset(); location.hash = '#/gate'; render(); } },
    { hex: 'cmd', label: 'help — keyboard shortcuts', k2: '?', run: showHelp },
    { hex: 'cmd', label: 'back to unsigned.gg', k2: '', run: () => { location.href = '../'; } },
    { hex: 'cmd', label: '/onboard — internal · sso', k2: '', run: () => { location.href = '../onboard/'; } },
  ];
  const needle = q.trim().toLowerCase();
  return needle ? actions.filter(a => (a.hex + ' ' + a.label).toLowerCase().includes(needle)) : actions;
}
const palBar = UnsignedPalette.init({
  getItems: palItems,
  placeholder: 'jump to a section, or type a command…',
  emptyText: 'nothing at that address. try an explainer name.',
});
$('.kbd-hint').addEventListener('click', palBar.open);

function showHelp() {
  location.hash = '#/home';
  setTimeout(() => alert(
`unsigned/learn — keys

⌘K / Ctrl+K / /   command bar
[  ]                 prev / next section
?                    this help
Esc                  close overlays

everything is reachable by Tab — focus rings are designed, not default.`), 50);
}

/* ---------- global keyboard ---------- */
addEventListener('keydown', (e) => {
  // ⌘K / '/' / Escape belong to the shared palette engine; while the
  // palette is open its input has focus, so the typing guard covers it.
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
  if (typing) return;
  if (e.key === '?') { e.preventDefault(); showHelp(); }
  else if (e.key === '[' || e.key === ']') {
    const i = order.indexOf(current().id);
    const next = order[e.key === '[' ? Math.max(0, i - 1) : Math.min(order.length - 1, i + 1)];
    if (next) location.hash = '#/' + next;
  }
});

/* ---------- boot ---------- */
addEventListener('hashchange', render);
onGateChange();
render();
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
