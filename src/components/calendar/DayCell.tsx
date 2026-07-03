import type { Absence, CompanyDay } from "@/lib/types";
import type { GridDay } from "@/lib/dates";
import { cn } from "@/lib/utils";

export interface DayCellProps {
  day: GridDay;
  absence?: Absence;
  /** Workspace-wide day off covering this date (own absence wins). */
  companyDay?: CompanyDay;
  isToday: boolean;
  /** Weekday cells are clickable when true (book / cancel). */
  interactive: boolean;
  /** Teammates away this day (shown as a dot marker + tooltip). */
  others?: string[];
  onSelect?: () => void;
}

export function DayCell({
  day,
  absence,
  companyDay,
  isToday,
  interactive,
  others,
  onSelect,
}: DayCellProps) {
  const kind = absence?.kind;
  const pending = absence?.status === "pending";
  const isCompanyDay = !absence && Boolean(companyDay);

  const hasOthers = Boolean(others?.length) && !day.weekend;
  const othersTitle = hasOthers ? `Away: ${others!.join(", ")}` : "";

  const className = cn(
    "relative flex h-6 w-full select-none items-center justify-center rounded-[5px] text-[10px] leading-none tabular-nums transition-colors",
    day.weekend
      ? "bg-bg-muted/45 text-fg-subtle/55"
      : kind === "vacation"
        ? pending
          ? "bg-accent/50 font-semibold text-accent-fg outline-dashed outline-1 -outline-offset-1 outline-accent-strong"
          : "bg-accent font-semibold text-accent-fg"
        : kind === "sick"
          ? pending
            ? "bg-sick/50 font-semibold text-white outline-dashed outline-1 -outline-offset-1 outline-sick-strong"
            : "bg-sick font-semibold text-white"
          : isCompanyDay
            ? "bg-company font-semibold text-white"
            : "bg-bg-muted text-fg-muted",
    interactive &&
      !day.weekend &&
      (kind || isCompanyDay
        ? "cursor-pointer hover:brightness-110"
        : "cursor-pointer hover:bg-accent/25 hover:text-accent-strong"),
    isToday && "ring-[1.5px] ring-inset ring-accent font-semibold",
  );

  const label = String(day.dayOfMonth).padStart(2, "0");
  const style = { gridColumnStart: day.column };

  if (!interactive || day.weekend) {
    return (
      <div
        className={className}
        style={style}
        title={
          [isCompanyDay ? companyDay?.name : undefined, othersTitle || undefined]
            .filter(Boolean)
            .join(" · ") || undefined
        }
      >
        {label}
      {hasOthers && (
        <span
          aria-hidden
          className={cn(
            "absolute bottom-[2px] left-1/2 h-[3px] w-[3px] -translate-x-1/2 rounded-full",
            kind || isCompanyDay ? "bg-white/80" : "bg-fg-subtle",
          )}
        />
      )}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={className}
      style={style}
      onClick={onSelect}
      title={[
        kind
          ? `${kind === "vacation" ? "Vacation" : "Sick"}${pending ? " (pending)" : ""} on ${day.iso} (click to cancel)`
          : isCompanyDay
            ? companyDay?.name
            : `Book absence starting ${day.iso}`,
        othersTitle || undefined,
      ]
        .filter(Boolean)
        .join(" · ")}
    >
      {label}
      {hasOthers && (
        <span
          aria-hidden
          className={cn(
            "absolute bottom-[2px] left-1/2 h-[3px] w-[3px] -translate-x-1/2 rounded-full",
            kind || isCompanyDay ? "bg-white/80" : "bg-fg-subtle",
          )}
        />
      )}
    </button>
  );
}
