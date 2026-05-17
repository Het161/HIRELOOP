"use client";

/* ============================================================ *
 * DownloadReportPDF — SSR-safe wrapper for ReportPDFButton.
 *
 * @react-pdf/renderer is browser-only. `next/dynamic` with
 * `ssr: false` must live in a Client Component — that is the
 * sole purpose of this file. The Server Component page imports
 * THIS wrapper (not ReportPDFButton directly).
 * ============================================================ */

import dynamic from "next/dynamic";
import type { InterviewReport } from "@/types";

const ReportPDFButton = dynamic(
  () =>
    import("@/components/report/ReportPDFButton").then(
      (m) => m.ReportPDFButton,
    ),
  {
    ssr: false,
    loading: () => (
      <span
        className="inline-flex items-center gap-1 border border-border px-3 py-1.5 font-mono text-[12px] text-muted opacity-40"
      >
        [ download_pdf ]
      </span>
    ),
  },
);

interface DownloadReportPDFProps {
  report: InterviewReport;
  roleName: string;
}

export function DownloadReportPDF({ report, roleName }: DownloadReportPDFProps) {
  return <ReportPDFButton report={report} roleName={roleName} />;
}

export default DownloadReportPDF;
