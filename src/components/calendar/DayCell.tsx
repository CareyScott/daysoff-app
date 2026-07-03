import type { Absence } from "@/lib/types";
import type { GridDay } from "@/lib/dates";
import { cn } from "@/lib/utils";

export interface DayCellProps {
  day: GridDay;
  absence?: Absence;
  isToday: boolean;
  /** Weekday cells are clickable when true (book / cancel). */
  interactive: boolean;
  onSelect?: () => void;
}

export function DayCell({ day, absence, isToday, interactive, onSelect }: DayCellProps) {
  const kind = absence?.kind;

  const className = cn(
    "flex h-7 w-full select-none items-center justify-center rounded-md text-[11px] tabular-nums transition-colors",
    day.weekend
      ? "bg-bg-muted text-fg-subtle"
      : kind === "vacation"
        ? "bg-accent font-medium text-accent-fg"
        : kind === "sick"
          ? "bg-sick font-medium text-white"
          : "border border-border-default bg-bg-surface text-fg-muted",
    interactive &&
      !day.weekend &&
      (kind
        ? "cursor-pointer hover:brightness-110"
        : "cursor-pointer hover:border-accent hover:text-accent-strong"),
    isToday && "ring-2 ring-accent/60 ring-offset-1 ring-offset-bg-surface",
  );

  const style = { gridColumnStart: day.column };

  if (!interactive || day.weekend) {
    return (
      <div className={className} style={style}>
        {day.dayOfMonth}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={className}
      style={style}
      onClick={onSelect}
      title={
        kind
          ? `${kind === "vacation" ? "Vacation" : "Sick"} on ${day.iso} (click to cancel)`
          : `Book absence starting ${day.iso}`
      }
    >
      {day.dayOfMonth}
    </button>
  );
}
