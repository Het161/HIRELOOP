/* ============================================================ *
 * ScoreCard — the double-border score frame: big count-up number
 * + band label. Server Component; ScoreRadial handles animation.
 * ============================================================ */

import { scoreBand } from "@/lib/utils";
import type { InterviewReport } from "@/types";
import { ScoreRadial } from "./ScoreRadial";

interface ScoreCardProps {
  report: InterviewReport;
}

function scoreTextColor(score: number): string {
  if (score >= 75) return "text-accent";
  if (score >= 50) return "text-accent2";
  return "text-danger";
}

export function ScoreCard({ report }: ScoreCardProps) {
  const band = scoreBand(report.overallScore);

  return (
    <div
      className="mx-auto max-w-[560px]"
      style={{ borderStyle: "double", borderWidth: 3, borderColor: "#2a2d28" }}
    >
      <div className="px-8 py-12 text-center">
        {/* Big score number */}
        <div className="flex items-baseline justify-center leading-none">
          <ScoreRadial score={report.overallScore} />
          <span className={`font-mono font-normal ${scoreTextColor(report.overallScore)}`}
            style={{ fontSize: "0.34em" }}>
            {" "}/ 100
          </span>
        </div>

        {/* Divider rule */}
        <div className="my-5 overflow-hidden whitespace-nowrap leading-none text-dim select-none text-center">
          {"─".repeat(30)}
        </div>

        {/* Band label */}
        <div className="text-[14px] text-muted font-mono">{band.toLowerCase()}</div>
      </div>
    </div>
  );
}

export default ScoreCard;
