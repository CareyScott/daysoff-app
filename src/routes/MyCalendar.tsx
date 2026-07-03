import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import type { Absence, MeResponse } from "@/lib/types";
import { formatDateRange } from "@/lib/dates";
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

  const absencesQuery = useQuery({
    queryKey: queryKeys.absences(year),
    queryFn: () => api<Absence[]>(`/api/absences?year=${year}`),
  });

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
              <AllowanceRing summary={summary} />
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
