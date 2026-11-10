import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { enterDemo } from "@/lib/demo";
import Landing from "@/pages/Landing";

// The app behind sign-in (and recharts with it) loads only when it's needed,
// so the landing page stays light.
const Login = lazy(() => import("@/pages/Login"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Layout = lazy(() => import("@/components/Layout"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const CustomerDetail = lazy(() => import("@/pages/CustomerDetail"));
const PricingCalculator = lazy(() => import("@/pages/PricingCalculator"));
const Settings = lazy(() => import("@/pages/Settings"));
const Security = lazy(() => import("@/pages/docs/Security"));
const Terms = lazy(() => import("@/pages/docs/Terms"));
const Privacy = lazy(() => import("@/pages/docs/Privacy"));
const Changelog = lazy(() => import("@/pages/docs/Changelog"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function FullPageLoading() {
  return (
    <div
      role="status"
      className="flex h-[100dvh] items-center justify-center text-sm text-muted-foreground"
    >
      Loading…
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoading />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function Home() {
  const { user, loading, isDemo } = useAuth();
  if (loading) return <FullPageLoading />;
  // Demo visitors keep the landing page reachable; real sessions skip it.
  return user && !isDemo ? <Navigate to="/dashboard" replace /> : <Landing />;
}

function EnterDemo() {
  const [params] = useSearchParams();
  enterDemo();
  // Deep links stay inside the demo project; anything else lands on its dashboard.
  const to = params.get("to");
  const target = to && /^\/(dashboard|settings)\/demo(\/|$)/.test(to) ? to : "/dashboard/demo";
  return <Navigate to={target} replace />;
}

export default function App() {
  return (
    <Suspense fallback={<FullPageLoading />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/demo" element={<EnterDemo />} />
        <Route path="/security" element={<Security />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/changelog" element={<Changelog />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="dashboard/:projectId" element={<Dashboard />} />
          <Route path="dashboard/:projectId/customers/:customerId" element={<CustomerDetail />} />
          <Route path="dashboard/:projectId/pricing" element={<PricingCalculator />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/:projectId" element={<Settings />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
