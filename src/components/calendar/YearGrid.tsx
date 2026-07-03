import { useMemo } from "react";
import type { Absence, CompanyDay } from "@/lib/types";
import {
  absenceDayMap,
  buildYearGrid,
  companyDayMap,
  toISODate,
  YEAR_GRID_COLUMNS,
} from "@/lib/dates";
import { DayCell } from "@/components/calendar/DayCell";

const GRID_TEMPLATE = `repeat(${YEAR_GRID_COLUMNS}, minmax(0, 1fr))`;
const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

export interface YearGridProps {
  year: number;
  /** Absences of the current user (drives coloring + click-to-cancel). */
  absences: Absence[];
  /** Workspace-wide days off (rendered blue; own absences win). */
  companyDays?: CompanyDay[];
  /** iso day -> teammate names away that day (attributed dot markers). */
  othersByDay?: Map<string, string[]>;
  onDayClick?: (iso: string) => void;
  onAbsenceClick?: (absence: Absence) => void;
}

/**
 * Personizer-style year calendar: 12 month rows, weekday-aligned in 37
 * columns (each row offset by the Monday-first weekday of the 1st), so the
 * same weekday always sits in the same column.
 */
export function YearGrid({
  year,
  absences,
  companyDays,
  othersByDay,
  onDayClick,
  onAbsenceClick,
}: YearGridProps) {
  const months = useMemo(() => buildYearGrid(year), [year]);
  const dayMap = useMemo(() => absenceDayMap(absences), [absences]);
  const companyMap = useMemo(() => companyDayMap(companyDays ?? []), [companyDays]);
  const todayIso = toISODate(new Date());

  return (
    // Negative margin lets the scroll area bleed to the card edge on phones.
    <div className="-mx-2 overflow-x-auto px-2">
      <div className="min-w-[720px] space-y-[3px]">
        {/* Weekday header, repeating Mon..Sun across all 37 columns */}
        <div className="flex items-center gap-2.5 pb-0.5">
          <div className="w-16 shrink-0" />
          <div
            className="grid flex-1 gap-[3px]"
            style={{ gridTemplateColumns: GRID_TEMPLATE }}
          >
            {Array.from({ length: YEAR_GRID_COLUMNS }, (_, i) => (
              <div
                key={i}
                className="text-center text-[9px] font-medium text-fg-subtle/70"
                aria-hidden
              >
                {WEEKDAY_LETTERS[i % 7]}
              </div>
            ))}
          </div>
        </div>

        {months.map((month) => (
          <div key={month.month} className="flex items-center gap-2.5">
            <div className="w-16 shrink-0 text-[11px] font-medium text-fg-muted">
              {month.name}
            </div>
            <div
              className="grid flex-1 gap-[3px]"
              style={{ gridTemplateColumns: GRID_TEMPLATE }}
            >
              {month.days.map((day) => {
                const absence = dayMap.get(day.iso);
                return (
                  <DayCell
                    key={day.iso}
                    day={day}
                    absence={absence}
                    companyDay={companyMap.get(day.iso)}
                    others={othersByDay?.get(day.iso)}
                    isToday={day.iso === todayIso}
                    interactive={!day.weekend}
                    onSelect={() =>
                      absence ? onAbsenceClick?.(absence) : onDayClick?.(day.iso)
                    }
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
