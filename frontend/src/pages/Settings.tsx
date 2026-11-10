import { useId, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Copy, Check, Trash2, Plus, Bell, CreditCard, KeyRound, Link as LinkIcon } from "lucide-react";
import { api, errorMessage, AlertConfig, CreateAlertBody } from "@/lib/api";
import { QueryError } from "@/components/QueryError";
import { usePageTitle } from "@/hooks/usePageTitle";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { format, parseISO } from "date-fns";

const inputClass =
  "w-full border rounded px-2 py-1.5 text-sm bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function Settings() {
  const { projectId } = useParams();
  const qc = useQueryClient();
  usePageTitle("Settings");

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: api.projects.list,
  });
  const projects = projectsQuery.data ?? [];
  const pid = projectId ?? projects[0]?.id;
  const project = projects.find((p) => p.id === pid);

  const alertsQuery = useQuery({
    queryKey: ["alerts", pid],
    queryFn: () => api.alerts.list(pid!),
    enabled: !!pid,
  });
  const alerts = alertsQuery.data ?? [];

  const stripeQuery = useQuery({
    queryKey: ["stripe-customers", pid],
    queryFn: () => api.stripe.listCustomers(pid!),
    enabled: !!pid,
  });
  const stripeCustomers = stripeQuery.data ?? [];

  const deleteAlertMutation = useMutation({
    mutationFn: (alertId: string) => api.alerts.delete(pid!, alertId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts", pid] }),
  });

  const toggleAlertMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.alerts.toggle(pid!, id, enabled),
    onMutate: async ({ id, enabled }) => {
      await qc.cancelQueries({ queryKey: ["alerts", pid] });
      const previous = qc.getQueryData<AlertConfig[]>(["alerts", pid]);
      qc.setQueryData<AlertConfig[]>(["alerts", pid], (list) =>
        list?.map((a) => (a.id === id ? { ...a, enabled } : a)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(["alerts", pid], context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["alerts", pid] }),
  });

  const alertMutationError = deleteAlertMutation.error ?? toggleAlertMutation.error;

  return (
    <div className="px-4 pt-6 pb-10 sm:p-6 sm:pb-12 max-w-2xl mx-auto space-y-8 sm:space-y-10">
      <h1 className="font-display text-[28px] sm:text-3xl font-medium tracking-[-0.01em]">Settings</h1>

      {projectsQuery.isError && (
        <QueryError
          error={projectsQuery.error}
          onRetry={() => projectsQuery.refetch()}
          isRetrying={projectsQuery.isFetching}
        />
      )}

      {/* API Key */}
      {project && <ApiKeySection projectId={project.id} apiKey={project.api_key} />}

      {/* Billing */}
      <BillingSection />

      {/* Alerts */}
      <Section title="Alerts" icon={<Bell className="h-4 w-4" />}>
        {alertsQuery.isLoading ? (
          <div className="h-14 bg-muted rounded-lg animate-pulse" />
        ) : alertsQuery.isError ? (
          <QueryError
            error={alertsQuery.error}
            onRetry={() => alertsQuery.refetch()}
            isRetrying={alertsQuery.isFetching}
          />
        ) : alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No alerts yet. Add one to hear about a margin-negative customer before the invoice does.
          </p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                isDeleting={deleteAlertMutation.isPending && deleteAlertMutation.variables === alert.id}
                onDelete={() => deleteAlertMutation.mutate(alert.id)}
                onToggle={(enabled) => toggleAlertMutation.mutate({ id: alert.id, enabled })}
              />
            ))}
          </ul>
        )}
        {alertMutationError && (
          <p role="alert" className="mt-2 text-[13px] text-loss">
            {errorMessage(alertMutationError)}
          </p>
        )}
        {pid && (
          <AddAlertForm projectId={pid} onCreated={() => qc.invalidateQueries({ queryKey: ["alerts", pid] })} />
        )}
      </Section>

      {/* Stripe customer mappings */}
      <Section title="Stripe customer mappings" icon={<LinkIcon className="h-4 w-4" />}>
        <p className="text-sm text-muted-foreground mb-3">
          Link your SDK <code className="bg-muted px-1 rounded">user_id</code> values to Stripe customers to
          fill in the margin column.
        </p>
        {stripeQuery.isLoading ? (
          <div className="h-24 bg-muted rounded-lg animate-pulse" />
        ) : stripeQuery.isError ? (
          <QueryError
            error={stripeQuery.error}
            onRetry={() => stripeQuery.refetch()}
            isRetrying={stripeQuery.isFetching}
          />
        ) : stripeCustomers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No mappings yet.</p>
        ) : (
          <div className="border rounded-lg overflow-x-auto bg-card">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th scope="col" className="eyebrow text-left px-3 py-2 font-medium">SDK user_id</th>
                  <th scope="col" className="eyebrow text-left px-3 py-2 font-medium hidden sm:table-cell">
                    Stripe customer
                  </th>
                  <th scope="col" className="eyebrow text-right px-3 py-2 font-medium">MRR</th>
                  <th scope="col" className="eyebrow text-left px-3 py-2 font-medium hidden sm:table-cell">Plan</th>
                </tr>
              </thead>
              <tbody>
                {stripeCustomers.map((c) => (
                  <tr key={c.customer_id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-mono max-w-[12rem]">
                      <span className="block truncate" title={c.customer_id}>
                        {c.customer_id}
                      </span>
                      <span className="block sm:hidden text-muted-foreground truncate">{c.stripe_customer}</span>
                    </td>
                    <td className="px-3 py-2 font-mono text-muted-foreground hidden sm:table-cell">
                      {c.stripe_customer}
                    </td>
                    <td className="px-3 py-2 text-right figure">
                      {c.current_mrr_usd != null ? formatCurrency(c.current_mrr_usd) : "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{c.plan_name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pid && (
          <AddStripeMapping
            projectId={pid}
            onCreated={() => qc.invalidateQueries({ queryKey: ["stripe-customers", pid] })}
          />
        )}
      </Section>
    </div>
  );
}

function ApiKeySection({ projectId, apiKey }: { projectId: string; apiKey: string }) {
  const qc = useQueryClient();
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const [confirming, setConfirming] = useState(false);

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
    setTimeout(() => setCopied("idle"), 2000);
  }

  const rotateMutation = useMutation({
    mutationFn: () => api.projects.rotateKey(projectId),
    onSuccess: () => {
      setConfirming(false);
      return qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  return (
    <Section title="SDK API key" icon={<KeyRound className="h-4 w-4" />}>
      <div className="flex items-center gap-2 bg-muted rounded-lg pl-3 pr-1.5 py-1.5 min-w-0">
        <code
          className="flex-1 min-w-0 overflow-x-auto whitespace-nowrap text-xs font-mono py-1"
          tabIndex={0}
          aria-label="API key"
        >
          {apiKey}
        </code>
        <button
          type="button"
          onClick={copyKey}
          aria-label={copied === "copied" ? "Copied" : "Copy API key"}
          className="shrink-0 p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
        >
          {copied === "copied" ? <Check className="h-4 w-4 text-profit" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-2" aria-live="polite">
        {copied === "copied"
          ? "Copied to clipboard."
          : copied === "failed"
            ? "Your browser blocked clipboard access. Select the key and copy it by hand."
            : (
              <>
                Set as <code className="bg-muted px-1 rounded">MARGINED_API_KEY</code> in your environment.
              </>
            )}
      </p>

      {confirming ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
          <span className="text-foreground">The current key stops working right away.</span>
          <button
            type="button"
            onClick={() => rotateMutation.mutate()}
            disabled={rotateMutation.isPending}
            className="px-2.5 py-1 rounded border border-loss/40 text-loss hover:bg-loss/10 transition-colors disabled:opacity-50"
          >
            {rotateMutation.isPending ? "Rotating…" : "Rotate now"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            Keep current key
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-3 text-xs text-muted-foreground hover:text-loss underline underline-offset-2"
        >
          Rotate key
        </button>
      )}
      {rotateMutation.isError && (
        <p role="alert" className="mt-2 text-xs text-loss">
          {errorMessage(rotateMutation.error)}
        </p>
      )}
    </Section>
  );
}

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter · $49/mo",
  growth: "Growth · $149/mo",
};

function BillingSection() {
  const billingQuery = useQuery({
    queryKey: ["billing"],
    queryFn: api.billing.status,
  });
  const billing = billingQuery.data;
  const [pending, setPending] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function goTo(kind: "checkout" | "portal", fn: () => Promise<{ url: string }>) {
    setPending(kind);
    setError(null);
    try {
      const { url } = await fn();
      if (!url) throw new Error("Billing did not return a page to open. Try again.");
      window.location.href = url;
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(null);
    }
  }

  if (billingQuery.isError) {
    return (
      <Section title="Plan and usage" icon={<CreditCard className="h-4 w-4" />}>
        <QueryError
          error={billingQuery.error}
          onRetry={() => billingQuery.refetch()}
          isRetrying={billingQuery.isFetching}
        />
      </Section>
    );
  }
  if (!billing) return null;

  const pct =
    billing.events_limit != null ? Math.min((billing.events_used / billing.events_limit) * 100, 100) : 0;
  const nearLimit = billing.events_limit != null && pct >= 80;
  const nextPlan = billing.plan === "free" ? "starter" : "growth";

  return (
    <Section title="Plan and usage" icon={<CreditCard className="h-4 w-4" />}>
      <div className="border rounded-lg px-4 py-3.5 space-y-3 bg-card">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-sm font-medium">{PLAN_LABELS[billing.plan] ?? billing.plan}</p>
          <p className="text-xs text-muted-foreground figure">
            {formatNumber(billing.events_used)}
            {billing.events_limit != null
              ? ` / ${formatNumber(billing.events_limit)} events`
              : " events, unlimited"}{" "}
            this month
          </p>
        </div>
        {billing.events_limit != null && (
          <div
            className="bg-muted rounded-full h-1 overflow-hidden"
            role="progressbar"
            aria-label="Events used this month"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full rounded-full ${nearLimit ? "bg-watch" : "bg-foreground/50"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
        {nearLimit && (
          <p className="text-xs text-watch">Events beyond the plan limit are dropped. Upgrade to keep tracking.</p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          {billing.plan !== "growth" && (
            <button
              type="button"
              onClick={() => goTo("checkout", () => api.billing.checkout(nextPlan))}
              disabled={pending !== null}
              className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-[13px] font-medium hover:opacity-90 active:scale-[0.96] transition-[opacity,scale] disabled:opacity-50"
            >
              {pending === "checkout" ? "Opening checkout…" : `Upgrade to ${nextPlan === "starter" ? "Starter" : "Growth"}`}
            </button>
          )}
          {billing.plan !== "free" && (
            <button
              type="button"
              onClick={() => goTo("portal", api.billing.portal)}
              disabled={pending !== null}
              className="border px-3 py-1.5 rounded-md text-[13px] hover:bg-muted transition-colors disabled:opacity-50"
            >
              {pending === "portal" ? "Opening…" : "Manage subscription"}
            </button>
          )}
        </div>
        {error && (
          <p role="alert" className="text-xs text-muted-foreground border-t pt-2.5">
            {error}
          </p>
        )}
      </div>
    </Section>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

const ALERT_TYPE_LABEL: Record<AlertConfig["alert_type"], string> = {
  margin_threshold: "Margin threshold",
  feature_spend: "Feature spend",
  bill_forecast: "Bill forecast",
};

function AlertRow({
  alert,
  isDeleting,
  onDelete,
  onToggle,
}: {
  alert: AlertConfig;
  isDeleting: boolean;
  onDelete: () => void;
  onToggle: (enabled: boolean) => void;
}) {
  const typeLabel = ALERT_TYPE_LABEL[alert.alert_type];
  const threshold =
    alert.alert_type === "margin_threshold" ? `${alert.threshold}% of MRR` : formatCurrency(alert.threshold);

  return (
    <li
      className={`flex items-center gap-3 border rounded-lg px-3 py-2.5 bg-card transition-opacity ${
        isDeleting ? "opacity-50" : ""
      } ${alert.enabled ? "" : "text-muted-foreground"}`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{typeLabel}</p>
        <p className="text-xs text-muted-foreground break-words">
          <span className="figure">{threshold}</span> · {alert.channel === "slack" ? "Slack" : "Email"} to{" "}
          <span className="font-mono break-all">{alert.destination}</span>
          {alert.last_fired_at && ` · Last fired ${format(parseISO(alert.last_fired_at), "MMM d")}`}
        </p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer shrink-0">
        <input
          type="checkbox"
          role="switch"
          checked={alert.enabled}
          onChange={(e) => onToggle(e.target.checked)}
          aria-label={`${typeLabel} alert ${alert.enabled ? "on" : "off"}`}
          className="sr-only peer"
        />
        <div className="w-9 h-5 bg-muted border rounded-full peer peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-card after:shadow-sm after:rounded-full after:h-3.5 after:w-3.5 after:transition-transform after:duration-200 peer-checked:bg-profit peer-checked:border-profit" />
      </label>
      <button
        type="button"
        onClick={onDelete}
        disabled={isDeleting}
        aria-label={`Delete ${typeLabel.toLowerCase()} alert`}
        className="shrink-0 p-1.5 rounded text-muted-foreground hover:text-loss hover:bg-loss/10 transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

const EMPTY_ALERT: CreateAlertBody = {
  alert_type: "margin_threshold",
  threshold: 50,
  channel: "email",
  destination: "",
};

function AddAlertForm({ projectId, onCreated }: { projectId: string; onCreated: () => void }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateAlertBody>(EMPTY_ALERT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!Number.isFinite(form.threshold) || form.threshold <= 0) {
      setError("Enter a threshold above zero.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.alerts.create(projectId, form);
      onCreated();
      setOpen(false);
      setForm(EMPTY_ALERT);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 flex items-center gap-1.5 text-sm text-foreground link-quiet"
      >
        <Plus className="h-4 w-4" />
        Add alert
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 border rounded-lg px-4 py-3 space-y-3 bg-card">
      <p className="text-sm font-medium">New alert</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${id}-type`} className="block text-xs text-muted-foreground mb-1">
            Type
          </label>
          <select
            id={`${id}-type`}
            value={form.alert_type}
            onChange={(e) => setForm((f) => ({ ...f, alert_type: e.target.value as CreateAlertBody["alert_type"] }))}
            className={inputClass}
          >
            <option value="margin_threshold">Margin threshold</option>
            <option value="feature_spend">Feature spend</option>
            <option value="bill_forecast">Bill forecast</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-threshold`} className="block text-xs text-muted-foreground mb-1">
            {form.alert_type === "margin_threshold" ? "Cost as % of MRR" : "Dollar amount"}
          </label>
          <input
            id={`${id}-threshold`}
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            value={Number.isFinite(form.threshold) ? form.threshold : ""}
            onChange={(e) => setForm((f) => ({ ...f, threshold: parseFloat(e.target.value) }))}
            className={`${inputClass} figure`}
          />
        </div>
        <div>
          <label htmlFor={`${id}-channel`} className="block text-xs text-muted-foreground mb-1">
            Channel
          </label>
          <select
            id={`${id}-channel`}
            value={form.channel}
            onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value as CreateAlertBody["channel"] }))}
            className={inputClass}
          >
            <option value="email">Email</option>
            <option value="slack">Slack webhook</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-destination`} className="block text-xs text-muted-foreground mb-1">
            {form.channel === "email" ? "Email address" : "Webhook URL"}
          </label>
          <input
            id={`${id}-destination`}
            type={form.channel === "email" ? "email" : "url"}
            value={form.destination}
            onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
            placeholder={form.channel === "email" ? "you@company.com" : "https://hooks.slack.com/…"}
            required
            className={inputClass}
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="text-[13px] text-loss">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !form.destination}
          className="bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save alert"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="px-3 py-1.5 rounded text-sm text-muted-foreground hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function AddStripeMapping({ projectId, onCreated }: { projectId: string; onCreated: () => void }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [sdkId, setSdkId] = useState("");
  const [stripeId, setStripeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const stripeCustomer = stripeId.trim();
    if (!stripeCustomer.startsWith("cus_")) {
      setError("Stripe customer IDs start with cus_.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.stripe.mapCustomer(projectId, { customer_id: sdkId.trim(), stripe_customer: stripeCustomer });
      onCreated();
      setOpen(false);
      setSdkId("");
      setStripeId("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 flex items-center gap-1.5 text-sm text-foreground link-quiet"
      >
        <Plus className="h-4 w-4" />
        Add mapping
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 border rounded-lg px-4 py-3 space-y-3 bg-card">
      <p className="text-sm font-medium">Link an SDK user to a Stripe customer</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${id}-sdk`} className="block text-xs text-muted-foreground mb-1">
            SDK user_id
          </label>
          <input
            id={`${id}-sdk`}
            type="text"
            value={sdkId}
            onChange={(e) => setSdkId(e.target.value)}
            placeholder="user_abc123"
            required
            autoComplete="off"
            className={`${inputClass} font-mono`}
          />
        </div>
        <div>
          <label htmlFor={`${id}-stripe`} className="block text-xs text-muted-foreground mb-1">
            Stripe customer ID
          </label>
          <input
            id={`${id}-stripe`}
            type="text"
            value={stripeId}
            onChange={(e) => setStripeId(e.target.value)}
            placeholder="cus_xyz789"
            required
            autoComplete="off"
            className={`${inputClass} font-mono`}
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="text-[13px] text-loss">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save mapping"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="px-3 py-1.5 rounded text-sm text-muted-foreground hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
