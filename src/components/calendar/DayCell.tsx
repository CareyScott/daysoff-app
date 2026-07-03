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
    "flex h-6 w-full select-none items-center justify-center rounded-[5px] text-[10px] leading-none tabular-nums transition-colors",
    day.weekend
      ? "bg-bg-muted/45 text-fg-subtle/55"
      : kind === "vacation"
        ? "bg-accent font-semibold text-accent-fg"
        : kind === "sick"
          ? "bg-sick font-semibold text-white"
          : "bg-bg-muted text-fg-muted",
    interactive &&
      !day.weekend &&
      (kind
        ? "cursor-pointer hover:brightness-110"
        : "cursor-pointer hover:bg-accent/25 hover:text-accent-strong"),
    isToday && "ring-[1.5px] ring-inset ring-accent font-semibold",
  );

  const label = String(day.dayOfMonth).padStart(2, "0");
  const style = { gridColumnStart: day.column };

  if (!interactive || day.weekend) {
    return (
      <div className={className} style={style}>
        {label}
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
      {label}
    </button>
  );
}
