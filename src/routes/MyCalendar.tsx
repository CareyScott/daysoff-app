import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { queryKeys } from "@/lib/queryClient";
import type { Absence, CompanyDay, MeResponse, OverviewResponse } from "@/lib/types";
import { eachDayOfRange, formatDateRange } from "@/lib/dates";
import { YearSwitcher } from "@/components/app/YearSwitcher";
import { YearGrid } from "@/components/calendar/YearGrid";
import { MonthWidget } from "@/components/calendar/MonthWidget";
import { AllowanceRing } from "@/components/AllowanceRing";
import { AbsenceList } from "@/components/AbsenceList";
import { BookAbsenceDialog } from "@/components/BookAbsenceDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted">
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded bg-accent" /> Vacation
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded bg-sick" /> Sick
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded bg-company" /> Company day
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded bg-accent/50 outline-dashed outline-1 -outline-offset-1 outline-accent-strong" />{" "}
        Pending
      </span>
      <span className="flex items-center gap-1.5">
        <span className="relative h-3 w-3 rounded bg-bg-muted">
          <span className="absolute bottom-[1px] left-1/2 h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-fg-subtle" />
        </span>{" "}
        Teammate away
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded bg-bg-muted" /> Weekend
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded border border-border-default ring-2 ring-accent/60" /> Today
      </span>
    </div>
  );
}

export function MyCalendar() {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Absence | null>(null);

  const meQuery = useQuery({
    queryKey: queryKeys.me(year),
    queryFn: () => api<MeResponse>(`/api/me?year=${year}`),
  });

  const { user } = useAuth();

  // Own absences only — teammates' absences come from the overview and are
  // rendered as attributed markers, never as if they were the viewer's own.
  const absencesQuery = useQuery({
    queryKey: [...queryKeys.absences(year), user?.id],
    queryFn: () => api<Absence[]>(`/api/absences?year=${year}&user_id=${user?.id}`),
    enabled: Boolean(user?.id),
  });

  const overviewQuery = useQuery({
    queryKey: queryKeys.overview(year),
    queryFn: () => api<OverviewResponse>(`/api/overview?year=${year}`),
  });

  const companyDaysQuery = useQuery({
    queryKey: ["company-days", year],
    queryFn: () => api<CompanyDay[]>(`/api/company-days?year=${year}`),
  });

  // iso date -> teammate names away that day (excludes self and denied).
  const othersByDay = useMemo(() => {
    const map = new Map<string, string[]>();
    const users = new Map(
      (overviewQuery.data?.users ?? []).map((u) => [u.id, u.name]),
    );
    for (const absence of overviewQuery.data?.absences ?? []) {
      if (absence.user_id === user?.id || absence.status === "denied") continue;
      const name = users.get(absence.user_id) ?? "Teammate";
      const label = `${name}${absence.status === "pending" ? " (pending)" : ""}`;
      for (const iso of eachDayOfRange(absence.start_date, absence.end_date)) {
        const list = map.get(iso) ?? [];
        list.push(label);
        map.set(iso, list);
      }
    }
    return map;
  }, [overviewQuery.data, user?.id]);

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api<void>(`/api/absences/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      void queryClient.invalidateQueries({ queryKey: ["absences"] });
      void queryClient.invalidateQueries({ queryKey: ["overview"] });
      setCancelTarget(null);
    },
  });

  const absences = absencesQuery.data ?? [];
  const summary = meQuery.data?.summary;

  const openBooking = (iso: string | null) => {
    setBookingDate(iso);
    setBookingOpen(true);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-page">My Calendar</h1>
        <div className="flex items-center gap-3">
          <YearSwitcher year={year} onChange={setYear} />
          <Button onClick={() => openBooking(null)}>
            <Plus className="h-4 w-4" />
            Book absence
          </Button>
        </div>
      </header>

      {(meQuery.isError || absencesQuery.isError) && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
          Could not load your calendar. Please try again.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card flex items-center gap-6 p-6">
          {summary ? (
            <>
              <div className="flex flex-col items-center gap-1.5">
                <AllowanceRing summary={summary} />
                {summary.vacation_pending > 0 && (
                  <p className="text-xs text-fg-muted tabular-nums">
                    {summary.vacation_pending} day
                    {summary.vacation_pending === 1 ? "" : "s"} pending approval
                  </p>
                )}
              </div>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-label">Vacation taken</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                    {summary.vacation_taken}
                    <span className="ml-1 text-sm font-normal text-fg-muted">
                      of {summary.allowance}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-label">Sick days</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                    {summary.sick_taken}
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="text-sm text-fg-muted">{meQuery.isLoading ? "Loading…" : ""}</p>
          )}
        </div>

        <div className="card p-6">
          <MonthWidget absences={absences} />
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-section">{year} at a glance</h2>
          <Legend />
        </div>
        {absencesQuery.isLoading ? (
          <p className="text-sm text-fg-muted">Loading…</p>
        ) : (
          <YearGrid
            year={year}
            absences={absences}
            companyDays={companyDaysQuery.data ?? []}
            othersByDay={othersByDay}
            onDayClick={openBooking}
            onAbsenceClick={setCancelTarget}
          />
        )}
      </div>

      <div className="card p-6">
        <h2 className="text-section mb-4">My absences</h2>
        <AbsenceList absences={absences} onCancel={setCancelTarget} />
      </div>

      <BookAbsenceDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        initialDate={bookingDate}
      />

      <Dialog
        open={cancelTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Cancel absence?</DialogTitle>
          {cancelTarget && (
            <DialogDescription className="mt-2">
              This removes your {cancelTarget.kind === "vacation" ? "vacation" : "sick leave"}{" "}
              from {formatDateRange(cancelTarget.start_date, cancelTarget.end_date)} (
              {cancelTarget.business_days} business day
              {cancelTarget.business_days === 1 ? "" : "s"}).
            </DialogDescription>
          )}
          {cancelMutation.isError && (
            <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
              Could not cancel this absence. Please try again.
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCancelTarget(null)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              disabled={cancelMutation.isPending}
              onClick={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
            >
              {cancelMutation.isPending ? "Cancelling…" : "Cancel absence"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
