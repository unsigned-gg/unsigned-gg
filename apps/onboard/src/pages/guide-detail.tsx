import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api } from "../api/client";
import { guideBySlug, type Guide } from "../guides/content";
import { GuideSections } from "../guides/render";

export default function GuideDetail() {
  const { slug = "" } = useParams();
  const { hash } = useLocation();
  const bundled = guideBySlug(slug);

  // Slugs not in the bundle are signed-in reference guides served by
  // onboard-api (same Guide shape, rendered by the same component).
  const [fetched, setFetched] = useState<Guide | null>(null);
  const [fetchErr, setFetchErr] = useState<string | null>(null);

  useEffect(() => {
    setFetched(null);
    setFetchErr(null);
    if (bundled || !slug) return;
    api
      .guide(slug)
      .then(setFetched)
      .catch((e: Error) => setFetchErr(e.message));
  }, [slug, bundled]);

  const guide = bundled ?? fetched;

  // Honor #anchor deep links from step pages (client-side nav doesn't scroll).
  useEffect(() => {
    if (!hash || !guide) return;
    document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash, slug, guide]);

  if (!guide) {
    return (
      <main className="pt-8">
        <Link to="/guides" className="font-mono text-xs text-dim hover:text-signal">← guides</Link>
        {fetchErr ? (
          <p className="mt-6 font-mono text-sm text-bad">
            {fetchErr === "no such guide" ? `no such guide: ${slug}` : `guide unavailable: ${fetchErr}`}
          </p>
        ) : (
          <p className="mt-6 font-mono text-xs text-dim">loading…</p>
        )}
      </main>
    );
  }

  return (
    <main className="pt-8">
      <Link to="/guides" className="font-mono text-xs text-dim hover:text-signal">← guides</Link>
      <p className="mt-2 font-mono text-[10px] tracking-wider text-signal">{guide.slug}</p>
      <h1 className="mt-1 text-2xl font-semibold">{guide.title}</h1>
      <p className="mt-2 max-w-2xl text-mid">{guide.purpose}</p>
      <GuideSections sections={guide.sections} />
    </main>
  );
}
