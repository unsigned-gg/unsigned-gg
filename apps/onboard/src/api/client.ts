import { getAccessToken, userManager } from "../auth/oidc";
import { appPath } from "../base";

// Cross-origin API host (the Go API stays in paas behind
// onboard.dev.unsigned.gg/api; CORS for https://unsigned.gg comes from the
// onboard chart's Traefik middleware). Empty in dev — the vite proxy serves
// /api. Override with VITE_API_BASE at build time.
const API_BASE =
  import.meta.env.VITE_API_BASE ??
  (import.meta.env.PROD ? "https://onboard.dev.unsigned.gg" : "");

export interface TrackStep {
  slug: string;
  track: "access" | "contribution" | "modules";
  title: string;
  summary: string;
  ownership: "engineer-owed" | "operator-owed";
  prereqs?: string[];
  verifier?: string;
  learnUrl?: string;
  state: "locked" | "pending" | "evidence_received" | "verified" | "operator_blocked";
  blockedNote?: string;
  verifiedAt?: string;
  daysInState: number;
}

export interface CohortRow {
  id: string;
  email: string;
  displayName: string;
  tenantSlug: string;
  steps: TrackStep[];
}

export interface EvidenceItem {
  id: number;
  stepSlug: string;
  source: string;
  payload: unknown;
  observedAt: string;
  createdAt: string;
}

export interface OperatorUserDetail {
  user: {
    id: string;
    email: string;
    displayName: string;
    githubLogin: string;
    tailscaleLogin: string;
    tenantSlug: string;
  };
  steps: TrackStep[];
  evidence: EvidenceItem[];
}

export interface Me {
  id: string;
  email: string;
  displayName: string;
  githubLogin: string;
  tailscaleLogin: string;
  tenantSlug: string;
  isOperator: boolean;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  if (!token) {
    await userManager.signinRedirect({ state: appPath() });
    throw new Error("redirecting to login");
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (res.status === 401) {
    await userManager.signinRedirect({ state: appPath() });
    throw new Error("session expired");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  me: () => request<Me>("/api/v1/me"),
  patchMe: (patch: Partial<Pick<Me, "githubLogin" | "tailscaleLogin" | "tenantSlug">>) =>
    request<{ status: string }>("/api/v1/me", { method: "PATCH", body: JSON.stringify(patch) }),
  track: () => request<{ steps: TrackStep[] }>("/api/v1/track"),
  step: (slug: string) => request<TrackStep>(`/api/v1/steps/${slug}`),
  verifyNow: (slug: string) =>
    request<{ status: string }>(`/api/v1/steps/${slug}/verify`, { method: "POST" }),
  challenge: (slug: string) =>
    request<{ nonce: string; expiresAt: string; command: string }>(
      `/api/v1/steps/${slug}/challenge`, { method: "POST" }),
  cohort: () => request<{ cohort: CohortRow[] }>("/api/v1/operator/cohort"),
  operatorUser: (id: string) => request<OperatorUserDetail>(`/api/v1/operator/users/${id}`),
  override: (id: string, slug: string, state: string, note: string) =>
    request<{ status: string }>(`/api/v1/operator/users/${id}/steps/${slug}/override`, {
      method: "POST",
      body: JSON.stringify({ state, note }),
    }),
};
