import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  LogOut,
  Settings as SettingsIcon,
  ShieldCheck,
  Users,
} from "lucide-react";
import { BrandMark } from "@/components/app/BrandMark";
import { useAuth } from "@/lib/auth";
import { useBranding } from "@/lib/branding";
import { hapticTap } from "@/lib/haptics";
import { cn, initials } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: typeof CalendarDays;
  end?: boolean;
}

export function Layout() {
  const { user, logout } = useAuth();
  const branding = useBranding();
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
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Mobile top bar (below md) */}
      <header className="sticky top-0 z-40 flex h-12 shrink-0 items-center gap-2.5 border-b border-border-default bg-bg-surface px-4 md:hidden">
        <BrandMark className="h-7 w-7" />
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight">
          {branding.company_name}
        </span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent-strong">
          {initials(user?.name)}
        </span>
        <button
          type="button"
          onClick={handleLogout}
          title="Log out"
          className="rounded-md p-1.5 text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg-default"
        >
          <LogOut className="h-4 w-4" />
          <span className="sr-only">Log out</span>
        </button>
      </header>

      {/* Desktop sidebar (md and up) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border-default bg-bg-sidebar px-3 py-5 md:flex">
        <div className="flex items-center gap-2.5 px-2">
          <BrandMark className="h-8 w-8" />
          <span className="truncate text-[15px] font-semibold tracking-tight">
            {branding.company_name}
          </span>
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
        {/* pb-20 keeps the mobile tab bar from covering content */}
        <div className="mx-auto w-full max-w-6xl px-4 py-5 pb-20 md:px-8 md:py-8 md:pb-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tab bar (below md) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border-default bg-bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Primary"
      >
        <div className="flex h-14">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => hapticTap()}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                  isActive ? "text-accent-strong" : "text-fg-muted",
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
