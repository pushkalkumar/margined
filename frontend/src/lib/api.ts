import { supabase } from "./supabase";
import * as demo from "./demo";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function isNotFound(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { status?: number }).status === 404;
}

/** A short, human message for an error thrown by any api call. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Your session has expired. Sign in again.";
    if (err.status >= 500) return "The Margined API is having trouble. Try again in a moment.";
    return err.message.replace(/^API error \d+:\s*/, "") || `Request failed (${err.status}).`;
  }
  if (err instanceof TypeError) return "Could not reach the Margined API. Check your connection.";
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong.";
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    let detail = text;
    try {
      const body = JSON.parse(text) as { detail?: unknown };
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      /* plain-text error body */
    }
    throw new ApiError(res.status, `API error ${res.status}: ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Projects ──────────────────────────────────────────────
export type Project = {
  id: string;
  name: string;
  api_key: string;
  created_at: string;
};

const realApi = {
  projects: {
    list: () => apiFetch<Project[]>("/projects"),
    create: (name: string) =>
      apiFetch<Project>("/projects", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    get: (id: string) => apiFetch<Project>(`/projects/${id}`),
    rotateKey: (id: string) =>
      apiFetch<Project>(`/projects/${id}/rotate-key`, { method: "POST" }),
    delete: (id: string) =>
      apiFetch<void>(`/projects/${id}`, { method: "DELETE" }),
  },

  // ── Summary ────────────────────────────────────────────
  summary: (projectId: string) =>
    apiFetch<{
      total_cost_mtd: number;
      projected_month_end: number;
      pct_change_vs_last_month: number | null;
      customers_at_risk: number;
      top_cost_driver_feature: string | null;
      total_customers: number;
    }>(`/projects/${projectId}/summary`),

  // ── Trend ──────────────────────────────────────────────
  trend: (projectId: string, days = 30) =>
    apiFetch<TrendResult>(`/projects/${projectId}/trend?days=${days}`),

  // ── Customers ──────────────────────────────────────────
  customers: {
    list: (projectId: string, params?: { from?: string; to?: string }) => {
      const qs = params
        ? "?" + new URLSearchParams(params as Record<string, string>).toString()
        : "";
      return apiFetch<CustomerRow[]>(`/projects/${projectId}/customers${qs}`);
    },
    get: (projectId: string, customerId: string) =>
      apiFetch<CustomerDetail>(`/projects/${projectId}/customers/${customerId}`),
  },

  // ── Features ───────────────────────────────────────────
  features: (projectId: string, params?: { from?: string; to?: string }) => {
    const qs = params
      ? "?" + new URLSearchParams(params as Record<string, string>).toString()
      : "";
    return apiFetch<FeatureRow[]>(`/projects/${projectId}/features${qs}`);
  },

  // ── Pricing Calculator ─────────────────────────────────
  calculator: (projectId: string, targetMargin = 0.7) =>
    apiFetch<PricingResult>(
      `/projects/${projectId}/pricing-calculator?target_margin=${targetMargin}`,
    ),

  // ── Alerts ─────────────────────────────────────────────
  alerts: {
    list: (projectId: string) =>
      apiFetch<AlertConfig[]>(`/projects/${projectId}/alerts`),
    create: (projectId: string, body: CreateAlertBody) =>
      apiFetch<AlertConfig>(`/projects/${projectId}/alerts`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    delete: (projectId: string, alertId: string) =>
      apiFetch<void>(`/projects/${projectId}/alerts/${alertId}`, {
        method: "DELETE",
      }),
    toggle: (projectId: string, alertId: string, enabled: boolean) =>
      apiFetch<AlertConfig>(`/projects/${projectId}/alerts/${alertId}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      }),
  },

  // ── Billing (Margined's own) ───────────────────────────
  billing: {
    status: () => apiFetch<BillingStatus>("/billing/status"),
    checkout: (plan: "starter" | "growth") =>
      apiFetch<{ url: string }>("/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plan }),
      }),
    portal: () => apiFetch<{ url: string }>("/billing/portal", { method: "POST" }),
  },

  // ── Stripe ─────────────────────────────────────────────
  stripe: {
    listCustomers: (projectId: string) =>
      apiFetch<StripeCustomer[]>(`/stripe/customers/${projectId}`),
    mapCustomer: (projectId: string, body: { customer_id: string; stripe_customer: string }) =>
      apiFetch<StripeCustomer>(`/stripe/customers/${projectId}/map`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    refresh: (projectId: string) =>
      apiFetch<{ refreshed: number }>(`/stripe/customers/${projectId}/refresh`, {
        method: "POST",
      }),
  },
};

// ── Demo mode ──────────────────────────────────────────────
// The /demo dashboard runs on a deterministic seeded dataset with the same
// shapes and no network. Writes go to an in-memory store, so adding,
// toggling and deleting visibly work until the page reloads.

export const DEMO_BILLING_MESSAGE =
  "Billing is turned off in the demo. Create an account to manage a real plan.";

function buildDemoApi(): typeof realApi {
  const store = {
    project: { ...demo.demoProject },
    alerts: demo.demoAlerts.map((a) => ({ ...a })),
    stripe: demo.demoStripeCustomers.map((c) => ({ ...c })),
  };
  const respond = demo.demoResponse;
  const newKey = () =>
    "mgd_demo_" +
    Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");

  return {
    projects: {
      list: () => respond(() => [{ ...store.project }]),
      create: () => respond(() => ({ ...store.project })),
      get: () => respond(() => ({ ...store.project })),
      rotateKey: () =>
        respond(() => {
          store.project = { ...store.project, api_key: newKey() };
          return { ...store.project };
        }),
      delete: () => Promise.resolve(undefined),
    },
    summary: () => respond(demo.demoSummary),
    trend: (_projectId: string, days = 30) => respond(() => demo.demoTrend(days)),
    customers: {
      list: () => respond(demo.demoCustomers),
      get: (_projectId: string, customerId: string) =>
        respond(() => demo.demoCustomerDetail(customerId)),
    },
    features: () => respond(demo.demoFeatures),
    calculator: (_projectId: string, targetMargin = 0.7) =>
      respond(() => demo.demoCalculator(targetMargin)),
    alerts: {
      list: () => respond(() => store.alerts.map((a) => ({ ...a }))),
      create: (_projectId: string, body: CreateAlertBody) =>
        respond(() => {
          const alert: AlertConfig = {
            ...body,
            id: `demo-${Date.now()}`,
            last_fired_at: null,
            enabled: true,
          };
          store.alerts = [...store.alerts, alert];
          return { ...alert };
        }),
      delete: (_projectId: string, alertId: string) =>
        respond(() => {
          store.alerts = store.alerts.filter((a) => a.id !== alertId);
          return undefined;
        }),
      toggle: (_projectId: string, alertId: string, enabled: boolean) =>
        respond(() => {
          store.alerts = store.alerts.map((a) => (a.id === alertId ? { ...a, enabled } : a));
          const updated = store.alerts.find((a) => a.id === alertId);
          if (!updated) throw new Error("API error 404: alert not found");
          return { ...updated };
        }),
    },
    billing: {
      status: () =>
        respond({
          plan: "starter" as const,
          events_used: 412_384,
          events_limit: 1_000_000,
          month: new Date().toISOString().slice(0, 7),
        }),
      checkout: () => Promise.reject(new Error(DEMO_BILLING_MESSAGE)),
      portal: () => Promise.reject(new Error(DEMO_BILLING_MESSAGE)),
    },
    stripe: {
      listCustomers: () => respond(() => store.stripe.map((c) => ({ ...c }))),
      mapCustomer: (_projectId: string, body: { customer_id: string; stripe_customer: string }) =>
        respond(() => {
          const known = demo.demoCustomers.find((c) => c.customer_id === body.customer_id);
          const mapping: StripeCustomer = {
            ...body,
            current_mrr_usd: known?.mrr ?? 99,
            plan_name: known?.plan ?? "Growth",
          };
          store.stripe = [
            ...store.stripe.filter((c) => c.customer_id !== body.customer_id),
            mapping,
          ];
          return { ...mapping };
        }),
      refresh: () => respond({ refreshed: store.stripe.length }),
    },
  };
}

const { isDemoActive } = demo;

let demoApi: typeof realApi | null = null;

// Per-call delegation so one page load can serve both a real session and a
// /demo visitor without a rebuild.
function delegate(path: string[]): unknown {
  return new Proxy(function () {} as unknown as object, {
    get: (_target, prop: string) => delegate([...path, prop]),
    apply: (_target, _thisArg, args: unknown[]) => {
      let impl: unknown = isDemoActive() ? (demoApi ??= buildDemoApi()) : realApi;
      for (const key of path) impl = (impl as Record<string, unknown>)[key];
      return (impl as (...a: unknown[]) => unknown)(...args);
    },
  });
}

export const api = delegate([]) as typeof realApi;

// ── Types ──────────────────────────────────────────────────
export type CustomerRow = {
  customer_id: string;
  total_cost: number;
  call_count: number;
  mrr: number | null;
  margin: number | null;
  plan: string | null;
  alert_status: "ok" | "watch" | "risk";
};

export type CustomerDetail = CustomerRow & {
  cost_by_feature: { feature: string; cost: number; calls: number }[];
  cost_by_day: { date: string; cost: number; calls: number }[];
  recent_calls: {
    model: string;
    feature: string;
    input_tokens: number;
    output_tokens: number;
    cost_usd: string;
    occurred_at: string;
    run_id: string | null;
  }[];
};

export type TrendPoint = {
  date: string;
  cost: number;
  calls: number;
};

export type TrendResult = {
  points: TrendPoint[];
  total_cost: number;
  total_calls: number;
};

export type FeatureRow = {
  feature: string;
  total_cost: number;
  call_count: number;
  avg_cost_per_call: number;
  pct_of_bill: number;
};

export type TierAnalysis = {
  tier_name: string;
  customer_count: number;
  median_calls: number;
  median_cogs: number;
  p90_calls: number;
  p90_cogs: number;
  p99_cogs: number;
  break_even_price: number;
  recommended_price: number;
  current_price: number | null;
  margin_at_median: number;
  margin_at_p90: number;
  margin_at_p99: number;
  usage_cap_recommendation: number | null;
};

export type PricingResult = {
  target_margin: number;
  tiers: TierAnalysis[];
};

export type AlertConfig = {
  id: string;
  alert_type: "margin_threshold" | "feature_spend" | "bill_forecast";
  threshold: number;
  channel: "email" | "slack";
  destination: string;
  last_fired_at: string | null;
  enabled: boolean;
};

export type CreateAlertBody = {
  alert_type: "margin_threshold" | "feature_spend" | "bill_forecast";
  threshold: number;
  channel: "email" | "slack";
  destination: string;
};

export type BillingStatus = {
  plan: "free" | "starter" | "growth";
  events_used: number;
  events_limit: number | null;
  month: string;
};

export type StripeCustomer = {
  customer_id: string;
  stripe_customer: string;
  current_mrr_usd: number | null;
  plan_name: string | null;
};
