import { useEffect, useState } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import UnsignedPalette from "@unsigned-gg/palette";
import { appPath } from "./base";
import { userManager } from "./auth/oidc";
import { api, type Me } from "./api/client";
import TrackView from "./pages/track-view";
import StepDetail from "./pages/step-detail";
import Settings from "./pages/settings";
import GuidesIndex from "./pages/guides-index";
import GuideDetail from "./pages/guide-detail";
import OperatorCohort from "./pages/operator-cohort";
import OperatorUser from "./pages/operator-user";
import ModulePlayer from "./pages/module-player";

function Callback() {
  const nav = useNavigate();
  useEffect(() => {
    userManager
      .signinRedirectCallback()
      .then((user) => nav((user.state as string) || "/", { replace: true }))
      .catch(() => nav("/", { replace: true }));
  }, [nav]);
  return <Splash msg="completing login…" />;
}

function Splash({ msg }: { msg: string }) {
  return (
    <div className="grid min-h-screen place-items-center font-mono text-dim">
      {msg}
    </div>
  );
}

// ⌘K command bar (canon: primary navigation on every page). Shared engine
// from @unsigned-gg/palette; this list is the app's own. Mounted once per
// App lifetime, torn down on unmount.
function usePalette() {
  const navigate = useNavigate();
  useEffect(() => {
    const bar = UnsignedPalette.init({
      getItems: (q: string) => {
        const items = [
          { hex: "0x00", label: "track — onboarding home", k2: "", run: () => navigate("/") },
          { hex: "0x01", label: "guides", k2: "", run: () => navigate("/guides") },
          { hex: "0x02", label: "settings", k2: "", run: () => navigate("/settings") },
          { hex: "cmd", label: "back to unsigned.gg", k2: "", run: () => { location.href = "/"; } },
        ];
        const needle = q.trim().toLowerCase();
        return needle
          ? items.filter((a) => `${a.hex} ${a.label}`.toLowerCase().includes(needle))
          : items;
      },
      emptyText: "nothing at that address.",
    });
    return () => bar.destroy();
  }, [navigate]);
}

export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [booting, setBooting] = useState(true);
  usePalette();

  useEffect(() => {
    if (appPath() === "/callback") {
      setBooting(false);
      return;
    }
    api
      .me()
      .then(setMe)
      .catch(() => {}) // client redirects to login itself
      .finally(() => setBooting(false));
  }, []);

  if (booting) return <Splash msg="unsigned/onboard" />;

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-6 pb-24">
      <header className="flex items-center justify-between border-b border-line py-4">
        <Link to="/" className="font-mono text-bright">
          unsigned<span className="text-signal">/onboard</span>
        </Link>
        <nav className="flex items-center gap-5 font-mono text-xs text-dim">
          {me && <span>{me.email}</span>}
          {me?.isOperator && (
            <Link to="/operator" className="hover:text-signal">cohort</Link>
          )}
          <Link to="/guides" className="hover:text-signal">guides</Link>
          <Link to="/settings" className="hover:text-signal">settings</Link>
          <button
            className="hover:text-signal"
            onClick={() => userManager.signoutRedirect()}
          >
            logout
          </button>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<TrackView />} />
        <Route path="/steps/:slug" element={<StepDetail />} />
        <Route path="/modules/:slug" element={<ModulePlayer />} />
        <Route path="/guides" element={<GuidesIndex />} />
        <Route path="/guides/:slug" element={<GuideDetail />} />
        <Route path="/operator" element={<OperatorCohort />} />
        <Route path="/operator/users/:id" element={<OperatorUser />} />
        <Route path="/settings" element={<Settings me={me} onSaved={setMe} />} />
        <Route path="/callback" element={<Callback />} />
      </Routes>
    </div>
  );
}
