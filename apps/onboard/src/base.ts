// Base-path helpers. On unsigned.gg the app serves at /onboard/ (vite
// `base`); BASE_URL carries that at build time. Router paths stay
// base-relative — anything handed to react-router or stored as OIDC state
// must go through appPath().
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export const appPath = () =>
  window.location.pathname.slice(BASE.length) || "/";
