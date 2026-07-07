import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type CohortRow, type TrackStep } from "../api/client";

// One compact cell per step. Full names don't fit a matrix — color carries
// state, the title attribute carries the step; the user detail page carries
// everything else.
const CELL: Record<TrackStep["state"], string> = {
  locked: "bg-surface-2",
  pending: "bg-warn/30",
  evidence_received: "bg-warn/60",
  verified: "bg-signal/60",
  operator_blocked: "bg-bad/60",
};

const TRACK_ORDER: TrackStep["track"][] = ["access", "contribution", "modules"];

function orderedSteps(steps: TrackStep[]): TrackStep[] {
  return TRACK_ORDER.flatMap((t) => steps.filter((s) => s.track === t));
}

export default function OperatorCohort() {
  const [rows, setRows] = useState<CohortRow[]>([]);
  const [err, setErr] = useState("");

  const load = () => api.cohort().then((c) => setRows(c.cohort)).catch((e) => setErr(String(e)));
  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  if (err) return <p className="py-10 font-mono text-sm text-bad">{err}</p>;
  if (!rows.length) return <p className="py-10 font-mono text-sm text-dim">no engineers in the cohort yet.</p>;

  const header = orderedSteps(rows[0].steps);

  return (
    <main className="pt-8">
      <p className="font-mono text-xs tracking-widest text-dim">COHORT · {rows.length} ENGINEERS</p>
      <h1 className="mt-1 text-2xl font-semibold">Onboarding matrix.</h1>
      <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full border-collapse font-mono text-xs">
          <thead>
            <tr className="border-b border-line text-dim">
              <th className="px-4 py-2 text-left font-normal">engineer</th>
              {TRACK_ORDER.map((t) => (
                <th
                  key={t}
                  colSpan={header.filter((s) => s.track === t).length}
                  className="px-2 py-2 text-left text-[10px] font-normal tracking-[0.14em]"
                >
                  {t.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => {
              const steps = orderedSteps(r.steps);
              const verified = steps.filter((s) => s.state === "verified").length;
              return (
                <tr key={r.id} className="hover:bg-surface-2">
                  <td className="px-4 py-2.5">
                    <Link to={`/operator/users/${r.id}`} className="text-bright hover:text-signal">
                      {r.displayName || r.email}
                    </Link>
                    <span className="ml-2 text-[10px] text-dim">{verified}/{steps.length}</span>
                  </td>
                  {steps.map((s) => (
                    <td key={s.slug} className="px-0.5 py-2.5">
                      <Link to={`/operator/users/${r.id}`} title={`${s.title} — ${s.state}`}>
                        <span className={`block h-4 w-4 rounded-sm ${CELL[s.state]}`} />
                      </Link>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 flex gap-4 font-mono text-[10px] text-dim">
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-signal/60" />verified</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-warn/30" />pending</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-warn/60" />evidence</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-bad/60" />blocked</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-surface-2" />locked</span>
      </p>
    </main>
  );
}
