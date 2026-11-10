import { Link, useLocation } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function NotFound() {
  const { pathname } = useLocation();
  usePageTitle("Page not found");

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center">
          <Link to="/" className="font-display text-xl italic tracking-tight">
            Margined
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <p className="font-mono text-[13px] text-muted-foreground figure">404</p>
        <h1 className="mt-3 font-display display-opsz text-[40px] sm:text-[52px] leading-[1.05] tracking-[-0.02em] font-medium max-w-[16ch]">
          This page isn't on the books.
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground max-w-[52ch]">
          Nothing lives at <span className="font-mono text-foreground break-all">{pathname}</span>. The link may
          be old or mistyped.
        </p>

        <div className="mt-10 bg-card border rounded-lg overflow-hidden max-w-md">
          <NotFoundRow to="/demo" label="Open the demo dashboard" note="no account needed" />
          <NotFoundRow to="/" label="Read what Margined does" note="home" />
          <NotFoundRow to="/login" label="Sign in to your projects" note="account" />
        </div>
      </main>
    </div>
  );
}

function NotFoundRow({ to, label, note }: { to: string; label: string; note: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between gap-4 px-4 h-[46px] border-b last:border-b-0 text-sm hover:bg-muted/50 transition-colors"
    >
      <span className="font-medium">{label}</span>
      <span className="flex items-center gap-2 text-[12px] text-muted-foreground">
        {note}
        <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
