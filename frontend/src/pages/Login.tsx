import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { exitDemo } from "@/lib/demo";
import { supabase } from "@/lib/supabase";
import { usePageTitle } from "@/hooks/usePageTitle";

const fieldClass =
  "w-full border rounded-md px-3 py-2 text-sm bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function authMessage(err: unknown): string {
  if (err instanceof TypeError) return "Could not reach the sign-in service. Check your connection and try again.";
  if (err instanceof Error && err.message) return err.message;
  return "Sign-in failed. Try again.";
}

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">(
    params.get("mode") === "signup" ? "signup" : "login",
  );
  usePageTitle(mode === "login" ? "Sign in" : "Create an account");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        exitDemo(); // a real session always wins over an earlier demo visit
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        exitDemo();
        navigate("/onboarding");
      }
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    if (!email) {
      setError("Enter your email first, then we'll send the link there.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      setMagicSent(true);
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (magicSent) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="max-w-sm w-full px-6 text-center" role="status">
          <h1 className="font-display text-2xl font-medium mb-2">Check your email</h1>
          <p className="text-muted-foreground text-sm">
            We sent a sign-in link to <strong className="text-foreground break-all">{email}</strong>. Open it on
            this device to continue.
          </p>
          <button
            type="button"
            onClick={() => setMagicSent(false)}
            className="mt-6 text-sm text-muted-foreground hover:text-foreground link-quiet"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="px-4 sm:px-6 h-14 flex items-center">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center pb-14">
        <div className="w-full max-w-sm px-6">
          <div className="mb-8 text-center">
            <Link to="/" className="font-display text-3xl italic tracking-tight">
              Margined
            </Link>
            <h1 className="mt-2 text-sm text-muted-foreground font-normal">
              {mode === "login" ? "Sign in to see margin per customer" : "Create an account to track your own app"}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium mb-1.5">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={fieldClass}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium mb-1.5">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={mode === "signup" ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={fieldClass}
              />
            </div>

            {error && (
              <p role="alert" className="text-loss text-sm">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? "One moment…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="mt-3">
            <button
              type="button"
              onClick={handleMagicLink}
              disabled={loading}
              className="w-full border rounded-md px-4 py-2 text-sm bg-card hover:bg-muted transition-colors disabled:opacity-50"
            >
              Email me a sign-in link
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                No account?{" "}
                <button type="button" onClick={() => setMode("signup")} className="text-foreground link-quiet">
                  Sign up
                </button>
              </>
            ) : (
              <>
                Have an account?{" "}
                <button type="button" onClick={() => setMode("login")} className="text-foreground link-quiet">
                  Sign in
                </button>
              </>
            )}
          </p>

          <div className="mt-8 pt-6 border-t text-center">
            <Link to="/demo" className="text-sm text-foreground link-quiet">
              Try the demo without an account
            </Link>
            <p className="mt-1 text-xs text-muted-foreground">A full dashboard on sample data.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
