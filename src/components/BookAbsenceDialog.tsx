import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Absence, AbsenceKind, OverviewResponse } from "@/lib/types";
import { businessDayCount } from "@/lib/dates";
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
  const isAdmin = user?.role === "admin";
  const [kind, setKind] = useState<AbsenceKind>("vacation");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [forUserId, setForUserId] = useState<string>("");

  // Admins can book on behalf of teammates.
  const overviewQuery = useQuery({
    queryKey: ["overview", new Date().getFullYear()],
    queryFn: () => api<OverviewResponse>("/api/overview"),
    enabled: open && isAdmin,
  });
  const teammates = (overviewQuery.data?.users ?? []).filter((u) => u.active);

  const mutation = useMutation({
    mutationFn: (body: {
      kind: AbsenceKind;
      start_date: string;
      end_date: string;
      user_id?: string;
    }) => api<Absence>("/api/absences", { method: "POST", body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      void queryClient.invalidateQueries({ queryKey: ["absences"] });
      void queryClient.invalidateQueries({ queryKey: ["overview"] });
      onOpenChange(false);
    },
  });

  // Reset the form each time the dialog opens (optionally prefilled).
  useEffect(() => {
    if (open) {
      setKind("vacation");
      setStartDate(initialDate ?? "");
      setEndDate(initialDate ?? "");
      setForUserId(initialUserId ?? user?.id ?? "");
      mutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialDate, initialUserId]);

  const businessDays = businessDayCount(startDate, endDate);
  const canSubmit = Boolean(startDate && endDate) && businessDays > 0 && !mutation.isPending;

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
              {mutation.isPending ? "Booking…" : "Book absence"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
