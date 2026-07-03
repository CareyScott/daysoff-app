import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function YearSwitcher({
  year,
  onChange,
}: {
  year: number;
  onChange: (year: number) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border-default bg-bg-surface p-0.5 shadow-sm">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChange(year - 1)}
        aria-label="Previous year"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-14 text-center text-sm font-semibold tabular-nums">{year}</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChange(year + 1)}
        aria-label="Next year"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
