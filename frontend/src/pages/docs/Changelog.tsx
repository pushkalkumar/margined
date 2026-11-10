import DocPage from "./DocPage";

const ENTRIES: Array<{ date: string; title: string; notes: string[] }> = [
  {
    date: "2026-11-09",
    title: "Phone layout, a demo you can edit, and honest numbers",
    notes: [
      "The dashboard works on a phone: a top bar with a slide-out menu replaces the fixed sidebar below tablet width.",
      "Demo figures now reconcile everywhere. Feature costs and daily costs add up to each customer's total, recent calls are priced per model, and the landing page reads from the same dataset.",
      "In the demo, alerts, Stripe mappings and key rotation actually change things until you reload.",
      "Failed requests show what went wrong and a retry button instead of an empty table.",
      "Keyboard access for customer rows, labelled icon buttons and form fields, and a real 404 page.",
    ],
  },
  {
    date: "2026-07-27",
    title: "Node SDK, billing, and the ledger redesign",
    notes: [
      "TypeScript/Node SDK (npm: margined) with the same fail-open guarantees as Python: bounded queue, retries, idempotent delivery, AsyncLocalStorage context, client wrap().",
      "Plans and metering: Free / Starter / Growth with monthly event limits enforced at ingest; Stripe Checkout and customer portal.",
      "Break-even price now reports median COGS (the price at zero margin); recommended price unchanged.",
      "Full visual redesign: warm-paper ledger identity, financial-statement typography, no-auth live demo.",
    ],
  },
  {
    date: "2026-07-26",
    title: "Cache-aware pricing and idempotent ingestion",
    notes: [
      "All four token classes tracked per call: uncached input, output, cache reads, cache writes, each priced at each provider's actual rates.",
      "Every event carries a client-generated ID; the ingest API dedupes, so retried flushes can never double-count cost.",
      "Server-side cost recompute from raw token counts; client cost is a hint, not a trusted value.",
      "Streaming support in the Python SDK (Anthropic and OpenAI streams).",
    ],
  },
  {
    date: "2026-06-25",
    title: "First release",
    notes: [
      "Python SDK with one-argument tracking, Stripe margin column, feature cost ranking, pricing calculator, margin-at-risk alerts.",
    ],
  },
];

export default function Changelog() {
  return (
    <DocPage docNo="MG-004" title="Changelog" revised={ENTRIES[0].date}>
      <div className="space-y-12">
        {ENTRIES.map((entry) => (
          <section key={entry.date} className="grid sm:grid-cols-[140px_1fr] gap-3 sm:gap-8">
            <p className="eyebrow pt-1 figure">{entry.date}</p>
            <div>
              <h2 className="text-lg font-semibold tracking-tight mb-3">{entry.title}</h2>
              <ul className="space-y-2 text-[15px] leading-relaxed text-foreground/90 max-w-[65ch] list-none">
                {entry.notes.map((note) => (
                  <li key={note} className="pl-5 relative">
                    <span aria-hidden className="absolute left-0 top-[0.7em] h-px w-2.5 bg-muted-foreground" />
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>
    </DocPage>
  );
}
