import { Sun } from "lucide-react";
import { brandBackground, useBranding } from "@/lib/branding";
import { cn } from "@/lib/utils";

/**
 * Company logo when one is uploaded, otherwise a sun mark on the accent
 * color (or gradient). Sized via className (h-* w-*).
 */
export function BrandMark({ className }: { className?: string }) {
  const branding = useBranding();

  if (branding.logo_data) {
    return (
      <img
        src={branding.logo_data}
        alt=""
        className={cn("shrink-0 rounded-lg object-contain", className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg text-accent-fg shadow-sm",
        className,
      )}
      style={{ background: brandBackground(branding) }}
    >
      <Sun className="h-[55%] w-[55%]" />
    </span>
  );
}
