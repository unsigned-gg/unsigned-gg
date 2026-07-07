import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { BASE } from "./base";
import "./index.css";

// GitHub Pages has no server rewrites: deep links under /onboard/ hit the
// root 404.html, which bounces here as /onboard/?p=<path+query>. Restore the
// real URL before the router (and the OIDC callback handler) read it.
const restore = new URLSearchParams(window.location.search).get("p");
if (restore) {
  window.history.replaceState(null, "", BASE + restore);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={BASE}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
