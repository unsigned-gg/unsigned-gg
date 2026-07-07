import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type OperatorUserDetail, type TrackStep } from "../api/client";

const STATE_STYLE: Record<TrackStep["state"], { chip: string; label: string }> = {
  locked: { chip: "text-dim border-line", label: "locked" },
  pending: { chip: "text-warn border-warn/40", label: "pending" },
  evidence_received: { chip: "text-warn border-warn/40", label: "evidence…" },
  verified: { chip: "text-signal border-signal/40", label: "verified" },
  operator_blocked: { chip: "text-bad border-bad/40", label: "blocked" },
};

const OVERRIDE_STATES = ["verified", "operator_blocked", "pending"] as const;

function OverrideModal({
  userId, step, onDone, onClose,
}: {
  userId: string;
  step: TrackStep;
  onDone: () => void;
  onClose: () => void;
}) {
  const [state, setState] = useState<(typeof OVERRIDE_STATES)[number]>("verified");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      await api.override(userId, step.slug, state, note.trim());
      onDone();
    } catch (e) {
      setErr(String(e));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-6" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg border border-line bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-mono text-[10px] tracking-[0.14em] text-dim">OPERATOR OVERRIDE</p>
        <h2 className="mt-1 text-lg font-semibold text-bright">{step.title}</h2>
        <div className="mt-4 flex gap-2">
          {OVERRIDE_STATES.map((s) => (
            <button
              key={s}
              onClick={() => setState(s)}
              className={`rounded border px-3 py-1 font-mono text-xs ${
                state === s ? "border-signal text-signal" : "border-line text-dim hover:text-bright"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="note (mandatory — lands in the audit trail)"
          rows={3}
          className="mt-4 w-full rounded border border-line bg-surface-2 p-3 font-mono text-xs text-bright placeholder:text-dim focus:border-signal focus:outline-none"
        />
        {err && <p className="mt-2 font-mono text-xs text-bad">{err}</p>}
        <div className="mt-4 flex justify-end gap-3 font-mono text-xs">
          <button className="text-dim hover:text-bright" onClick={onClose}>cancel</button>
          <button
            disabled={busy || !note.trim()}
            onClick={submit}
            className="rounded border border-signal/40 px-3 py-1 text-signal disabled:opacity-40"
          >
            {busy ? "applying…" : "apply override"}
          </button>
        </div>
      </div>
    </div>
  );
}

function summarizePayload(p: unknown): string {
  if (p == null) return "";
  if (typeof p !== "object") return String(p);
  return Object.entries(p as Record<string, unknown>)
    .slice(0, 4)
    .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join(" · ");
}

export default function OperatorUser() {
  const { id = "" } = useParams();
  const [detail, setDetail] = useState<OperatorUserDetail | null>(null);
  const [err, setErr] = useState("");
  const [overriding, setOverriding] = useState<TrackStep | null>(null);

  const load = useCallback(
    () => api.operatorUser(id).then(setDetail).catch((e) => setErr(String(e))),
    [id],
  );
  useEffect(() => {
    load();
  }, [load]);

  if (err) return <p className="py-10 font-mono text-sm text-bad">{err}</p>;
  if (!detail) return <p className="py-10 font-mono text-sm text-dim">loading…</p>;

  const { user, steps, evidence } = detail;

  return (
    <main className="pt-8">
      <Link to="/operator" className="font-mono text-xs text-dim hover:text-signal">← cohort</Link>
      <h1 className="mt-2 text-2xl font-semibold">{user.displayName || user.email}</h1>
      <dl className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 font-mono text-xs text-dim sm:grid-cols-4">
        <div><dt className="text-[10px] tracking-wider">EMAIL</dt><dd className="text-bright">{user.email}</dd></div>
        <div><dt className="text-[10px] tracking-wider">GITHUB</dt><dd className="text-bright">{user.githubLogin || "—"}</dd></div>
        <div><dt className="text-[10px] tracking-wider">TAILSCALE</dt><dd className="text-bright">{user.tailscaleLogin || "—"}</dd></div>
        <div><dt className="text-[10px] tracking-wider">TENANT</dt><dd className="text-bright">{user.tenantSlug || "—"}</dd></div>
      </dl>

      <section className="mt-8">
        <h2 className="font-mono text-[11px] tracking-[0.14em] text-dim">STEPS</h2>
        <ul className="mt-2 divide-y divide-line rounded-lg border border-line bg-surface">
          {steps.map((s) => (
            <li key={s.slug} className="flex items-baseline gap-4 px-5 py-3">
              <span className={`rounded border px-2 py-0.5 font-mono text-[10px] tracking-wider ${STATE_STYLE[s.state].chip}`}>
                {STATE_STYLE[s.state].label}
              </span>
              <span className={s.state === "locked" ? "text-dim" : "text-bright"}>{s.title}</span>
              {s.blockedNote && <span className="font-mono text-[10px] text-bad">{s.blockedNote}</span>}
              <button
                onClick={() => setOverriding(s)}
                className="ml-auto font-mono text-[10px] text-dim hover:text-signal"
              >
                override
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-mono text-[11px] tracking-[0.14em] text-dim">EVIDENCE TIMELINE</h2>
        <ul className="mt-2 divide-y divide-line rounded-lg border border-line bg-surface font-mono text-xs">
          {evidence.length === 0 && <li className="px-5 py-3 text-dim">no evidence yet.</li>}
          {evidence.map((e) => (
            <li key={e.id} className="flex items-baseline gap-4 px-5 py-2.5">
              <span className="shrink-0 text-[10px] text-dim">
                {new Date(e.createdAt).toISOString().slice(0, 16).replace("T", " ")}
              </span>
              <span className="shrink-0 text-bright">{e.stepSlug}</span>
              <span className={`shrink-0 text-[10px] ${e.source === "operator-override" ? "text-warn" : "text-dim"}`}>
                {e.source}
              </span>
              <span className="truncate text-dim" title={JSON.stringify(e.payload)}>
                {summarizePayload(e.payload)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {overriding && (
        <OverrideModal
          userId={user.id}
          step={overriding}
          onClose={() => setOverriding(null)}
          onDone={() => {
            setOverriding(null);
            load();
          }}
        />
      )}
    </main>
  );
}
