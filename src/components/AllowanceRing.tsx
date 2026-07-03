import type { YearSummary } from "@/lib/types";

const SIZE = 148;
const STROKE = 13;

/**
 * SVG donut: remaining vacation days centered, teal-green arc showing the
 * proportion of the allowance already taken.
 */
export function AllowanceRing({ summary }: { summary: YearSummary }) {
  const { allowance, vacation_taken, remaining } = summary;

  const radius = (SIZE - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const takenFraction =
    allowance > 0 ? Math.min(1, Math.max(0, vacation_taken / allowance)) : 0;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      role="img"
      aria-label={`${remaining} of ${allowance} vacation days remaining`}
    >
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={radius}
          fill="none"
          stroke="var(--color-bg-muted)"
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={radius}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${circumference * takenFraction} ${circumference}`}
          className="transition-[stroke-dasharray] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tabular-nums leading-none">{remaining}</span>
        <span className="mt-1 text-xs text-fg-muted">of {allowance} days</span>
      </div>
    </div>
  );
}
