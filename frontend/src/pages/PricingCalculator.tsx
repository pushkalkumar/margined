import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { api, TierAnalysis } from "@/lib/api";
import { QueryError } from "@/components/QueryError";
import { usePageTitle } from "@/hooks/usePageTitle";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default function PricingCalculator() {
  const { projectId } = useParams();
  const [targetMargin, setTargetMargin] = useState(0.7);
  usePageTitle("Pricing calculator");

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["calculator", projectId, targetMargin],
    queryFn: () => api.calculator(projectId!, targetMargin),
    enabled: !!projectId,
    placeholderData: (previous) => previous,
  });

  return (
    <div className="px-4 pt-6 pb-4 sm:p-6 max-w-3xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="font-display text-[28px] sm:text-3xl font-medium tracking-[-0.01em] mb-1.5">
          Pricing calculator
        </h1>
        <p className="text-muted-foreground text-sm max-w-[60ch]">
          What each plan has to cost to hit your margin target, from the last 30 days of real usage.
        </p>
      </div>

      {/* Target margin control */}
      <div className="border rounded-xl px-4 sm:px-5 py-4 bg-card space-y-3">
        <div className="flex items-center justify-between">
          <label htmlFor="target-margin" className="text-sm font-medium">
            Target gross margin
          </label>
          <output htmlFor="target-margin" className="text-xl font-semibold figure">
            {(targetMargin * 100).toFixed(0)}%
          </output>
        </div>
        <input
          id="target-margin"
          type="range"
          min={0.3}
          max={0.95}
          step={0.05}
          value={targetMargin}
          onChange={(e) => setTargetMargin(parseFloat(e.target.value))}
          aria-valuetext={`${(targetMargin * 100).toFixed(0)} percent`}
          className="w-full accent-foreground"
        />
        <div className="relative h-4 text-xs text-muted-foreground figure">
          <span className="absolute left-0">30%</span>
          <span className="absolute -translate-x-1/2" style={{ left: `${((0.7 - 0.3) / 0.65) * 100}%` }}>
            70% typical
          </span>
          <span className="absolute right-0">95%</span>
        </div>
      </div>

      {/* Tier results */}
      {isLoading && !data && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {isError && <QueryError error={error} onRetry={() => refetch()} isRetrying={isFetching} />}

      {data?.tiers.length === 0 && !isLoading && (
        <div className="border rounded-xl px-4 py-8 text-center text-muted-foreground text-sm bg-card">
          No usage in the last 30 days yet. Send events with the SDK and the calculator fills in per plan.
        </div>
      )}

      {data?.tiers.map((tier) => (
        <TierCard key={tier.tier_name} tier={tier} targetMargin={targetMargin} />
      ))}
    </div>
  );
}

function TierCard({ tier, targetMargin }: { tier: TierAnalysis; targetMargin: number }) {
  return (
    <section className="border rounded-xl overflow-hidden bg-card">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b bg-muted/30">
        <div>
          <h2 className="font-semibold">{tier.tier_name}</h2>
          <p className="text-xs text-muted-foreground">{tier.customer_count} customers</p>
        </div>
        {tier.current_price && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Current price</p>
            <p className="text-lg font-semibold figure">{formatCurrency(tier.current_price)}/mo</p>
          </div>
        )}
      </div>

      <div className="px-4 sm:px-5 py-4 space-y-5">
        {/* Usage stats */}
        <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-3 sm:gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Median usage</p>
            <p className="font-semibold figure">{formatNumber(tier.median_calls)} calls/mo</p>
            <p className="text-xs text-muted-foreground figure">{formatCurrency(tier.median_cogs)} COGS</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">P90 usage</p>
            <p className="font-semibold figure">{formatNumber(tier.p90_calls)} calls/mo</p>
            <p className="text-xs text-muted-foreground figure">{formatCurrency(tier.p90_cogs)} COGS</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">P99 COGS</p>
            <p className="font-semibold figure text-watch">{formatCurrency(tier.p99_cogs)}</p>
            <p className="text-xs text-muted-foreground">heaviest users</p>
          </div>
        </div>

        {/* Price recommendation */}
        <div className="bg-muted/40 rounded-md px-3 sm:px-4 py-3 space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-muted-foreground">Break-even price (median COGS)</span>
            <span className="figure text-sm whitespace-nowrap">{formatCurrency(tier.break_even_price)}/mo</span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium">
              Recommended price <span className="text-xs text-muted-foreground">(for {(targetMargin * 100).toFixed(0)}% margin)</span>
            </span>
            <span className="figure text-lg font-semibold whitespace-nowrap">
              {formatCurrency(tier.recommended_price)}/mo
            </span>
          </div>
        </div>

        {/* Margin at percentiles */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Margin at current price {tier.current_price ? `(${formatCurrency(tier.current_price)}/mo)` : ""}
          </p>
          <MarginRow
            label="Median user"
            margin={tier.margin_at_median}
            targetMargin={targetMargin}
          />
          <MarginRow
            label="P90 user"
            margin={tier.margin_at_p90}
            targetMargin={targetMargin}
          />
          <MarginRow
            label="P99 user"
            margin={tier.margin_at_p99}
            targetMargin={targetMargin}
            highlight
          />
        </div>

        {/* Usage cap recommendation */}
        {tier.usage_cap_recommendation && (
          <div className="flex items-start gap-2 bg-watch/10 border border-watch/30 rounded-md px-3 py-2.5 text-sm">
            <AlertTriangle className="h-4 w-4 text-watch shrink-0 mt-0.5" />
            <p>
              Consider a usage cap at{" "}
              <strong className="figure">{formatNumber(tier.usage_cap_recommendation)} calls/month</strong>{" "}
              on this tier to protect against P99 margin bleed.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function MarginRow({
  label,
  margin,
  targetMargin,
  highlight,
}: {
  label: string;
  margin: number;
  targetMargin: number;
  highlight?: boolean;
}) {
  const pct =
    margin < 0 ? `(${Math.abs(margin * 100).toFixed(1)})` : (margin * 100).toFixed(1);
  const ok = margin >= targetMargin;
  const tone = ok ? "profit" : margin >= 0 ? "watch" : "loss";
  const toneText = { profit: "text-profit", watch: "text-watch", loss: "text-loss" }[tone];
  const toneDot = { profit: "bg-profit", watch: "bg-watch", loss: "bg-loss" }[tone];

  return (
    <div className="flex items-center justify-between text-sm">
      <span className={highlight ? "text-foreground" : "text-muted-foreground"}>{label}</span>
      <span className={`inline-flex items-center gap-1.5 font-medium figure ${toneText}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${toneDot}`} />
        {pct}%
      </span>
    </div>
  );
}
