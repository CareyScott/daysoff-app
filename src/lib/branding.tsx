import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface WorkspaceSettings {
  company_name: string;
  accent_color: string;
  /** Optional second gradient stop; solid color when null. */
  accent_color2: string | null;
  /** Optional company logo as a small data URL. */
  logo_data: string | null;
}

export const DEFAULT_BRANDING: WorkspaceSettings = {
  company_name: "Daysoff",
  accent_color: "#0d9488",
  accent_color2: null,
  logo_data: null,
};

const BRANDING_CACHE_KEY = "daysoff-branding";

function readCachedBranding(): WorkspaceSettings | undefined {
  try {
    const raw = localStorage.getItem(BRANDING_CACHE_KEY);
    return raw ? (JSON.parse(raw) as WorkspaceSettings) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Workspace branding from the API (public endpoint, available on the
 * login screen too). Paints instantly from a localStorage snapshot of the
 * last-seen branding (avoids a flash of default styling on refresh) and
 * refreshes from the server in the background.
 */
export function useBranding(): WorkspaceSettings {
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const settings = await api<WorkspaceSettings>("/api/settings");
      try {
        localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(settings));
      } catch {
        // cache is best-effort
      }
      return settings;
    },
    placeholderData: readCachedBranding,
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

    document.title =
      branding.company_name === DEFAULT_BRANDING.company_name
        ? "Daysoff"
        : `${branding.company_name} · Daysoff`;

    if (branding.logo_data) {
      let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = branding.logo_data;
    }
  }, [branding]);

  return null;
}
