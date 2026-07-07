// Keycloak OIDC via public PKCE client (onboard-web). No client secret —
// the SPA proves itself with PKCE; the API validates the resulting access
// token (aud onboard-api) on every call.
import { UserManager, WebStorageStateStore } from "oidc-client-ts";

const issuer =
  import.meta.env.VITE_OIDC_ISSUER ??
  "https://auth.unsigned.gg/realms/unsigned-paas";

export const userManager = new UserManager({
  authority: issuer,
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID ?? "onboard-web",
  redirect_uri: `${window.location.origin}${import.meta.env.BASE_URL}callback`,
  post_logout_redirect_uri: `${window.location.origin}${import.meta.env.BASE_URL}`,
  response_type: "code",
  scope: "openid profile email",
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
});

export async function getAccessToken(): Promise<string | null> {
  const user = await userManager.getUser();
  return user && !user.expired ? user.access_token : null;
}
