import type { Intake, Lead, Status } from "../domain";
export interface OwnerSession {
  email: string;
  shopSlug: string;
  shopName: string;
  csrf: string;
  expiresAt: number;
}
export interface ShopConfig {
  slug: string;
  name: string;
  retentionDays: number;
}
export interface LeadPage {
  items: Lead[];
  total: number;
  nextOffset: number | null;
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch("/api" + path, {
    credentials: "same-origin",
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    signal: options.signal || AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok)
    throw new ApiError(response.status, result.error || "Request failed.");
  return result;
}
export const backendApi = {
  config: (shop: string) =>
    api<ShopConfig>("/config?shop=" + encodeURIComponent(shop)),
  session: () => api<OwnerSession>("/session"),
  login: (shop: string, email: string, password: string) =>
    api<OwnerSession>("/login", {
      method: "POST",
      body: JSON.stringify({ shop, email, password }),
    }),
  logout: (csrf: string) =>
    api("/logout", {
      method: "POST",
      headers: { "x-csrf-token": csrf },
      body: "{}",
    }),
  list: (q: string, status: string, offset: number, signal?: AbortSignal) =>
    api<LeadPage>(
      "/leads?" + new URLSearchParams({ q, status, offset: String(offset) }),
      { signal },
    ),
  stats: () =>
    api<{ total: number; open: number; scheduled: number; spanish: number }>(
      "/stats",
    ),
  create: async (shop: string, data: Intake, key: string): Promise<Lead> => ({
    ...data,
    ...(await api<Pick<Lead, "id" | "createdAt" | "status">>(
      `/shops/${encodeURIComponent(shop)}/requests`,
      {
        method: "POST",
        headers: { "idempotency-key": key },
        body: JSON.stringify({ ...data, consent: true }),
      },
    )),
  }),
  update: (id: string, status: Status, csrf: string) =>
    api<Lead>("/leads/" + encodeURIComponent(id), {
      method: "PATCH",
      headers: { "x-csrf-token": csrf },
      body: JSON.stringify({ status }),
    }),
  remove: (id: string, csrf: string) =>
    api("/leads/" + encodeURIComponent(id), {
      method: "DELETE",
      headers: { "x-csrf-token": csrf },
    }),
};
