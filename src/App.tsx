import { useEffect } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ErrorBoundary } from "@/components/error-boundary";
import { ProtectedRoute } from "@/components/protected-route";
import { NotFound } from "@/components/not-found";
import Index from "@/pages/Index";
import AuthPage from "@/pages/Auth";
import AlertsPage from "@/pages/Alerts";

const queryClient = new QueryClient();

// Equivalent of the old root route's auth-state effect: any sign-in/out/
// user-update re-syncs query cache the same way `router.invalidate()` did.
function AuthStateSync() {
  const qc = useQueryClient();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      if (event === "SIGNED_OUT") {
        qc.clear();
      } else {
        qc.invalidateQueries();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <AuthStateSync />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/sign-in" element={<AuthPage />} />
            <Route path="/sign-up" element={<AuthPage />} />
            <Route
              path="/alerts"
              element={
                <ProtectedRoute>
                  <AlertsPage />
                </ProtectedRoute>
              }
            />
            {/* Alias for the generic "app area" entry point. */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AlertsPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster position="top-center" richColors />
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
