import { Trash2 } from "lucide-react";
import type { Absence } from "@/lib/types";
import { formatDateRange, toISODate } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function AbsenceRow({
  absence,
  onCancel,
}: {
  absence: Absence;
  onCancel?: (absence: Absence) => void;
}) {
  return (
    <li className="py-2.5">
      <div className="flex items-center gap-3">
        <Badge variant={absence.kind === "vacation" ? "vacation" : "sick"}>
          {absence.kind === "vacation" ? "Vacation" : "Sick"}
        </Badge>
        {absence.status === "pending" && (
          <Badge className="border border-sick/50 bg-transparent text-sick-strong">
            Pending
          </Badge>
        )}
        {absence.status === "denied" && <Badge variant="danger">Denied</Badge>}
        <span className="flex-1 text-sm">
          {formatDateRange(absence.start_date, absence.end_date)}
          {absence.day_part !== "full" && (
            <span className="text-fg-muted"> ({absence.day_part === "am" ? "AM" : "PM"})</span>
          )}
        </span>
        <span className="text-sm text-fg-muted tabular-nums">
          {absence.business_days} day{absence.business_days === 1 ? "" : "s"}
        </span>
        {onCancel && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCancel(absence)}
            title="Cancel this absence"
            className="text-fg-muted hover:text-danger"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Cancel absence</span>
          </Button>
        )}
      </div>
      {absence.note && <p className="mt-1 text-xs text-fg-muted">Note: {absence.note}</p>}
      {absence.status === "denied" && absence.decision_reason && (
        <p className="mt-1 text-xs text-danger">Denied: {absence.decision_reason}</p>
      )}
    </li>
  );
}

/** Upcoming + past absences of the current user; future ones can be cancelled. */
export function AbsenceList({
  absences,
  onCancel,
}: {
  absences: Absence[];
  onCancel: (absence: Absence) => void;
}) {
  const todayIso = toISODate(new Date());

  const upcoming = absences
    .filter((a) => a.end_date >= todayIso)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
  const past = absences
    .filter((a) => a.end_date < todayIso)
    .sort((a, b) => b.start_date.localeCompare(a.start_date));

  if (absences.length === 0) {
    return <p className="py-2 text-sm text-fg-muted">No absences booked this year yet.</p>;
  }

  return (
    <div className="space-y-5">
      <section>
        <h3 className="text-label">Upcoming</h3>
        {upcoming.length === 0 ? (
          <p className="py-2 text-sm text-fg-muted">Nothing coming up.</p>
        ) : (
          <ul className="divide-y divide-border-default">
            {upcoming.map((absence) => (
              <AbsenceRow key={absence.id} absence={absence} onCancel={onCancel} />
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h3 className="text-label">Past</h3>
          <ul className="divide-y divide-border-default">
            {past.map((absence) => (
              <AbsenceRow key={absence.id} absence={absence} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
