import { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { guideBySlug } from "../guides/content";
import { GuideSections } from "../guides/render";

export default function GuideDetail() {
  const { slug = "" } = useParams();
  const { hash } = useLocation();
  const guide = guideBySlug(slug);

  // Honor #anchor deep links from step pages (client-side nav doesn't scroll).
  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash, slug]);

  if (!guide) {
    return (
      <main className="pt-8">
        <Link to="/guides" className="font-mono text-xs text-dim hover:text-signal">← guides</Link>
        <p className="mt-6 font-mono text-sm text-bad">no such guide: {slug}</p>
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
