import { useEffect, useState } from "react";
import { api, type Me } from "../api/client";

export default function Settings({ me, onSaved }: { me: Me | null; onSaved: (m: Me) => void }) {
  const [github, setGithub] = useState("");
  const [tailscale, setTailscale] = useState("");
  const [tenant, setTenant] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (me) {
      setGithub(me.githubLogin);
      setTailscale(me.tailscaleLogin);
      setTenant(me.tenantSlug);
    }
  }, [me]);

  const save = async () => {
    try {
      await api.patchMe({ githubLogin: github, tailscaleLogin: tailscale, tenantSlug: tenant });
      const fresh = await api.me();
      onSaved(fresh);
      setMsg("saved.");
    } catch (e) {
      setMsg(String(e));
    }
  };

  const field = "mt-1 w-full rounded border border-line bg-surface-2 px-3 py-2 font-mono text-sm text-bright";
  return (
    <main className="max-w-md pt-8">
      <h1 className="text-2xl font-semibold">Settings.</h1>
      <p className="mt-2 text-mid">
        Verifiers match you against these identities — get them right or nothing verifies.
      </p>
      <label className="mt-6 block font-mono text-xs text-dim">
        github login (PR verification)
        <input className={field} value={github} onChange={(e) => setGithub(e.target.value)} placeholder="your-gh-handle" />
      </label>
      <label className="mt-4 block font-mono text-xs text-dim">
        tailscale login (device match — usually your email)
        <input className={field} value={tailscale} onChange={(e) => setTailscale(e.target.value)} placeholder="you@example.com" />
      </label>
      <label className="mt-4 block font-mono text-xs text-dim">
        tenant slug (your sandbox is tenant-&lt;slug&gt;)
        <input className={field} value={tenant} onChange={(e) => setTenant(e.target.value)} placeholder="kebab-case" />
      </label>
      <button onClick={save} className="mt-6 rounded border border-signal/40 bg-signal/10 px-5 py-2 font-mono text-sm text-signal">
        save
      </button>
      {msg && <p className="mt-3 font-mono text-xs text-dim">{msg}</p>}
    </main>
  );
}
