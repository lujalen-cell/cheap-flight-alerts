import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const AuthUserContext = createContext<{ user: User } | null>(null);

// Equivalent of the old `_authenticated` route's `Route.useRouteContext()` —
// pages nested under <ProtectedRoute> read the verified user from here.
export function useAuthUser() {
  const ctx = useContext(AuthUserContext);
  if (!ctx) throw new Error("useAuthUser must be used within a ProtectedRoute");
  return ctx;
}

// Client-side equivalent of the old `_authenticated` route's `beforeLoad`:
// verifies the session before rendering children, redirecting to /auth if
// there isn't one.
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [state, setState] = useState<{ status: "loading" | "authed" | "anon"; user: User | null }>({
    status: "loading",
    user: null,
  });

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data.user) {
        setState({ status: "anon", user: null });
      } else {
        setState({ status: "authed", user: data.user });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (state.status === "loading") return null;
  if (state.status === "anon" || !state.user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  return (
    <AuthUserContext.Provider value={{ user: state.user }}>{children}</AuthUserContext.Provider>
  );
}
