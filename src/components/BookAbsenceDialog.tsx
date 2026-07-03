import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useBranding } from "@/lib/branding";
import type { Absence, AbsenceKind, DayPart, OverviewResponse } from "@/lib/types";
import { businessDayCount, formatDateRange, toISODate } from "@/lib/dates";
import { hapticSuccess, hapticWarning } from "@/lib/haptics";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface BookAbsenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefills start + end when opened from a calendar day click. */
  initialDate?: string | null;
  /** Admins: preselect who the absence is for (e.g. from the Team page). */
  initialUserId?: string | null;
}

export function BookAbsenceDialog({
  open,
  onOpenChange,
  initialDate,
  initialUserId,
}: BookAbsenceDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const branding = useBranding();
  const isAdmin = user?.role === "admin";
  const [kind, setKind] = useState<AbsenceKind>("vacation");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dayPart, setDayPart] = useState<DayPart>("full");
  const [note, setNote] = useState("");
  const [forUserId, setForUserId] = useState<string>("");

  // Overview powers the admin "For" select and clash warnings for everyone.
  const overviewYear = startDate
    ? Number(startDate.slice(0, 4))
    : new Date().getFullYear();
  const overviewQuery = useQuery({
    queryKey: ["overview", overviewYear],
    queryFn: () => api<OverviewResponse>(`/api/overview?year=${overviewYear}`),
    enabled: open,
  });
  const teammates = (overviewQuery.data?.users ?? []).filter((u) => u.active);

  const mutation = useMutation({
    mutationFn: (body: {
      kind: AbsenceKind;
      start_date: string;
      end_date: string;
      note?: string;
      day_part?: DayPart;
      user_id?: string;
    }) => api<Absence>("/api/absences", { method: "POST", body }),
    onSuccess: () => {
      hapticSuccess();
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      void queryClient.invalidateQueries({ queryKey: ["absences"] });
      void queryClient.invalidateQueries({ queryKey: ["overview"] });
      onOpenChange(false);
    },
    onError: () => {
      hapticWarning();
    },
  });

  // Reset the form each time the dialog opens (optionally prefilled).
  useEffect(() => {
    if (open) {
      setKind("vacation");
      setStartDate(initialDate ?? "");
      setEndDate(initialDate ?? "");
      setDayPart("full");
      setNote("");
      setForUserId(initialUserId ?? user?.id ?? "");
      mutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialDate, initialUserId]);

  const isSingleDay = Boolean(startDate) && startDate === endDate;
  // AM/PM only makes sense for a single day; a range is always full days.
  const effectiveDayPart: DayPart = isSingleDay ? dayPart : "full";
  const fullDays = businessDayCount(startDate, endDate);
  const businessDays = effectiveDayPart !== "full" && fullDays > 0 ? 0.5 : fullDays;
  const canSubmit = Boolean(startDate && endDate) && businessDays > 0 && !mutation.isPending;

  // Members' vacation requests need admin sign-off when the workspace says
  // so; backdated member vacations always do, regardless of the setting.
  const todayIso = toISODate(new Date());
  const isPastMemberVacation =
    user?.role === "member" &&
    kind === "vacation" &&
    Boolean(startDate) &&
    startDate < todayIso;
  const needsApproval =
    (branding.require_approval && user?.role === "member" && kind === "vacation") ||
    isPastMemberVacation;

  // Non-blocking heads-up when the chosen dates overlap teammates' absences.
  const targetUserId = isAdmin && forUserId ? forUserId : user?.id;
  const clashes = (() => {
    if (!startDate || !endDate || endDate < startDate) return [];
    const names = new Map(teammates.map((t) => [t.id, t.name]));
    return (overviewQuery.data?.absences ?? [])
      .filter(
        (a) =>
          a.user_id !== targetUserId &&
          a.status !== "denied" &&
          a.start_date <= endDate &&
          a.end_date >= startDate,
      )
      .map((a) => ({
        name: names.get(a.user_id) ?? "A teammate",
        // Full absence range, not just the overlapping part — better context.
        range: formatDateRange(a.start_date, a.end_date),
        days: a.business_days,
        pending: a.status === "pending",
      }));
  })();

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? "Something went wrong. Please try again."
        : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Book absence</DialogTitle>
        <DialogDescription className="mt-1">
          Weekends are skipped automatically; only business days count.
        </DialogDescription>

        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            mutation.mutate({
              kind,
              start_date: startDate,
              end_date: endDate,
              ...(note.trim() ? { note: note.trim() } : {}),
              ...(effectiveDayPart !== "full" ? { day_part: effectiveDayPart } : {}),
              ...(isAdmin && forUserId && forUserId !== user?.id
                ? { user_id: forUserId }
                : {}),
            });
          }}
        >
          {isAdmin && teammates.length > 1 && (
            <div className="space-y-1.5">
              <Label htmlFor="absence-for">For</Label>
              <Select value={forUserId} onValueChange={setForUserId}>
                <SelectTrigger id="absence-for">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {teammates.map((teammate) => (
                    <SelectItem key={teammate.id} value={teammate.id}>
                      {teammate.id === user?.id ? `${teammate.name} (you)` : teammate.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="absence-kind">Type</Label>
            <Select value={kind} onValueChange={(value) => setKind(value as AbsenceKind)}>
              <SelectTrigger id="absence-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vacation">Vacation</SelectItem>
                <SelectItem value="sick">Sick</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="absence-start">First day</Label>
              <Input
                id="absence-start"
                type="date"
                value={startDate}
                onChange={(event) => {
                  const value = event.target.value;
                  setStartDate(value);
                  if (!endDate || endDate < value) setEndDate(value);
                }}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="absence-end">Last day</Label>
              <Input
                id="absence-end"
                type="date"
                min={startDate || undefined}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                required
              />
            </div>
          </div>

          {isSingleDay && (
            <div className="space-y-1.5">
              <Label htmlFor="absence-day-part">Day part</Label>
              <Select value={dayPart} onValueChange={(value) => setDayPart(value as DayPart)}>
                <SelectTrigger id="absence-day-part">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full day</SelectItem>
                  <SelectItem value="am">Morning (AM)</SelectItem>
                  <SelectItem value="pm">Afternoon (PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="absence-note">Note (optional)</Label>
            <textarea
              id="absence-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="e.g. visiting family"
              maxLength={500}
              rows={2}
              className="flex w-full resize-none rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm shadow-sm placeholder:text-fg-subtle disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="rounded-lg bg-bg-muted px-3 py-2 text-sm text-fg-muted">
            {businessDays > 0 ? (
              <>
                <span className="font-semibold text-fg-default tabular-nums">{businessDays}</span>{" "}
                business day{businessDays === 1 ? "" : "s"}
              </>
            ) : (
              "Pick a start and end date"
            )}
          </div>

          {clashes.length > 0 && (
            <div className="rounded-lg border border-sick/40 bg-sick-soft px-3 py-2 text-sm text-sick-strong">
              <p className="font-medium">
                Heads up: this would clash with{" "}
                {clashes.length === 1 ? "a teammate" : `${clashes.length} teammates`}.
              </p>
              <ul className="mt-1 space-y-0.5 text-xs">
                {clashes.slice(0, 4).map((clash, i) => (
                  <li key={i}>
                    {clash.name}
                    {clash.pending ? " (pending request)" : ""} is away {clash.range} (
                    {clash.days} day{clash.days === 1 ? "" : "s"})
                  </li>
                ))}
                {clashes.length > 4 && <li>…and {clashes.length - 4} more</li>}
              </ul>
            </div>
          )}

          {isPastMemberVacation && (
            <p className="rounded-lg bg-bg-muted px-3 py-2 text-xs text-fg-muted">
              Booking in the past always requires admin approval.
            </p>
          )}

          {needsApproval && (
            <p className="text-xs text-fg-muted">
              Your request will be sent to an admin for approval.
            </p>
          )}

          {errorMessage && (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
              {errorMessage}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {mutation.isPending
                ? "Booking…"
                : needsApproval
                  ? "Request vacation"
                  : "Book absence"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
