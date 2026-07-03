import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";

/** Renders children only for admins; everyone else is sent home. */
export function RequireAdmin() {
  const { user } = useAuth();

  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
