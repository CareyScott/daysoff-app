import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { queryKeys } from "@/lib/queryClient";
import type { Absence, OverviewResponse, OverviewUser } from "@/lib/types";
import {
  absenceDayMap,
  buildYearDays,
  formatDateRange,
  MONTH_NAMES,
  toISODate,
} from "@/lib/dates";
import { YearSwitcher } from "@/components/app/YearSwitcher";
import { BookAbsenceDialog } from "@/components/BookAbsenceDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, initials } from "@/lib/utils";

/** Compact horizontal strip: one thin segment per day of the year. */
function YearStrip({ year, absences }: { year: number; absences: Absence[] }) {
  const days = useMemo(() => buildYearDays(year), [year]);
  const dayMap = useMemo(() => absenceDayMap(absences), [absences]);
  const todayIso = toISODate(new Date());

  return (
    <div className="flex h-4 w-full overflow-hidden rounded-full border border-border-default">
      {days.map((day) => {
        const kind = dayMap.get(day.iso)?.kind;
        return (
          <div
            key={day.iso}
            title={kind ? `${kind === "vacation" ? "Vacation" : "Sick"}: ${day.iso}` : day.iso}
            className={cn(
              "min-w-0 flex-1",
              kind === "vacation"
                ? "bg-accent"
                : kind === "sick"
                  ? "bg-sick"
                  : day.weekend
                    ? "bg-bg-muted"
                    : "bg-bg-surface",
              day.iso === todayIso && !kind && "bg-accent-soft",
            )}
          />
        );
      })}
    </div>
  );
}

/** Month initials axis aligned with the year strip (width ∝ days per month). */
function MonthAxis({ year }: { year: number }) {
  return (
    <div className="flex w-full">
      {MONTH_NAMES.map((name, month) => {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        return (
          <span
            key={name}
            className="min-w-0 text-[10px] font-medium text-fg-subtle"
            style={{ flexGrow: daysInMonth, flexBasis: 0 }}
          >
            {name[0]}
          </span>
        );
      })}
    </div>
  );
}

function TeamRow({
  user,
  year,
  absences,
  isAdmin,
  onBookFor,
}: {
  user: OverviewUser;
  year: number;
  absences: Absence[];
  isAdmin: boolean;
  onBookFor: (userId: string) => void;
}) {
  const queryClient = useQueryClient();
  const upcoming = absences
    .filter((a) => a.end_date >= toISODate(new Date()))
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api<void>(`/api/absences/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["overview"] });
      void queryClient.invalidateQueries({ queryKey: ["absences"] });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  return (
    <li className={cn("py-4", !user.active && "opacity-50")}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong">
          {initials(user.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate text-sm font-medium">
            {user.name}
            {user.role === "admin" && <Badge>Admin</Badge>}
            {!user.active && <Badge variant="danger">Inactive</Badge>}
          </p>
          <p className="truncate text-xs text-fg-muted">
            {upcoming
              ? `Next: ${upcoming.kind === "vacation" ? "vacation" : "sick"} ${formatDateRange(upcoming.start_date, upcoming.end_date)}`
              : "No upcoming absences"}
          </p>
        </div>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => onBookFor(user.id)}>
            <CalendarPlus className="h-3.5 w-3.5" />
            Book
          </Button>
        )}
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums">
            {user.remaining}
            <span className="font-normal text-fg-muted"> / {user.allowance}</span>
          </p>
          <p className="text-xs text-fg-muted">days left</p>
        </div>
      </div>
      <div className="mt-3 space-y-1">
        <MonthAxis year={year} />
        <YearStrip year={year} absences={absences} />
      </div>
      {isAdmin && absences.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-medium text-fg-muted hover:text-fg-default">
            {absences.length} absence{absences.length === 1 ? "" : "s"} in {year}
          </summary>
          <ul className="mt-2 space-y-1">
            {absences.map((absence) => (
              <li
                key={absence.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-bg-muted px-3 py-1.5 text-xs"
              >
                <span className="flex items-center gap-2">
                  <Badge variant={absence.kind === "vacation" ? "vacation" : "sick"}>
                    {absence.kind === "vacation" ? "Vacation" : "Sick"}
                  </Badge>
                  {formatDateRange(absence.start_date, absence.end_date)}
                  <span className="text-fg-subtle">
                    · {absence.business_days} day{absence.business_days === 1 ? "" : "s"}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={cancelMutation.isPending}
                  onClick={() => cancelMutation.mutate(absence.id)}
                >
                  Cancel
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}

export function Team() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [bookFor, setBookFor] = useState<string | null>(null);

  const overviewQuery = useQuery({
    queryKey: queryKeys.overview(year),
    queryFn: () => api<OverviewResponse>(`/api/overview?year=${year}`),
  });

  const absencesByUser = useMemo(() => {
    const map = new Map<string, Absence[]>();
    for (const absence of overviewQuery.data?.absences ?? []) {
      const list = map.get(absence.user_id) ?? [];
      list.push(absence);
      map.set(absence.user_id, list);
    }
    return map;
  }, [overviewQuery.data]);

  const users = useMemo(() => {
    const list = [...(overviewQuery.data?.users ?? [])];
    // Active teammates first, then alphabetical.
    return list.sort(
      (a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name),
    );
  }, [overviewQuery.data]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-page">Team</h1>
        <YearSwitcher year={year} onChange={setYear} />
      </header>

      <div className="card p-6">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-section">Who is out in {year}</h2>
          <div className="flex items-center gap-4 text-xs text-fg-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-accent" /> Vacation
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-sick" /> Sick
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-bg-muted" /> Weekend
            </span>
          </div>
        </div>

        {overviewQuery.isLoading && <p className="py-4 text-sm text-fg-muted">Loading…</p>}
        {overviewQuery.isError && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
            Could not load the team overview. Please try again.
          </p>
        )}

        <ul className="divide-y divide-border-default">
          {users.map((teamUser) => (
            <TeamRow
              key={teamUser.id}
              user={teamUser}
              year={year}
              absences={absencesByUser.get(teamUser.id) ?? []}
              isAdmin={isAdmin}
              onBookFor={setBookFor}
            />
          ))}
        </ul>
      </div>

      <BookAbsenceDialog
        open={bookFor !== null}
        onOpenChange={(open) => !open && setBookFor(null)}
        initialUserId={bookFor}
      />
    </div>
  );
}
