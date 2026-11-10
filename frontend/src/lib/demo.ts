/**
 * Demo mode: a fully explorable dashboard with a deterministic seeded
 * dataset. No backend, no auth. Active when VITE_DEMO_MODE=1, when no
 * Supabase project is configured, or after a visit to /demo.
 *
 * Every number on every demo screen comes from this one dataset, so the
 * landing page, the dashboard and the customer pages always agree.
 */

import type {
  AlertConfig,
  CustomerDetail,
  CustomerRow,
  FeatureRow,
  PricingResult,
  Project,
  StripeCustomer,
  TrendPoint,
  TrendResult,
} from "./api";

const DEMO_FLAG = "margined-demo";

/** Demo is active when no backend is configured, or the visitor entered
 *  through /demo (session-scoped so real sign-ins are unaffected). */
export function isDemoActive(): boolean {
  if (import.meta.env.VITE_DEMO_MODE === "1") return true;
  if (!import.meta.env.VITE_SUPABASE_URL) return true;
  try {
    return sessionStorage.getItem(DEMO_FLAG) === "1";
  } catch {
    return false;
  }
}

export function enterDemo(): void {
  try {
    sessionStorage.setItem(DEMO_FLAG, "1");
  } catch {
    /* storage blocked: demo still works for this page load via the env checks */
  }
}

export function exitDemo(): void {
  try {
    sessionStorage.removeItem(DEMO_FLAG);
  } catch {
    /* nothing to clear */
  }
}

// Mulberry32: deterministic PRNG so the demo is identical on every load
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a, so each customer gets its own stable random stream. */
function hashString(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** YYYY-MM-DD in the visitor's local calendar (toISOString would use UTC). */
function localDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Scale integer counts so they sum exactly to `total`, keeping proportions. */
function apportion(weights: number[], total: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => (w / sum) * total);
  const floored = raw.map(Math.floor);
  let remainder = total - floored.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (remainder <= 0) break;
    floored[i] += 1;
    remainder -= 1;
  }
  return floored;
}

/** Split a dollar amount into cents that sum exactly to it. */
function apportionDollars(weights: number[], total: number): number[] {
  return apportion(weights, Math.round(total * 100)).map((cents) => cents / 100);
}

const rand = mulberry32(42);
const between = (lo: number, hi: number) => lo + rand() * (hi - lo);

// "Briefly": a fictional AI meeting-notes SaaS
const PLANS: Array<{ plan: string; mrr: number; names: string[] }> = [
  {
    plan: "Starter",
    mrr: 29,
    names: ["devon@solowork.co", "mina@papertrail.app", "jules@northbeam.io", "sam@quietfox.dev", "ivy@plainsight.so", "theo@driftlab.ai", "noor@stackpine.com", "kai@seafloor.app"],
  },
  {
    plan: "Growth",
    mrr: 99,
    names: ["ops@brightline.ai", "team@copperleaf.io", "eng@fieldday.app", "hello@tallgrass.co", "dev@lanternworks.io", "crew@bluebarn.dev", "team@mosswood.ai", "ops@harborlight.co", "eng@redcedar.app", "team@stonefruit.io"],
  },
  {
    plan: "Scale",
    mrr: 299,
    names: ["platform@meridianhq.com", "ai@vantagerow.com", "eng@ledgerline.co", "core@summitpeak.ai", "platform@ironbridge.io", "eng@atlascove.com"],
  },
];

/** Per-feature model and typical token shape. Average cost per call falls
 *  out of the model price table, so recent calls and totals agree. */
const FEATURES = [
  { feature: "meeting_summary", weight: 0.4, model: "claude-sonnet-4-6", input: 2500, output: 250 },
  { feature: "action_items", weight: 0.25, model: "claude-haiku-4-5", input: 1800, output: 200 },
  { feature: "research_agent", weight: 0.1, model: "claude-opus-5", input: 25000, output: 2600 },
  { feature: "chat_assistant", weight: 0.2, model: "gpt-4o-mini", input: 6000, output: 1100 },
  { feature: "weekly_digest", weight: 0.05, model: "claude-sonnet-4-6", input: 9000, output: 900 },
] as const;

/** USD per token: [input, output]. Mirrors backend/app/pricing.py. */
const MODEL_PRICES: Record<string, [number, number]> = {
  "claude-opus-5": [5e-6, 25e-6],
  "claude-sonnet-4-6": [3e-6, 15e-6],
  "claude-haiku-4-5": [1e-6, 5e-6],
  "gpt-4o-mini": [0.15e-6, 0.6e-6],
};

const callCost = (model: string, input: number, output: number) => {
  const [inPrice, outPrice] = MODEL_PRICES[model];
  return input * inPrice + output * outPrice;
};

const FEATURE_AVG_COST = Object.fromEntries(
  FEATURES.map((f) => [f.feature, callCost(f.model, f.input, f.output)]),
) as Record<string, number>;

type DemoCustomer = CustomerRow & { activity: number; featureCost: number[]; featureCalls: number[] };

/** The demo's star: a Starter customer who costs more than they pay. */
export const DEMO_STAR_CUSTOMER = "devon@solowork.co";

/** Monthly calls per unit of activity, tuned so a typical Growth account runs near 90% margin. */
const CALL_SCALE = 6;

function buildCustomers(): DemoCustomer[] {
  const list: DemoCustomer[] = [];
  for (const tier of PLANS) {
    for (const name of tier.names) {
      const activity = Math.min(1 / Math.pow(1 - rand(), 0.55) - 0.4, 22);
      list.push({
        customer_id: name,
        plan: tier.plan,
        mrr: tier.mrr,
        activity: name === DEMO_STAR_CUSTOMER ? 4.05 : activity,
        total_cost: 0,
        call_count: 0,
        margin: null,
        alert_status: "ok",
        featureCost: [],
        featureCalls: [],
      });
    }
  }

  for (const customer of list) {
    const calls = Math.round(customer.activity * between(70, 130) * CALL_SCALE);
    // Heavy users lean on the research agent; that is where the money goes.
    const agentLean = Math.min(customer.activity / 8, 2.2);
    const mix = FEATURES.map((f) =>
      f.weight * between(0.8, 1.25) * (f.feature === "research_agent" ? agentLean : 1),
    );
    const featureCalls = apportion(mix, calls);
    const featureCost = featureCalls.map(
      (n, i) => round2(n * FEATURE_AVG_COST[FEATURES[i].feature] * between(0.9, 1.1)),
    );
    const cost = round2(featureCost.reduce((a, b) => a + b, 0));
    customer.call_count = calls;
    customer.featureCalls = featureCalls;
    customer.featureCost = featureCost;
    customer.total_cost = cost;
    customer.margin = Math.round(((customer.mrr! - cost) / customer.mrr!) * 10000) / 10000;
    customer.alert_status = customer.margin < 0.4 ? "risk" : customer.margin < 0.7 ? "watch" : "ok";
  }
  return list.sort((a, b) => b.total_cost - a.total_cost);
}

const customers = buildCustomers();

const totalCost = round2(customers.reduce((sum, c) => sum + c.total_cost, 0));
const totalCalls = customers.reduce((sum, c) => sum + c.call_count, 0);
const totalMrr = customers.reduce((sum, c) => sum + (c.mrr ?? 0), 0);

// ── Public fixtures ───────────────────────────────────────────

export const demoProject: Project = {
  id: "demo",
  name: "Briefly (demo)",
  api_key: "mgd_demo_k3y_create_a_real_project_to_get_yours",
  created_at: "2026-06-12T09:00:00Z",
};

export const demoCustomers: CustomerRow[] = customers.map(
  ({ activity: _a, featureCost: _c, featureCalls: _n, ...row }) => row,
);

export const demoTotals = {
  customers: customers.length,
  mrr: totalMrr,
  cost: totalCost,
  calls: totalCalls,
  margin: (totalMrr - totalCost) / totalMrr,
};

export const demoFeatures: FeatureRow[] = (() => {
  const rows = FEATURES.map((f, i) => {
    const cost = round2(customers.reduce((sum, c) => sum + c.featureCost[i], 0));
    const calls = customers.reduce((sum, c) => sum + c.featureCalls[i], 0);
    return { feature: f.feature, total_cost: cost, call_count: calls };
  });
  const featureTotal = rows.reduce((sum, f) => sum + f.total_cost, 0);
  return rows
    .map((f) => ({
      ...f,
      avg_cost_per_call: f.call_count ? Math.round((f.total_cost / f.call_count) * 10000) / 10000 : 0,
      pct_of_bill: Math.round((f.total_cost / featureTotal) * 1000) / 10,
    }))
    .sort((a, b) => b.total_cost - a.total_cost);
})();

/** Relative weight of a calendar day: costs trend up, weekends run quiet. */
function dayWeight(d: Date, daysAgo: number): number {
  const growth = 1.25 - (daysAgo / 30) * 0.7;
  const weekend = d.getDay() === 0 || d.getDay() === 6 ? 0.55 : 1;
  const noise = 0.82 + mulberry32(d.getDate() * 7 + d.getMonth() * 31)() * 0.4;
  return Math.max(growth, 0.15) * weekend * noise;
}

export function demoTrend(days: number): TrendResult {
  const today = new Date();
  const span = Math.max(days, 30);
  const dates: Date[] = [];
  const weights: number[] = [];
  for (let i = span - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    dates.push(d);
    weights.push(dayWeight(d, i));
  }
  // The trailing 30 days add up to the same cost and calls as the customer table.
  const last30 = weights.slice(-30);
  const scale = last30.reduce((a, b) => a + b, 0);
  const costs = apportionDollars(last30, totalCost);
  const calls = apportion(last30, totalCalls);
  const earlier = weights.slice(0, span - 30);

  const points: TrendPoint[] = [
    ...earlier.map((w, i) => ({
      date: localDate(dates[i]),
      cost: round2((w / scale) * totalCost),
      calls: Math.round((w / scale) * totalCalls),
    })),
    ...last30.map((_, i) => ({
      date: localDate(dates[span - 30 + i]),
      cost: costs[i],
      calls: calls[i],
    })),
  ].slice(-days);

  return {
    points,
    total_cost: round2(points.reduce((sum, p) => sum + p.cost, 0)),
    total_calls: points.reduce((sum, p) => sum + p.calls, 0),
  };
}

export const demoSummary = (() => {
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const elapsed = demoTrend(today.getDate()).total_cost;
  return {
    total_cost_mtd: round2(elapsed),
    projected_month_end: round2((elapsed / today.getDate()) * daysInMonth),
    pct_change_vs_last_month: 34.2,
    customers_at_risk: customers.filter((c) => (c.margin ?? 1) < 0.4).length,
    top_cost_driver_feature: demoFeatures[0].feature,
    total_customers: customers.length,
  };
})();

export class DemoNotFoundError extends Error {
  status = 404;
}

export function demoCustomerDetail(customerId: string): CustomerDetail {
  const row = customers.find((c) => c.customer_id === customerId);
  if (!row) throw new DemoNotFoundError(`API error 404: customer ${customerId} not found`);
  const rng = mulberry32(hashString(customerId));
  const jitter = (lo: number, hi: number) => lo + rng() * (hi - lo);

  const byFeature = FEATURES.map((f, i) => ({
    feature: f.feature,
    cost: row.featureCost[i],
    calls: row.featureCalls[i],
  }))
    .filter((f) => f.calls > 0)
    .sort((a, b) => b.cost - a.cost);

  const today = new Date();
  const dayDates: Date[] = [];
  const dayWeights: number[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    dayDates.push(d);
    const weekend = d.getDay() === 0 || d.getDay() === 6 ? 0.5 : 1;
    dayWeights.push(weekend * jitter(0.6, 1.5));
  }
  const dayCosts = apportionDollars(dayWeights, row.total_cost);
  const dayCalls = apportion(dayWeights, row.call_count);
  const byDay = dayDates.map((d, i) => ({ date: localDate(d), cost: dayCosts[i], calls: dayCalls[i] }));

  const featureWeights = row.featureCalls;
  const callTotal = featureWeights.reduce((a, b) => a + b, 0) || 1;
  const pickFeature = () => {
    let r = rng() * callTotal;
    for (let i = 0; i < FEATURES.length; i++) {
      r -= featureWeights[i];
      if (r <= 0) return FEATURES[i];
    }
    return FEATURES[0];
  };

  const recentCalls: CustomerDetail["recent_calls"] = [];
  let when = today.getTime() - jitter(2, 40) * 60_000;
  for (let i = 0; i < 20; i++) {
    const f = pickFeature();
    const input = Math.round(f.input * jitter(0.6, 1.5));
    const output = Math.round(f.output * jitter(0.5, 1.6));
    recentCalls.push({
      model: f.model,
      feature: f.feature,
      input_tokens: input,
      output_tokens: output,
      cost_usd: callCost(f.model, input, output).toFixed(6),
      occurred_at: new Date(when).toISOString(),
      run_id: f.feature === "research_agent" ? `run_${Math.floor(rng() * 1e8).toString(16)}` : null,
    });
    when -= jitter(6, 180) * 60_000;
  }

  const { activity: _a, featureCost: _c, featureCalls: _n, ...base } = row;
  return { ...base, cost_by_feature: byFeature, cost_by_day: byDay, recent_calls: recentCalls };
}

export function demoCalculator(targetMargin: number): PricingResult {
  const tiers = PLANS.map((tier) => {
    const tierCustomers = customers.filter((c) => c.plan === tier.plan);
    const costs = tierCustomers.map((c) => c.total_cost).sort((a, b) => a - b);
    const calls = tierCustomers.map((c) => c.call_count).sort((a, b) => a - b);
    const pick = (arr: number[], p: number) =>
      arr[Math.min(Math.round((p / 100) * (arr.length - 1)), arr.length - 1)] ?? 0;
    const medianCogs = pick(costs, 50);
    const p90Cogs = pick(costs, 90);
    const p99Cogs = pick(costs, 99);
    const recommended = medianCogs / (1 - targetMargin);
    const marginAt = (cogs: number) => Math.round(((tier.mrr - cogs) / tier.mrr) * 10000) / 10000;
    return {
      tier_name: tier.plan,
      customer_count: tierCustomers.length,
      median_calls: pick(calls, 50),
      median_cogs: round2(medianCogs),
      p90_calls: pick(calls, 90),
      p90_cogs: round2(p90Cogs),
      p99_cogs: round2(p99Cogs),
      break_even_price: round2(medianCogs),
      recommended_price: round2(recommended),
      current_price: tier.mrr,
      margin_at_median: marginAt(medianCogs),
      margin_at_p90: marginAt(p90Cogs),
      margin_at_p99: marginAt(p99Cogs),
      usage_cap_recommendation: marginAt(p99Cogs) < 0.4 ? Math.round(pick(calls, 90) * 1.2) : null,
    };
  });
  return { target_margin: targetMargin, tiers };
}

export const demoAlerts: AlertConfig[] = [
  {
    id: "demo-alert-1",
    alert_type: "margin_threshold",
    threshold: 50,
    channel: "email",
    destination: "founder@briefly.app",
    last_fired_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    enabled: true,
  },
  {
    id: "demo-alert-2",
    alert_type: "bill_forecast",
    threshold: 500,
    channel: "slack",
    destination: "https://hooks.slack.com/services/T00/B00/demo",
    last_fired_at: null,
    enabled: true,
  },
];

export const demoStripeCustomers: StripeCustomer[] = customers.slice(0, 12).map((c) => ({
  customer_id: c.customer_id,
  stripe_customer: `cus_${c.customer_id.split("@")[0].slice(0, 10)}`,
  current_mrr_usd: c.mrr,
  plan_name: c.plan,
}));

const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

/** Small artificial latency so loading states render naturally. */
export async function demoResponse<T>(value: T | (() => T)): Promise<T> {
  await delay(80 + Math.random() * 160);
  return typeof value === "function" ? (value as () => T)() : value;
}
