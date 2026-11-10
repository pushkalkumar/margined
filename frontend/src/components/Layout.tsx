import { Outlet, Link, NavLink, useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Settings, LogOut, ChevronDown, Plus, TrendingUp, Sun, Moon, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { applyTheme, getTheme, type Theme } from "@/lib/theme";
import { Suspense, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export default function Layout() {
  const { isDemo } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // Any navigation closes the mobile drawer.
  useEffect(() => setDrawerOpen(false), [location.pathname]);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 border-r flex-col bg-card">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="md:hidden h-14 shrink-0 flex items-center justify-between gap-3 px-4 border-b bg-card">
          <div className="flex items-center gap-2 min-w-0">
            <Link to="/" className="font-display text-xl italic tracking-tight">
              Margined
            </Link>
            {isDemo && <DemoBadge />}
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
            aria-controls="mobile-nav"
            className="-mr-2 p-2 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        {isDemo && <DemoStrip />}

        <main className="flex-1 overflow-auto overflow-x-hidden">
          <Suspense
            fallback={
              <div role="status" className="p-6 text-sm text-muted-foreground">
                Loading…
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function DemoBadge() {
  return (
    <span className="text-[10px] font-medium uppercase tracking-wider bg-watch/15 text-watch px-1.5 py-0.5 rounded">
      Demo
    </span>
  );
}

/** One quiet line so a visitor always knows the numbers are sample data. */
function DemoStrip() {
  return (
    <div className="shrink-0 border-b bg-watch/[0.06] px-4 md:px-6 py-2 text-[12.5px] text-muted-foreground flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <span>
        Sample data for <span className="text-foreground font-medium">Briefly</span>, a fictional AI
        meeting-notes app. Changes reset when you reload.
      </span>
      <Link to="/login?mode=signup" className="link-quiet text-foreground whitespace-nowrap">
        Track your own app
      </Link>
    </div>
  );
}

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [],
      );
    focusables()[0]?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  return (
    <div
      className={cn("md:hidden fixed inset-0 z-40", !open && "pointer-events-none")}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-foreground/30 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        ref={panelRef}
        id="mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={cn(
          "absolute inset-y-0 left-0 w-[17rem] max-w-[85vw] bg-card border-r flex flex-col shadow-[4px_0_24px_-8px_hsl(var(--foreground)/0.25)]",
          "transition-transform duration-300 [transition-timing-function:cubic-bezier(0.2,0,0,1)]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {open && <SidebarContent onClose={onClose} />}
      </div>
    </div>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { user, signOut, isDemo } = useAuth();
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: api.projects.list,
  });

  const currentProject = projects.find((p) => p.id === projectId) ?? projects[0];

  useEffect(() => {
    if (!projectMenuOpen) return;
    function onPointer(e: PointerEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setProjectMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setProjectMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [projectMenuOpen]);

  const navLinks = currentProject
    ? [
        { to: `/dashboard/${currentProject.id}`, label: "Dashboard", icon: BarChart3, end: true },
        { to: `/dashboard/${currentProject.id}/pricing`, label: "Pricing calculator", icon: TrendingUp, end: false },
        { to: `/settings/${currentProject.id}`, label: "Settings", icon: Settings, end: false },
      ]
    : [];

  return (
    <>
      <div className="h-14 shrink-0 flex items-center justify-between gap-2 px-4 border-b">
        <div className="flex items-center gap-2">
          <Link to="/" className="font-display text-xl italic tracking-tight">
            Margined
          </Link>
          {isDemo && <DemoBadge />}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="-mr-2 p-2 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Project selector */}
      <div ref={menuRef} className="px-3 py-3 border-b">
        <button
          type="button"
          onClick={() => setProjectMenuOpen((v) => !v)}
          aria-haspopup="true"
          aria-expanded={projectMenuOpen}
          className="w-full flex items-center justify-between px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors"
        >
          <span className="truncate font-medium">{currentProject?.name ?? "Select project"}</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground ml-1 shrink-0 transition-transform duration-200",
              projectMenuOpen && "rotate-180",
            )}
          />
        </button>

        {projectMenuOpen && (
          <div className="mt-1 rounded border bg-card shadow-[0_4px_16px_-6px_hsl(var(--foreground)/0.18)] overflow-hidden">
            {projects.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => {
                  navigate(`/dashboard/${p.id}`);
                  setProjectMenuOpen(false);
                }}
                aria-current={p.id === currentProject?.id ? "true" : undefined}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors",
                  p.id === currentProject?.id && "bg-muted font-medium",
                )}
              >
                {p.name}
              </button>
            ))}
            {isDemo ? (
              <Link
                to="/login?mode=signup"
                className="w-full text-left px-3 py-2 text-[13px] hover:bg-muted transition-colors flex items-start gap-1.5 text-muted-foreground border-t"
              >
                <Plus className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>New project needs an account</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  navigate("/onboarding");
                  setProjectMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-1.5 text-muted-foreground border-t"
              >
                <Plus className="h-3.5 w-3.5" />
                New project
              </button>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav aria-label="Main" className="flex-1 px-3 py-3 space-y-0.5">
        {navLinks.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "relative flex items-center gap-2.5 px-2 py-1.5 rounded text-sm transition-colors",
                isActive
                  ? "bg-muted text-foreground font-medium before:absolute before:-left-3 before:top-1.5 before:bottom-1.5 before:w-px before:bg-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 border-t pt-3">
        <div className="text-xs text-muted-foreground truncate mb-2 px-2">{user?.email}</div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => signOut()}
            className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-muted-foreground hover:text-foreground hover:bg-muted flex-1 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            {isDemo ? "Leave demo" : "Sign out"}
          </button>
          <ThemeToggle />
        </div>
      </div>
    </>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getTheme());

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
