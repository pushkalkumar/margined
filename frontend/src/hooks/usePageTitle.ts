import { useEffect } from "react";

const SUFFIX = "Margined";

/** Per-route document title, e.g. "Pricing calculator · Margined". */
export function usePageTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${SUFFIX}` : `${SUFFIX} | Gross margin per customer for AI SaaS`;
  }, [title]);
}
