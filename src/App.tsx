import { useEffect } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ErrorBoundary } from "@/components/error-boundary";
import { ProtectedRoute } from "@/components/protected-route";
import { NotFound } from "@/components/not-found";
import Index from "@/pages/Index";
import AuthPage from "@/pages/Auth";
import PlansPage from "@/pages/Plans";
import PrivacyPage from "@/pages/Privacy";

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
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/sign-in" element={<AuthPage />} />
            <Route path="/sign-up" element={<AuthPage />} />
            {/* 2026-09-01：/alerts 舊的 Supabase 訂閱系統已退役，
                通知功能全部整合進 /plans（AWS 那套），這裡改成導向，
                避免使用者繼續寫進不會被排程掃到的舊表。 */}
            <Route path="/alerts" element={<Navigate to="/plans" replace />} />
            {/* Alias for the generic "app area" entry point. */}
            <Route path="/app" element={<Navigate to="/plans" replace />} />
            <Route
              path="/plans"
              element={
                <ProtectedRoute>
                  <PlansPage />
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
