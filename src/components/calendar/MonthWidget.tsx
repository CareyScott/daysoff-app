import { useMemo } from "react";
import type { Absence } from "@/lib/types";
import {
  absenceDayMap,
  isWeekend,
  mondayIndex,
  MONTH_NAMES,
  toISODate,
} from "@/lib/dates";
import { cn } from "@/lib/utils";

const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

/** Compact, read-only calendar of the current month with absence coloring. */
export function MonthWidget({ absences }: { absences: Absence[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayIso = toISODate(now);

  const dayMap = useMemo(() => absenceDayMap(absences), [absences]);

  const offset = mondayIndex(new Date(year, month, 1));
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return (
    <div>
      <p className="text-sm font-semibold">
        {MONTH_NAMES[month]} <span className="font-normal text-fg-muted">{year}</span>
      </p>
      <div className="mt-3 grid grid-cols-7 gap-1">
        {WEEKDAY_LETTERS.map((letter, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-fg-subtle" aria-hidden>
            {letter}
          </div>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const date = new Date(year, month, i + 1);
          const iso = toISODate(date);
          const absence = dayMap.get(iso);
          const kind = absence?.kind;
          const pending = absence?.status === "pending";
          const weekend = isWeekend(date);
          return (
            <div
              key={iso}
              className={cn(
                "flex h-7 items-center justify-center rounded-md text-[11px] tabular-nums",
                weekend
                  ? "bg-bg-muted text-fg-subtle"
                  : kind === "vacation"
                    ? pending
                      ? "bg-accent/50 font-medium text-accent-fg"
                      : "bg-accent font-medium text-accent-fg"
                    : kind === "sick"
                      ? pending
                        ? "bg-sick/50 font-medium text-white"
                        : "bg-sick font-medium text-white"
                      : "text-fg-muted",
                iso === todayIso && "ring-2 ring-accent/60 ring-offset-1 ring-offset-bg-surface",
              )}
            >
              {i + 1}
            </div>
          );
        })}
      </div>
    </div>
  );
}
