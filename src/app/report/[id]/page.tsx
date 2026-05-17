/* ============================================================ *
 * ReportPage — Server Component.
 * Terminal-native debrief report for a completed interview.
 * ============================================================ */

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import RevealWrapper from "@/components/shared/RevealWrapper";
import AsciiDivider from "@/components/shared/AsciiDivider";
import StatusBar from "@/components/shared/StatusBar";

import { ReportHero } from "@/components/report/ReportHero";
import { SubScores } from "@/components/report/SubScores";
import { Verdict } from "@/components/report/Verdict";
import { StrengthsImprovements } from "@/components/report/StrengthsImprovements";
import { QuestionBreakdown } from "@/components/report/QuestionBreakdown";
import { ResourcesList } from "@/components/report/ResourcesList";
import { ShareReportButton } from "@/components/report/ShareReportButton";
import { DownloadReportPDF } from "@/components/report/DownloadReportPDF";

import { getReport } from "@/services/interview.service";
import { getRole } from "@/lib/roles";

/* ---- Metadata ------------------------------------------------- */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const report = await getReport(id);
  if (!report) return { title: "Report not found" };
  const role = getRole(report.roleId);
  return {
    title: `${report.headline} · HireLoop Debrief`,
    description: `${role?.name ?? report.roleId} interview debrief — scored ${report.overallScore}/100.`,
  };
}

/* ---- Page ----------------------------------------------------- */

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await getReport(id);
  if (!report) notFound();

  const role = getRole(report.roleId);
  const roleName = role?.name ?? report.roleId;

  return (
    <div className="min-h-screen bg-bg">
      {/* ── Action bar ─────────────────────────────────────────── */}
      <div className="border-b border-border">
        <div className="mx-auto flex w-full max-w-shell items-center justify-between gap-3 px-5 py-3 text-[12.5px] sm:px-8">
          <div className="truncate text-muted">
            ~/report <span className="text-dim">·</span>id:{" "}
            <span className="text-paper">{id}</span>
          </div>
          <div className="flex flex-none items-center gap-3">
            <ShareReportButton />
            <DownloadReportPDF report={report} roleName={roleName} />
          </div>
        </div>
      </div>

      {/* ── Content column ─────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-shell px-5 pb-20 sm:px-8">

        {/* Hero — prompt + score frame + headline */}
        <RevealWrapper delay={0}>
          <ReportHero report={report} />
        </RevealWrapper>

        <AsciiDivider className="my-14" />

        {/* Sub-scores */}
        <RevealWrapper delay={60}>
          <SubScores scores={report.scores} />
        </RevealWrapper>

        <AsciiDivider className="my-14" />

        {/* Verdict */}
        <RevealWrapper delay={80}>
          <Verdict verdict={report.verdict} />
        </RevealWrapper>

        <AsciiDivider className="my-14" />

        {/* Strengths / Improvements */}
        <RevealWrapper delay={100}>
          <StrengthsImprovements
            strengths={report.strengths}
            improvements={report.improvements}
          />
        </RevealWrapper>

        <AsciiDivider className="my-14" />

        {/* Question breakdown */}
        <RevealWrapper delay={120}>
          <QuestionBreakdown items={report.questionBreakdown} />
        </RevealWrapper>

        <AsciiDivider className="my-14" />

        {/* Resources */}
        <RevealWrapper delay={140}>
          <ResourcesList resources={report.recommendedResources} />
        </RevealWrapper>

        <AsciiDivider className="my-14" />

        {/* Footer */}
        <RevealWrapper delay={160}>
          <div>
            <Link
              href="/setup"
              className="text-[14px] text-muted transition-colors hover:text-paper"
            >
              <span className="text-accent2">❯</span> run-another-interview{" "}
              <span className="text-accent2">↵</span>
            </Link>
            <div className="mt-4 select-none text-[13px] text-dim">
              ❯ exit 0
            </div>
          </div>
        </RevealWrapper>
      </div>

      {/* ── Status bar ─────────────────────────────────────────── */}
      <StatusBar
        left={
          <span>
            <span className="text-dim">❯ report: {id}</span>
            <span className="text-dim"> · </span>
            score {report.overallScore}/100
            <span className="text-dim"> · </span>
            generated just now
          </span>
        }
        right={
          <span>
            <span className="text-accent">●</span> saved
          </span>
        }
      />
    </div>
  );
}
