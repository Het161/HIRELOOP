/* ============================================================ *
 * SubScores — three ASCII █/░ progress bars (25 segments each).
 * Color: ≥80 text-accent, 60-79 text-paper, <60 text-accent2.
 * ============================================================ */

import type { ReportScores } from "@/types";

interface SubScoresProps {
  scores: ReportScores;
}

const DIMENSIONS: { key: keyof ReportScores; label: string }[] = [
  { key: "technicalDepth", label: "technical depth" },
  { key: "communicationClarity", label: "communication" },
  { key: "problemSolving", label: "problem solving" },
];

const SEGS = 25;

function barColor(score: number): string {
  if (score >= 80) return "text-accent";
  if (score >= 60) return "text-paper";
  return "text-accent2";
}

export function SubScores({ scores }: SubScoresProps) {
  return (
    <div>
      <div className="mb-6 select-none text-[12.5px] text-dim">
        ❯ sub-scores
      </div>
      <div className="space-y-3 text-[13px]">
        {DIMENSIONS.map(({ key, label }) => {
          const value = Math.min(100, Math.max(0, scores[key]));
          const fill = Math.round((value / 100) * SEGS);
          const empty = SEGS - fill;
          const color = barColor(value);

          return (
            <div key={key} className="flex flex-wrap items-center gap-3">
              <span
                className="inline-block text-muted"
                style={{ minWidth: 150 }}
              >
                {label}
              </span>
              <span style={{ letterSpacing: 1 }}>
                <span className={color}>{"█".repeat(fill)}</span>
                <span className="text-dim">{"░".repeat(empty)}</span>
              </span>
              <span className={color}>{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SubScores;
