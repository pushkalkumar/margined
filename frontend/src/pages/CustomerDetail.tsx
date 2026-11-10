import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { api, isNotFound } from "@/lib/api";
import { MarginBadge } from "@/components/MarginBadge";
import { QueryError } from "@/components/QueryError";
import { usePageTitle } from "@/hooks/usePageTitle";
import { formatCurrency, formatNumber, marginStatus as statusFor } from "@/lib/utils";
import { format, parseISO } from "date-fns";

export default function CustomerDetail() {
  const { projectId, customerId } = useParams<{ projectId: string; customerId: string }>();
  const navigate = useNavigate();


  const { data: customer, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["customer", projectId, customerId],
    queryFn: () => api.customers.get(projectId!, customerId!),
    enabled: !!projectId && !!customerId,
    retry: (count, err) => !isNotFound(err) && count < 1,
  });

  const backTo = `/dashboard/${projectId}`;
  usePageTitle(isError && isNotFound(error) ? "Customer not found" : customerId);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError && !isNotFound(error)) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
        <BackLink to={backTo} />
        <QueryError error={error} onRetry={() => refetch()} isRetrying={isFetching} />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        <BackLink to={backTo} />
        <div className="mt-10 max-w-md">
          <h1 className="font-display text-2xl font-medium tracking-[-0.01em]">No customer by that ID</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-mono text-foreground break-all">{customerId}</span> has no
            tracked calls in this project. The ID may be mistyped, or its events may not have arrived yet.
          </p>
          <button
            type="button"
            onClick={() => navigate(backTo)}
            className="mt-5 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90"
          >
            See all customers
          </button>
        </div>
      </div>
    );
  }

  const marginStatus = statusFor(customer.margin);
  const tick = { fontSize: 10, fill: "hsl(var(--muted-foreground))" };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <BackLink to={backTo} />
        <div className="min-w-0">
          <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap">
            <h1 className="text-lg sm:text-xl font-semibold font-mono break-all min-w-0">{customer.customer_id}</h1>
            {customer.plan && (
              <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                {customer.plan}
              </span>
            )}
            {customer.margin != null && (
              <MarginBadge margin={customer.margin} status={marginStatus} />
            )}
          </div>
          <dl className="grid grid-cols-3 sm:flex sm:gap-8 gap-3 mt-3 text-sm">
            <div>
              <dt className="eyebrow">Cost, 30d</dt>
              <dd className="figure font-medium mt-0.5">{formatCurrency(customer.total_cost)}</dd>
            </div>
            {customer.mrr != null && (
              <div>
                <dt className="eyebrow">MRR</dt>
                <dd className="figure font-medium mt-0.5">{formatCurrency(customer.mrr)}</dd>
              </div>
            )}
            <div>
              <dt className="eyebrow">Calls</dt>
              <dd className="figure font-medium mt-0.5">{formatNumber(customer.call_count)}</dd>
            </div>
          </dl>
          {customer.mrr != null && customer.total_cost > customer.mrr && (
            <p className="mt-3 text-[13px] text-loss">
              Costs {formatCurrency(customer.total_cost - customer.mrr)} more to serve each month than they pay.
            </p>
          )}
        </div>
      </div>

      {/* Cost by day */}
      {customer.cost_by_day.length > 0 && (
        <section className="border rounded-xl overflow-hidden bg-card">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold text-sm">Daily cost</h2>
          </div>
          <div className="p-3 sm:p-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={customer.cost_by_day} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => format(parseISO(d), "MMM d")}
                  tick={tick}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tickFormatter={(v) => `$${v}`}
                  tick={tick}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "hsl(var(--foreground))",
                  }}
                  formatter={(v: number) => [formatCurrency(v), "Cost"]}
                  labelFormatter={(d) => format(parseISO(d as string), "EEE, MMM d")}
                />
                <Bar
                  dataKey="cost"
                  fill={marginStatus === "risk" ? "hsl(var(--loss))" : "hsl(var(--primary))"}
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Cost by feature */}
      {customer.cost_by_feature.length > 0 && (
        <section className="border rounded-xl overflow-hidden bg-card">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold text-sm">Cost by feature</h2>
          </div>
          <div className="divide-y">
            {customer.cost_by_feature.map((f) => {
              const share = customer.total_cost > 0 ? (f.cost / customer.total_cost) * 100 : 0;
              const pct = share < 1 && share > 0 ? "<1" : share.toFixed(0);
              return (
                <div key={f.feature} className="px-4 py-3 flex items-center gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-mono truncate">{f.feature}</p>
                    <div className="mt-1.5 bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${share > 40 ? "bg-watch" : "bg-foreground/50"}`}
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-medium figure">{formatCurrency(f.cost)}</p>
                    <p className="text-xs text-muted-foreground figure">{pct}% · {formatNumber(f.calls)} calls</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent calls */}
      {customer.recent_calls.length > 0 && (
        <section className="border rounded-xl overflow-hidden bg-card">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold text-sm">Recent calls</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th scope="col" className="eyebrow text-left px-4 py-2 font-medium">Model</th>
                  <th scope="col" className="eyebrow text-left px-4 py-2 font-medium hidden sm:table-cell">Feature</th>
                  <th scope="col" className="eyebrow text-right px-4 py-2 font-medium hidden md:table-cell whitespace-nowrap">Tokens in</th>
                  <th scope="col" className="eyebrow text-right px-4 py-2 font-medium hidden md:table-cell whitespace-nowrap">Tokens out</th>
                  <th scope="col" className="eyebrow text-right px-4 py-2 font-medium">Cost</th>
                  <th scope="col" className="eyebrow text-right px-4 py-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {customer.recent_calls.map((call, i) => (
                  <tr key={`${call.occurred_at}-${i}`} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-mono">
                      {call.model}
                      <span className="block sm:hidden text-muted-foreground mt-0.5">{call.feature}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono hidden sm:table-cell">{call.feature}</td>
                    <td className="px-4 py-2.5 text-right figure hidden md:table-cell">{formatNumber(call.input_tokens)}</td>
                    <td className="px-4 py-2.5 text-right figure hidden md:table-cell">{formatNumber(call.output_tokens)}</td>
                    <td className="px-4 py-2.5 text-right figure">
                      {formatCurrency(parseFloat(call.cost_usd))}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground figure whitespace-nowrap">
                      {format(parseISO(call.occurred_at), "MMM d, HH:mm")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function BackLink({ to }: { to: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      All customers
    </Link>
  );
}
