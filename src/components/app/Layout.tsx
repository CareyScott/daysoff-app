import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  LogOut,
  Settings as SettingsIcon,
  ShieldCheck,
  Sun,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn, initials } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: typeof CalendarDays;
  end?: boolean;
}

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const items: NavItem[] = [
    { to: "/", label: "My Calendar", icon: CalendarDays, end: true },
    { to: "/team", label: "Team", icon: Users },
    ...(user?.role === "admin"
      ? [{ to: "/users", label: "Users", icon: ShieldCheck } satisfies NavItem]
      : []),
    { to: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  const handleLogout = () => {
    queryClient.clear();
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border-default bg-bg-sidebar px-3 py-5">
        <div className="flex items-center gap-2.5 px-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-fg shadow-sm">
            <Sun className="h-4.5 w-4.5" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">BV Vacation</span>
        </div>

        <nav className="mt-8 flex-1 space-y-1">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-bg-surface text-accent-strong shadow-sm"
                    : "text-fg-muted hover:bg-bg-surface/70 hover:text-fg-default",
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-border-default bg-bg-surface px-2.5 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong">
            {initials(user?.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-fg-muted">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Log out"
            className="rounded-md p-1.5 text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg-default"
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Log out</span>
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-6xl px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
