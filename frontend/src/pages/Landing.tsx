import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import {
  DEMO_STAR_CUSTOMER,
  demoCalculator,
  demoCustomers,
  demoFeatures,
  demoTotals,
} from "@/lib/demo";
import { marginStatus } from "@/lib/utils";
import { usePageTitle } from "@/hooks/usePageTitle";

// Every figure on this page comes from the same seeded dataset as /demo,
// so a visitor who checks the numbers in the dashboard finds the same ones.
const STATEMENT_IDS = [
  "platform@meridianhq.com",
  "team@copperleaf.io",
  "ops@brightline.ai",
  "sam@quietfox.dev",
  DEMO_STAR_CUSTOMER,
  "jules@northbeam.io",
  "mina@papertrail.app",
];

const TONE = { ok: "profit", watch: "watch", risk: "loss" } as const;

const STATEMENT_ROWS = STATEMENT_IDS.flatMap((id) => {
  const c = demoCustomers.find((row) => row.customer_id === id);
  if (!c || c.mrr == null || c.margin == null) return [];
  return [
    {
      customer: c.customer_id,
      plan: c.plan ?? "",
      mrr: c.mrr,
      cost: c.total_cost,
      margin: c.margin * 100,
      tone: TONE[marginStatus(c.margin)],
    },
  ];
});

const star = demoCustomers.find((c) => c.customer_id === DEMO_STAR_CUSTOMER)!;
const starOverspend = star.total_cost - (star.mrr ?? 0);

const callShare = (calls: number) => (calls / demoTotals.calls) * 100;
const topFeature = demoFeatures[0];
const FEATURE_ROWS: Array<[string, string, string]> = demoFeatures.slice(0, 3).map((f, i) => [
  f.feature,
  usd(f.total_cost),
  i === 0 ? `${f.pct_of_bill.toFixed(0)}% of bill` : `${f.pct_of_bill.toFixed(0)}%`,
]);

const starterTier = demoCalculator(0.7).tiers.find((t) => t.tier_name === "Starter")!;

const STATEMENT_MONTH = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

function usd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const toneClass = { profit: "text-profit", watch: "text-watch", loss: "text-loss" };

/** Accounting convention: negatives in parentheses, not minus signs. */
const marginFigure = (margin: number) =>
  margin < 0 ? `(${Math.abs(margin).toFixed(1)})%` : `${margin.toFixed(1)}%`;

export default function Landing() {
  usePageTitle();
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <span className="font-display text-xl italic tracking-tight">Margined</span>
          <nav aria-label="Primary" className="flex items-center gap-4 sm:gap-6 text-[13px]">
            <a href="#pricing" className="hidden min-[400px]:inline text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
            <a
              href="https://github.com/pushkalkumar/margined"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <Link
              to="/demo"
              className="bg-primary text-primary-foreground px-3.5 py-1.5 rounded-md font-medium hover:opacity-90 active:scale-[0.96] transition-[opacity,scale]"
            >
              Open the demo
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-12 sm:pb-14">
        <p className="eyebrow mb-5">Unit economics for AI SaaS</p>
        <h1 className="font-display display-opsz text-[40px] sm:text-[60px] leading-[1.04] tracking-[-0.02em] font-medium max-w-[16ch]">
          The P&L your LLM bill is&nbsp;hiding.
        </h1>
        <p className="mt-6 text-[17px] sm:text-lg leading-relaxed text-muted-foreground max-w-xl">
          Margined joins every model call with Stripe revenue: gross margin per
          customer, cost per feature, and the price you should be charging. One
          argument in your code.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-5">
          <Link
            to="/demo"
            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-medium hover:opacity-90 active:scale-[0.96] transition-[opacity,scale]"
          >
            Explore the live demo
          </Link>
          <a
            href="https://github.com/pushkalkumar/margined"
            className="link-quiet text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Read the quickstart
          </a>
        </div>
        <p className="mt-6 font-mono text-[13px] text-muted-foreground">
          pip install margined · free to 100K calls/mo · 5-minute setup
        </p>
      </section>

      {/* Signature: the statement */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20 sm:pb-24">
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="eyebrow">Briefly, Inc. · Statement of AI unit economics</span>
              <span className="eyebrow">{STATEMENT_MONTH} · prepared by Margined</span>
            </div>
            <p className="units-line mt-1">(in USD; margins as a percentage of MRR)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b">
                  <th scope="col" className="eyebrow text-left pl-4 pr-2 sm:px-5 py-2.5 font-medium">Customer</th>
                  <th scope="col" className="eyebrow text-left px-3 py-2.5 font-medium hidden sm:table-cell">Plan</th>
                  <th scope="col" className="eyebrow text-right px-3 py-2.5 font-medium hidden sm:table-cell">MRR</th>
                  <th scope="col" className="eyebrow text-right px-2 sm:px-3 py-2.5 font-medium whitespace-nowrap">
                    <span className="sm:hidden">Cost, 30d</span>
                    <span className="hidden sm:inline">LLM cost, 30d</span>
                  </th>
                  <th scope="col" className="eyebrow text-right pl-2 pr-4 sm:px-5 py-2.5 font-medium whitespace-nowrap">
                    <span className="sm:hidden">Margin</span>
                    <span className="hidden sm:inline">Gross margin</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {STATEMENT_ROWS.map((row, i) => (
                  <tr
                    key={row.customer}
                    className={`statement-row border-b last:border-b-0 h-[38px] ${
                      row.customer === DEMO_STAR_CUSTOMER ? "bg-loss/[0.045]" : ""
                    }`}
                    style={{ animationDelay: `${120 + i * 90}ms` }}
                  >
                    <td className="pl-4 pr-2 sm:px-5 font-mono text-xs max-w-[8.5rem] sm:max-w-none truncate">{row.customer}</td>
                    <td className="px-3 text-muted-foreground hidden sm:table-cell">{row.plan}</td>
                    <td className="px-3 text-right figure hidden sm:table-cell">{usd(row.mrr)}</td>
                    <td className="px-2 sm:px-3 text-right figure">{usd(row.cost)}</td>
                    <td className={`pl-2 pr-4 sm:px-5 text-right figure font-medium whitespace-nowrap ${toneClass[row.tone]}`}>
                      {marginFigure(row.margin)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr
                  className="statement-row statement-total h-[40px]"
                  style={{ animationDelay: `${120 + STATEMENT_ROWS.length * 90 + 50}ms` }}
                >
                  <td className="pl-4 pr-2 sm:px-5 whitespace-nowrap">{demoTotals.customers} customers</td>
                  <td className="px-3 hidden sm:table-cell" />
                  <td className="px-3 text-right figure hidden sm:table-cell">{usd(demoTotals.mrr)}</td>
                  <td className="px-2 sm:px-3 text-right figure">{usd(demoTotals.cost)}</td>
                  <td className="pl-2 pr-4 sm:px-5 text-right figure">{marginFigure(demoTotals.margin * 100)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="px-4 sm:px-5 py-3 border-t flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <p className="text-[13px] text-muted-foreground leading-relaxed max-w-[60ch]">
              <span className="font-mono text-foreground">{DEMO_STAR_CUSTOMER}</span> costs{" "}
              <span className="text-loss figure">{usd(starOverspend)}</span> more to serve each month than they
              pay. The whole book still shows a healthy margin, which is exactly why nobody notices. Neither your
              provider dashboard nor Stripe will show you this line.
            </p>
            <Link
              to={`/demo?to=${encodeURIComponent(`/dashboard/demo/customers/${DEMO_STAR_CUSTOMER}`)}`}
              className="group inline-flex items-center gap-1 text-[13px] text-foreground link-quiet whitespace-nowrap"
            >
              Open this customer in the demo
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* How it works — ledger entries */}
      <section className="border-t">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20 grid md:grid-cols-[200px_1fr] gap-10">
          <p className="eyebrow md:pt-1">How it works</p>
          <div className="space-y-12 max-w-2xl">
            <Step
              n="Entry 1"
              title="Tag every call"
              body="Wrap your existing calls, or auto-patch the client and change nothing. Two tags do all the work: who the customer is, and which feature is running."
            >
              <pre className="mt-4 bg-card border rounded-md px-4 py-3.5 font-mono text-[13px] leading-relaxed overflow-x-auto">
{`response = margined.track(
    client.messages.create(...),
    user_id=current_user.id,
    feature="summarize_document",
)`}
              </pre>
            </Step>
            <Step
              n="Entry 2"
              title="Connect Stripe"
              body="A read-only connection maps your customers to their subscriptions. Margined normalizes every plan (monthly, yearly, seat-based) to MRR."
            />
            <Step
              n="Entry 3"
              title="Read the statement"
              body="Margin per customer, cost per feature, cost per agent run. Costs are priced from a versioned table that knows what provider caches actually bill: cache reads at a tenth of input price, Anthropic cache writes at 1.25×."
            />
          </div>
        </div>
      </section>

      {/* Claims */}
      <section className="border-t">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20 space-y-16">
          <Claim
            title="Your most expensive feature is not your most valuable one."
            body={`Every call carries a feature tag, so the bill decomposes. ${topFeature.feature} is ${topFeature.pct_of_bill.toFixed(0)}% of spend on ${callShare(topFeature.call_count).toFixed(1)}% of calls. Whether the revenue justifies it stops being a feeling.`}
          >
            <MiniTable rows={FEATURE_ROWS} flagged={topFeature.feature} />
          </Claim>
          <Claim
            title="Price from your p99, not your median."
            body="The calculator reads your real usage distribution per plan tier and returns break-even and recommended prices, plus the usage cap that stops your heaviest users from eating the margin."
            flip
          >
            <MiniTable
              rows={[
                ["Break-even price (median)", usd(starterTier.break_even_price), ""],
                ["Recommended for 70% margin", usd(starterTier.recommended_price), ""],
                [
                  "Margin at p99 usage",
                  marginFigure(starterTier.margin_at_p99 * 100),
                  starterTier.usage_cap_recommendation ? "cap advised" : "",
                ],
              ]}
              flagged="Margin at p99 usage"
            />
          </Claim>
          <Claim
            title="Hear about a margin-negative customer before the invoice does."
            body="Set a threshold, say cost above 50% of a customer's MRR, and get the email or Slack message while there's still a month to act."
          >
            <div className="bg-card border rounded-md px-4 py-3.5 font-mono text-[13px] leading-relaxed">
              <p className="text-muted-foreground">margin alert · 09:00</p>
              <p className="mt-1.5 break-words">
                {DEMO_STAR_CUSTOMER} is at{" "}
                <span className="text-loss font-medium">{marginFigure((star.margin ?? 0) * 100)}</span> margin
                this month ({usd(star.total_cost)} cost / {usd(star.mrr ?? 0)} MRR).
              </p>
            </div>
          </Claim>
        </div>
      </section>

      {/* Positioning */}
      <section className="border-t">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
          <p className="max-w-2xl text-muted-foreground leading-relaxed">
            <span className="text-foreground font-medium">Built for founders, not FinOps teams.</span>{" "}
            Observability tools answer "why did this trace fail?" Margined answers
            "am I making money on this customer?" That's the question you actually ask
            when the invoice doubles.
          </p>
        </div>
      </section>

      {/* Pricing — rate card, not cards */}
      <section id="pricing" className="border-t">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <p className="eyebrow mb-3">Rate card</p>
          <h2 className="font-display text-3xl tracking-[-0.01em] font-medium mb-10">
            Pricing that would pass its own margin check.
          </h2>
          <div className="bg-card border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th scope="col" className="eyebrow text-left px-4 sm:px-5 py-2.5 font-medium">Plan</th>
                  <th scope="col" className="eyebrow text-right px-3 py-2.5 font-medium whitespace-nowrap">Per month</th>
                  <th scope="col" className="eyebrow text-right px-3 py-2.5 font-medium whitespace-nowrap">Calls included</th>
                  <th scope="col" className="eyebrow text-left px-4 sm:px-5 py-2.5 font-medium hidden md:table-cell">Includes</th>
                </tr>
              </thead>
              <tbody>
                <PriceRow name="Free" price="$0" calls="100K" includes="Cost per customer and feature, daily trend, 1 project" />
                <PriceRow name="Starter" price="$49" calls="1M" includes="Stripe margin column, email alerts, 3 projects" strong />
                <PriceRow name="Growth" price="$149" calls="Unlimited" includes="Pricing calculator, Slack alerts, API access, 5 seats" />
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-[13px] text-muted-foreground">
            Most early AI SaaS runs under 100K calls a month, so the free tier covers it.
          </p>
        </div>
      </section>

      <footer className="border-t">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-[13px] text-muted-foreground">
          <span className="font-display italic text-base text-foreground">Margined</span>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <a href="https://github.com/pushkalkumar/margined" className="hover:text-foreground transition-colors">
              GitHub
            </a>
            <Link to="/demo" className="hover:text-foreground transition-colors">
              Live demo
            </Link>
            <Link to="/changelog" className="hover:text-foreground transition-colors">
              Changelog
            </Link>
            <Link to="/security" className="hover:text-foreground transition-colors">
              Security
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link to="/login" className="hover:text-foreground transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Step({
  n,
  title,
  body,
  children,
}: {
  n: string;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p className="eyebrow mb-2">{n}</p>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{body}</p>
      {children}
    </div>
  );
}

function Claim({
  title,
  body,
  children,
  flip,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <div className={`grid md:grid-cols-2 gap-8 md:gap-14 items-center ${flip ? "md:[direction:rtl]" : ""}`}>
      <div className="md:[direction:ltr]">
        <h3 className="font-display text-[26px] leading-snug tracking-[-0.01em] font-medium max-w-md">
          {title}
        </h3>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground max-w-md">{body}</p>
      </div>
      <div className="md:[direction:ltr]">{children}</div>
    </div>
  );
}

function MiniTable({
  rows,
  flagged,
}: {
  rows: Array<[string, string, string]>;
  flagged?: string;
}) {
  return (
    <div className="bg-card border rounded-md overflow-hidden">
      {rows.map(([label, value, note]) => (
        <div key={label} className="flex items-center justify-between px-4 h-[38px] border-b last:border-b-0 text-[13px]">
          <span className="font-mono text-xs">{label}</span>
          <span className="flex items-baseline gap-2.5">
            {note && (
              <span className={`text-[11px] ${label === flagged ? "text-watch" : "text-muted-foreground"}`}>
                {note}
              </span>
            )}
            <span className="figure font-medium">{value}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function PriceRow({
  name,
  price,
  calls,
  includes,
  strong,
}: {
  name: string;
  price: string;
  calls: string;
  includes: string;
  strong?: boolean;
}) {
  return (
    <tr className="border-b last:border-b-0">
      <td className={`px-4 sm:px-5 py-3 align-top ${strong ? "font-semibold" : "font-medium"}`}>
        {name}
        <span className="md:hidden block mt-1 text-[12.5px] font-normal text-muted-foreground leading-snug">
          {includes}
        </span>
      </td>
      <td className="px-3 py-3 align-top text-right figure font-medium">{price}</td>
      <td className="px-3 py-3 align-top text-right figure text-muted-foreground">{calls}</td>
      <td className="px-4 sm:px-5 py-3 text-muted-foreground text-[13px] hidden md:table-cell">{includes}</td>
    </tr>
  );
}
