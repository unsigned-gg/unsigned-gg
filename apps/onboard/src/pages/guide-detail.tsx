import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api, type ApiError } from "../api/client";
import { guideBySlug, type Guide } from "../guides/content";
import { GuideSections } from "../guides/render";

export default function GuideDetail() {
  const { slug = "" } = useParams();
  const { hash } = useLocation();
  const bundled = guideBySlug(slug);

  // Slugs not in the bundle are signed-in reference guides served by
  // onboard-api (same Guide shape, rendered by the same component).
  const [fetched, setFetched] = useState<Guide | null>(null);
  const [fetchErr, setFetchErr] = useState<"not-found" | "error" | null>(null);

  useEffect(() => {
    setFetched(null);
    setFetchErr(null);
    if (bundled || !slug) return;
    // Guard against out-of-order responses: a stale fetch for a previous slug
    // must not overwrite the current one (last-write-wins would render the
    // wrong guide). The cleanup flips `ignore` before the next run.
    let ignore = false;
    api
      .guide(slug)
      .then((g) => {
        if (!ignore) setFetched(g);
      })
      .catch((e: ApiError) => {
        if (!ignore) setFetchErr(e.status === 404 ? "not-found" : "error");
      });
    return () => {
      ignore = true;
    };
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
        {fetchErr === "not-found" ? (
          <p className="mt-6 font-mono text-sm text-bad">no such guide: {slug}</p>
        ) : fetchErr === "error" ? (
          <p className="mt-6 font-mono text-sm text-bad">couldn&apos;t load this guide — try reloading.</p>
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
