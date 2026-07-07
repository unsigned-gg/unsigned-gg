import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type GradeResult, type ModuleBank } from "../api/client";

// The step slug and the module bank slug are the same (module-<topic>). The
// step carries the LearnURL; we fetch it alongside the bank so the "read the
// explainer" link sits next to the quiz.
export default function ModulePlayer() {
  const { slug = "" } = useParams();
  const [bank, setBank] = useState<ModuleBank | null>(null);
  const [learnUrl, setLearnUrl] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<GradeResult | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [b, step] = await Promise.all([api.module(slug), api.step(slug)]);
      setBank(b);
      setLearnUrl(step.learnUrl ?? "");
      setTitle(step.title);
      if (step.state === "verified") setResult({ score: 0, total: 0, passScore: 0, passed: true });
    } catch (e) {
      setErr(String(e));
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  if (err) return <p className="py-10 font-mono text-sm text-bad">{err}</p>;
  if (!bank) return <p className="py-10 font-mono text-sm text-dim">loading…</p>;

  const unauthored = bank.questions.length === 0;
  const allAnswered = bank.questions.every((q) => q.id in answers);

  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      setResult(await api.attempt(slug, answers));
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  const retry = () => {
    setResult(null);
    setAnswers({});
  };

  return (
    <main className="pt-8">
      <Link to={`/steps/${slug}`} className="font-mono text-xs text-dim hover:text-signal">← step</Link>
      <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
      {learnUrl && (
        <p className="mt-2 font-mono text-xs text-dim">
          Read first:{" "}
          <a href={learnUrl} target="_blank" rel="noreferrer" className="text-signal hover:underline">
            {learnUrl.replace("https://", "")}
          </a>
        </p>
      )}

      {unauthored && (
        <p className="mt-8 rounded-lg border border-line bg-surface px-5 py-4 font-mono text-sm text-warn">
          This module's quiz bank isn't authored yet.
        </p>
      )}

      {result?.passed && (
        <div className="mt-8 rounded-lg border border-signal/40 bg-surface px-5 py-4">
          <p className="font-mono text-sm text-signal">
            ✓ Passed{result.total > 0 && ` — ${result.score}/${result.total}`}. This module is marked verified.
          </p>
          <Link to="/" className="mt-2 inline-block font-mono text-xs text-dim hover:text-signal">
            ← back to your track
          </Link>
        </div>
      )}

      {result && !result.passed && (
        <div className="mt-8 rounded-lg border border-bad/40 bg-surface px-5 py-4">
          <p className="font-mono text-sm text-bad">
            {result.score}/{result.total} — need {result.passScore} to pass. Review the explainer and try again.
          </p>
          <button onClick={retry} className="mt-2 font-mono text-xs text-signal hover:underline">
            retry
          </button>
        </div>
      )}

      {!unauthored && !result?.passed && (
        <>
          <ol className="mt-8 space-y-6">
            {bank.questions.map((q, i) => (
              <li key={q.id} className="rounded-lg border border-line bg-surface p-5">
                <p className="text-bright">
                  <span className="mr-2 font-mono text-dim">{i + 1}.</span>
                  {q.prompt}
                </p>
                <div className="mt-3 space-y-2">
                  {q.choices.map((c, ci) => (
                    <label
                      key={ci}
                      className={`flex cursor-pointer items-start gap-3 rounded border px-3 py-2 font-mono text-sm ${
                        answers[q.id] === ci
                          ? "border-signal/50 bg-surface-2 text-bright"
                          : "border-line text-dim hover:border-line hover:text-bright"
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === ci}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: ci }))}
                        className="mt-1 accent-signal"
                      />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          <button
            disabled={!allAnswered || busy}
            onClick={submit}
            className="mt-6 rounded border border-signal/40 px-4 py-2 font-mono text-sm text-signal disabled:opacity-40"
          >
            {busy ? "grading…" : `submit — pass ${bank.passScore}/${bank.questions.length}`}
          </button>
          {!allAnswered && (
            <p className="mt-2 font-mono text-[11px] text-dim">answer every question to submit.</p>
          )}
        </>
      )}
    </main>
  );
}
