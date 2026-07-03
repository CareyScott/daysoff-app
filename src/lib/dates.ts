import type { Absence, CompanyDay } from "@/lib/types";

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Parse YYYY-MM-DD as a local date (no timezone surprises). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** Monday-first weekday index: Mon=0 .. Sun=6. */
export function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** Inclusive count of Mon-Fri days between two ISO dates. 0 if invalid/reversed. */
export function businessDayCount(startIso: string, endIso: string): number {
  if (!startIso || !endIso) return 0;
  const start = parseISODate(startIso);
  const end = parseISODate(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (!isWeekend(cur)) count += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export interface GridDay {
  iso: string;
  dayOfMonth: number;
  weekend: boolean;
  /** 1-based column in the 37-column weekday-aligned year grid. */
  column: number;
}

export interface GridMonth {
  month: number;
  name: string;
  days: GridDay[];
}

/**
 * Max columns needed so identical weekdays align vertically across months:
 * worst case offset 6 (month starts on Sunday) + 31 days = 37.
 */
export const YEAR_GRID_COLUMNS = 37;

/**
 * Personizer-style year grid: one row per month, each row offset by the
 * Monday-first weekday of the 1st so weekdays align in 37 columns.
 */
export function buildYearGrid(year: number): GridMonth[] {
  return MONTH_NAMES.map((name, month) => {
    const offset = mondayIndex(new Date(year, month, 1));
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: GridDay[] = [];
    for (let d = 1; d <= daysInMonth; d += 1) {
      const date = new Date(year, month, d);
      days.push({
        iso: toISODate(date),
        dayOfMonth: d,
        weekend: isWeekend(date),
        column: offset + d,
      });
    }
    return { month, name, days };
  });
}

export interface YearDay {
  iso: string;
  month: number;
  weekend: boolean;
}

/** Flat list of every day in a year, in order (for compact year strips). */
export function buildYearDays(year: number): YearDay[] {
  const days: YearDay[] = [];
  const cur = new Date(year, 0, 1);
  while (cur.getFullYear() === year) {
    days.push({ iso: toISODate(cur), month: cur.getMonth(), weekend: isWeekend(cur) });
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

/**
 * Map of every covered ISO day -> its absence, for O(1) day coloring.
 * Denied absences are excluded: their dates are free again.
 */
export function absenceDayMap(absences: Absence[]): Map<string, Absence> {
  const map = new Map<string, Absence>();
  for (const absence of absences) {
    if (absence.status === "denied") continue;
    const end = parseISODate(absence.end_date);
    const cur = parseISODate(absence.start_date);
    while (cur <= end) {
      map.set(toISODate(cur), absence);
      cur.setDate(cur.getDate() + 1);
    }
  }
  return map;
}

/** Map of every covered ISO day -> its company day, for O(1) day coloring. */
export function companyDayMap(companyDays: CompanyDay[]): Map<string, CompanyDay> {
  const map = new Map<string, CompanyDay>();
  for (const companyDay of companyDays) {
    const end = parseISODate(companyDay.end_date);
    const cur = parseISODate(companyDay.start_date);
    while (cur <= end) {
      map.set(toISODate(cur), companyDay);
      cur.setDate(cur.getDate() + 1);
    }
  }
  return map;
}

const shortFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const longFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "3 Aug - 7 Aug 2026", collapsing single-day ranges to "3 Aug 2026". */
export function formatDateRange(startIso: string, endIso: string): string {
  const start = parseISODate(startIso);
  const end = parseISODate(endIso);
  if (startIso === endIso) return longFormat.format(start);
  return `${shortFormat.format(start)} - ${longFormat.format(end)}`;
}

export function formatDateLong(iso: string): string {
  return longFormat.format(parseISODate(iso));
}
