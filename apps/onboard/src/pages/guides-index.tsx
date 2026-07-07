import { Link } from "react-router-dom";
import { GUIDES } from "../guides/content";

export default function GuidesIndex() {
  return (
    <main className="pt-8">
      <p className="font-mono text-xs tracking-widest text-dim">
        GUIDES {GUIDES.length}
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Platform guides.</h1>
      <ul className="mt-6 divide-y divide-line rounded-lg border border-line bg-surface">
        {GUIDES.map((g) => (
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
      <p className="mt-8 font-mono text-[11px] text-dim">
        bundled with the app — sourced from the platform repo, no fetches.
      </p>
    </main>
  );
}
