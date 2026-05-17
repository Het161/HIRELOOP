/* ============================================================ *
 * ReportHero — terminal-style debrief header.
 * Prompt line → double-border score frame (ScoreCard) → headline.
 * ============================================================ */

import type { InterviewReport } from "@/types";
import { ScoreCard } from "./ScoreCard";

interface ReportHeroProps {
  report: InterviewReport;
}

export function ReportHero({ report }: ReportHeroProps) {
  return (
    <section className="pt-14 pb-8">
      {/* Prompt line */}
      <div className="mb-8 select-none text-[12.5px] text-dim">
        ❯ cat report.json | parse
      </div>

      {/* Score frame */}
      <ScoreCard report={report} />

      {/* Editorial headline — IBM Plex Sans italic */}
      <p
        className="editorial mx-auto mt-9 max-w-[760px] text-center leading-[1.5]"
        style={{ fontSize: "clamp(17px, 2.3vw, 22px)" }}
      >
        {report.headline}
      </p>
    </section>
  );
}

export default ReportHero;
