import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type TrackStep } from "../api/client";
import { guideForStep } from "../guides/content";

export default function StepDetail() {
  const { slug = "" } = useParams();
  const [step, setStep] = useState<TrackStep | null>(null);
  const [msg, setMsg] = useState("");
  const [challenge, setChallenge] = useState<{ command: string; expiresAt: string } | null>(null);

  const load = useCallback(
    () => api.step(slug).then(setStep).catch((e) => setMsg(String(e))),
    [slug],
  );
  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  if (!step) return <p className="py-10 font-mono text-sm text-dim">{msg || "loading…"}</p>;

  const verifyNow = () =>
    api.verifyNow(slug).then(() => setMsg("verification requested — watching…")).catch((e) => setMsg(String(e)));

  const mintChallenge = () =>
    api.challenge(slug).then(setChallenge).catch((e) => setMsg(String(e)));

  return (
    <main className="pt-8">
      <Link to="/" className="font-mono text-xs text-dim hover:text-signal">← track</Link>
      <h1 className="mt-2 text-2xl font-semibold">{step.title}</h1>
      <p className="mt-2 max-w-xl text-mid">{step.summary}</p>

      <div className="mt-6 rounded-lg border border-line bg-surface p-5 font-mono text-sm">
        <p>
          state: <b className={step.state === "verified" ? "text-signal" : "text-warn"}>{step.state}</b>
          {step.verifiedAt && <span className="text-dim"> · {new Date(step.verifiedAt).toDateString()}</span>}
        </p>
        {step.blockedNote && <p className="mt-2 text-bad">operator note: {step.blockedNote}</p>}
        {step.ownership === "operator-owed" && step.state !== "verified" && (
          <p className="mt-2 text-dim">
            this step is operator-owed — it appears in the operator's queue; nothing for you to run.
          </p>
        )}

        {step.slug === "access-kubeconfig" && step.state !== "verified" && (
          <div className="mt-4">
            <button onClick={mintChallenge} className="rounded border border-signal/40 bg-signal/10 px-4 py-1.5 text-signal">
              mint challenge
            </button>
            {challenge && (
              <div className="mt-3 rounded bg-surface-2 p-3 text-xs">
                <p className="text-dim"># run with YOUR kubeconfig (expires {new Date(challenge.expiresAt).toLocaleTimeString()})</p>
                <code className="text-bright">{challenge.command}</code>
              </div>
            )}
          </div>
        )}

        {/* Module steps complete via the quiz, not a verifier poll. */}
        {step.track === "modules" && (
          <Link
            to={`/modules/${step.slug}`}
            className="mt-4 inline-block rounded border border-signal/40 bg-signal/10 px-4 py-1.5 text-signal"
          >
            {step.state === "verified" ? "review module" : "take module quiz"}
          </Link>
        )}

        {step.track !== "modules" && step.state !== "verified" && step.ownership === "engineer-owed" && step.slug !== "access-kubeconfig" && (
          <button onClick={verifyNow} className="mt-4 rounded border border-signal/40 bg-signal/10 px-4 py-1.5 text-signal">
            verify now
          </button>
        )}
        {msg && <p className="mt-3 text-xs text-dim">{msg}</p>}
      </div>

      {(() => {
        const g = guideForStep(step.slug);
        if (!g) return null;
        return (
          <p className="mt-6 text-mid">
            In-app guide:{" "}
            <Link
              to={`/guides/${g.guide.slug}${g.anchor ? `#${g.anchor}` : ""}`}
              className="text-signal underline"
            >
              {g.guide.title}
            </Link>
          </p>
        );
      })()}

      {step.learnUrl && (
        <p className="mt-6 text-mid">
          Study the explainer first:{" "}
          <a href={step.learnUrl} target="_blank" rel="noreferrer" className="text-signal underline">
            {step.learnUrl}
          </a>{" "}
          — then pass the quiz here (quizzes come online per-module).
        </p>
      )}
    </main>
  );
}
