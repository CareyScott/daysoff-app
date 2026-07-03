import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus } from "lucide-react";
import { api, ApiError } from "@/lib/api";
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
import { hapticSuccess } from "@/lib/haptics";
import { YearSwitcher } from "@/components/app/YearSwitcher";
import { BookAbsenceDialog } from "@/components/BookAbsenceDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, initials } from "@/lib/utils";

/** Compact horizontal strip: one thin segment per day of the year. */
function YearStrip({ year, absences }: { year: number; absences: Absence[] }) {
  const days = useMemo(() => buildYearDays(year), [year]);
  const dayMap = useMemo(() => absenceDayMap(absences), [absences]);
  const todayIso = toISODate(new Date());

  return (
    <div className="flex h-4 w-full overflow-hidden rounded-full border border-border-default">
      {days.map((day) => {
        const absence = dayMap.get(day.iso);
        const kind = absence?.kind;
        const pending = absence?.status === "pending";
        return (
          <div
            key={day.iso}
            title={
              kind
                ? `${kind === "vacation" ? "Vacation" : "Sick"}${pending ? " (pending)" : ""}: ${day.iso}`
                : day.iso
            }
            className={cn(
              "min-w-0 flex-1",
              kind === "vacation"
                ? pending
                  ? "bg-accent/45"
                  : "bg-accent"
                : kind === "sick"
                  ? pending
                    ? "bg-sick/45"
                    : "bg-sick"
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

function DenyDialog({
  absence,
  userName,
  onClose,
}: {
  absence: Absence | null;
  userName: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: (body: { id: string; reason: string }) =>
      api<Absence>(`/api/absences/${body.id}/deny`, {
        method: "POST",
        body: { reason: body.reason },
      }),
    onSuccess: () => {
      hapticSuccess();
      void queryClient.invalidateQueries({ queryKey: ["overview"] });
      void queryClient.invalidateQueries({ queryKey: ["absences"] });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      onClose();
    },
  });

  useEffect(() => {
    if (absence) {
      setReason("");
      mutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [absence]);

  const errorMessage = mutation.isError
    ? mutation.error instanceof ApiError
      ? mutation.error.message
      : "Something went wrong. Please try again."
    : null;

  return (
    <Dialog open={absence !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle>Deny request{userName ? ` from ${userName}` : ""}</DialogTitle>
        {absence && (
          <DialogDescription className="mt-1">
            {formatDateRange(absence.start_date, absence.end_date)} ({absence.business_days} day
            {absence.business_days === 1 ? "" : "s"}). The reason is shown to the requester.
          </DialogDescription>
        )}
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!absence || !reason.trim()) return;
            mutation.mutate({ id: absence.id, reason: reason.trim() });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="deny-reason">Reason</Label>
            <textarea
              id="deny-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. too many teammates out that week"
              maxLength={500}
              rows={3}
              autoFocus
              className="flex w-full resize-none rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm shadow-sm placeholder:text-fg-subtle disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          {errorMessage && (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
              {errorMessage}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={!reason.trim() || mutation.isPending}>
              {mutation.isPending ? "Denying…" : "Deny request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Admin card listing vacation requests waiting for a decision. */
function PendingRequests({
  pending,
  usersById,
}: {
  pending: Absence[];
  usersById: Map<string, OverviewUser>;
}) {
  const queryClient = useQueryClient();
  const [denyTarget, setDenyTarget] = useState<Absence | null>(null);

  const approveMutation = useMutation({
    mutationFn: (id: string) => api<Absence>(`/api/absences/${id}/approve`, { method: "POST" }),
    onSuccess: () => {
      hapticSuccess();
      void queryClient.invalidateQueries({ queryKey: ["overview"] });
      void queryClient.invalidateQueries({ queryKey: ["absences"] });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  return (
    <div className="card p-6">
      <h2 className="text-section">Pending requests</h2>
      <ul className="mt-3 divide-y divide-border-default">
        {pending.map((absence) => {
          const requester = usersById.get(absence.user_id);
          return (
            <li key={absence.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {requester?.name ?? "Unknown user"}
                  {absence.status === "cancel_pending" && (
                    <Badge className="border border-sick/50 bg-transparent text-sick-strong">
                      Cancellation request
                    </Badge>
                  )}
                  <Badge variant={absence.kind === "vacation" ? "vacation" : "sick"}>
                    {absence.kind === "vacation" ? "Vacation" : "Sick"}
                  </Badge>
                </p>
                <p className="mt-0.5 text-xs text-fg-muted">
                  {formatDateRange(absence.start_date, absence.end_date)} ·{" "}
                  <span className="tabular-nums">
                    {absence.business_days} day{absence.business_days === 1 ? "" : "s"}
                  </span>
                </p>
                {absence.note && (
                  <p className="mt-0.5 text-xs text-fg-muted">Note: {absence.note}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  disabled={approveMutation.isPending}
                  onClick={() => approveMutation.mutate(absence.id)}
                >
                  {absence.status === "cancel_pending" ? "Approve cancellation" : "Approve"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={approveMutation.isPending}
                  onClick={() => setDenyTarget(absence)}
                >
                  Deny
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      {approveMutation.isError && (
        <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
          Could not approve the request. Please try again.
        </p>
      )}
      <DenyDialog
        absence={denyTarget}
        userName={denyTarget ? (usersById.get(denyTarget.user_id)?.name ?? "") : ""}
        onClose={() => setDenyTarget(null)}
      />
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

  const usersById = useMemo(
    () => new Map((overviewQuery.data?.users ?? []).map((u) => [u.id, u])),
    [overviewQuery.data],
  );

  const pending = useMemo(
    () =>
      (overviewQuery.data?.absences ?? [])
        .filter((a) => a.status === "pending" || a.status === "cancel_pending")
        .sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [overviewQuery.data],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-page">Team</h1>
        <YearSwitcher year={year} onChange={setYear} />
      </header>

      {isAdmin && pending.length > 0 && (
        <PendingRequests pending={pending} usersById={usersById} />
      )}

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
