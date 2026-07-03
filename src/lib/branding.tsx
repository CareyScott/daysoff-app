import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export interface WorkspaceSettings {
  company_name: string;
  accent_color: string;
  /** Optional second gradient stop; solid color when null. */
  accent_color2: string | null;
  /** Optional company logo as a small data URL. */
  logo_data: string | null;
  /** Members' vacation requests need an admin approval when true. */
  require_approval: boolean;
  /** Hide company name + logo on the login screen only. */
  hide_login_branding: boolean;
}

export const DEFAULT_BRANDING: WorkspaceSettings = {
  company_name: "Daysoff",
  accent_color: "#0d9488",
  accent_color2: null,
  logo_data: null,
  require_approval: false,
  hide_login_branding: false,
};

// Separate snapshots for the anonymous (login screen) and authenticated
// states: the anonymous one may be masked and must never contain the
// company identity when hiding is on; the authenticated one is complete.
function cacheKey(authed: boolean): string {
  return authed ? "daysoff-branding:auth" : "daysoff-branding:anon";
}

function readCachedBranding(authed: boolean): WorkspaceSettings | undefined {
  try {
    const raw = localStorage.getItem(cacheKey(authed));
    return raw ? (JSON.parse(raw) as WorkspaceSettings) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Workspace branding from the API. The server masks company name + logo on
 * anonymous requests when hide_login_branding is on, so the login screen
 * stays anonymous while the logged-in app shows full branding. Fetches are
 * keyed by auth state so logging in refetches the full payload. Paints
 * instantly from a localStorage snapshot to avoid a flash of defaults.
 */
export function useBranding(): WorkspaceSettings {
  const { token } = useAuth();
  const authed = Boolean(token);

  const { data } = useQuery({
    queryKey: ["settings", authed],
    queryFn: async () => {
      const settings = await api<WorkspaceSettings>("/api/settings", { auth: authed });
      try {
        localStorage.setItem(cacheKey(authed), JSON.stringify(settings));
      } catch {
        // cache is best-effort
      }
      return settings;
    },
    placeholderData: () => readCachedBranding(authed),
    staleTime: 5 * 60_000,
    retry: 1,
  });
  return data ?? DEFAULT_BRANDING;
}

/** CSS background for brand surfaces: gradient when a second stop is set. */
export function brandBackground(branding: WorkspaceSettings): string {
  return branding.accent_color2
    ? `linear-gradient(135deg, ${branding.accent_color}, ${branding.accent_color2})`
    : branding.accent_color;
}

/**
 * Applies the workspace accent color to the Tailwind design tokens, sets
 * the document title and favicon. Mount once at the app root.
 */
export function BrandingEffect() {
  const branding = useBranding();

  useEffect(() => {
    const root = document.documentElement.style;
    const accent = branding.accent_color;
    root.setProperty("--color-accent", accent);
    root.setProperty("--color-accent-strong", `color-mix(in srgb, ${accent} 80%, black)`);
    root.setProperty("--color-accent-soft", `color-mix(in srgb, ${accent} 14%, white)`);
    root.setProperty("--brand-bg", brandBackground(branding));

    // The server already masks company_name/logo_data when this client
    // shouldn't see them (anonymous + hide_login_branding). Render whatever
    // the payload contains.
    document.title =
      branding.company_name && branding.company_name !== DEFAULT_BRANDING.company_name
        ? `${branding.company_name} · Daysoff`
        : "Daysoff";

    const link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (branding.logo_data) {
      const el =
        link ??
        (() => {
          const created = document.createElement("link");
          created.rel = "icon";
          document.head.appendChild(created);
          return created;
        })();
      el.href = branding.logo_data;
    } else if (link) {
      link.href = "/vite.svg";
    }
  }, [branding]);

  return null;
}
