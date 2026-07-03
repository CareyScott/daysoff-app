import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";

/**
 * Guards the authenticated area:
 * - no token -> /login
 * - must_change_password -> force /settings until changed
 */
export function RequireAuth() {
  const { token, user } = useAuth();
  const location = useLocation();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.must_change_password && location.pathname !== "/settings") {
    return <Navigate to="/settings" replace />;
  }

  return <Outlet />;
}
