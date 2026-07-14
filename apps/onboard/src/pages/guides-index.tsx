import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type GuideMeta } from "../api/client";
import { GUIDES } from "../guides/content";

function GuideList({ guides }: { guides: { slug: string; title: string; purpose: string }[] }) {
  return (
    <ul className="mt-6 divide-y divide-line rounded-lg border border-line bg-surface">
      {guides.map((g) => (
        <li key={g.slug}>
          <Link
            to={`/guides/${g.slug}`}
            className="flex flex-col gap-1 px-5 py-3.5 hover:bg-surface-2"
          >
            <span className="flex items-baseline gap-3">
              <span className="font-mono text-[10px] tracking-wider text-signal">
                {g.slug}
              </span>
              <span className="text-bright">{g.title}</span>
            </span>
            <span className="text-sm text-dim">{g.purpose}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function GuidesIndex() {
  // The signed-in reference is served by onboard-api, never bundled — the
  // bundle is public, so real hostnames and IPs only exist behind auth.
  const [internal, setInternal] = useState<GuideMeta[] | null>(null);
  const [internalErr, setInternalErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .guides()
      .then((r) => setInternal(r.guides))
      .catch((e: Error) => setInternalErr(e.message));
  }, []);

  return (
    <main className="pt-8">
      <p className="font-mono text-xs tracking-widest text-dim">
        GUIDES {GUIDES.length}
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Platform guides.</h1>
      <GuideList guides={GUIDES} />

      <h2 className="mt-10 font-mono text-[13px] tracking-[0.08em] text-bright">
        Signed-in reference
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-dim">
        The real values — hostnames, the apiserver VIP, who to ping. Served to
        your session only; none of it ships in this page&apos;s public bundle.
      </p>
      {internal === null && internalErr === null && (
        <p className="mt-4 font-mono text-xs text-dim">loading…</p>
      )}
      {internalErr && (
        <p className="mt-4 font-mono text-xs text-bad">
          reference unavailable: {internalErr}
        </p>
      )}
      {internal && internal.length > 0 && <GuideList guides={internal} />}
      {internal && internal.length === 0 && (
        <p className="mt-4 font-mono text-xs text-dim">nothing published yet.</p>
      )}

      <p className="mt-8 font-mono text-[11px] text-dim">
        the top section is bundled with the app — sourced from the platform
        repo, no fetches. the full curated index lives at{" "}
        <a
          href="https://github.com/unsigned-gg/unsigned-paas/tree/main/awesome-unsigned"
          className="text-mid underline hover:text-signal"
          target="_blank"
          rel="noreferrer"
        >
          awesome-unsigned
        </a>{" "}
        (repo access required).
      </p>
    </main>
  );
}
