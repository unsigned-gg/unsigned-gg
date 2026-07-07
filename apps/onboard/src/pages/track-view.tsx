import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type TrackStep } from "../api/client";

const TRACKS: { key: TrackStep["track"]; label: string }[] = [
  { key: "access", label: "ACCESS" },
  { key: "contribution", label: "FIRST CONTRIBUTION" },
  { key: "modules", label: "MODULES" },
];

const STATE_STYLE: Record<TrackStep["state"], { chip: string; label: string }> = {
  locked: { chip: "text-dim border-line", label: "locked" },
  pending: { chip: "text-warn border-warn/40", label: "pending" },
  evidence_received: { chip: "text-warn border-warn/40", label: "evidence…" },
  verified: { chip: "text-signal border-signal/40", label: "verified" },
  operator_blocked: { chip: "text-bad border-bad/40", label: "blocked" },
};

export default function TrackView() {
  const [steps, setSteps] = useState<TrackStep[]>([]);
  const [err, setErr] = useState("");

  const load = () => api.track().then((t) => setSteps(t.steps)).catch((e) => setErr(String(e)));
  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  if (err) return <p className="py-10 font-mono text-sm text-bad">{err}</p>;

  const verified = steps.filter((s) => s.state === "verified").length;

  return (
    <main className="pt-8">
      <p className="font-mono text-xs tracking-widest text-dim">
        PROGRESS {verified}/{steps.length}
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Your onboarding track.</h1>
      {TRACKS.map(({ key, label }) => (
        <section key={key} className="mt-8">
          <h2 className="font-mono text-[11px] tracking-[0.14em] text-dim">{label}</h2>
          <ul className="mt-2 divide-y divide-line border border-line rounded-lg bg-surface">
            {steps.filter((s) => s.track === key).map((s) => (
              <li key={s.slug}>
                <Link
                  to={`/steps/${s.slug}`}
                  className="flex items-baseline gap-4 px-5 py-3.5 hover:bg-surface-2"
                >
                  <span className={`rounded border px-2 py-0.5 font-mono text-[10px] tracking-wider ${STATE_STYLE[s.state].chip}`}>
                    {STATE_STYLE[s.state].label}
                  </span>
                  <span className={s.state === "locked" ? "text-dim" : "text-bright"}>
                    {s.title}
                  </span>
                  {s.ownership === "operator-owed" && (
                    <span className="ml-auto font-mono text-[10px] text-dim">operator-owed</span>
                  )}
                  {s.state !== "verified" && s.daysInState >= 3 && (
                    <span className="ml-auto font-mono text-[10px] text-warn">
                      {s.daysInState}d in state
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="mt-8 font-mono text-[11px] text-dim">
        states refresh automatically — verifiers observe the real systems, not checkboxes.
      </p>
    </main>
  );
}
