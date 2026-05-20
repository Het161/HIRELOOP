"use client";

/* ============================================================ *
 * ReportPDFButton — generates the report PDF client-side and
 * triggers a browser download. Uses @react-pdf/renderer's `pdf`
 * function to build the blob. Logic + props unchanged.
 * Reskinned as terminal bracket button.
 * ============================================================ */

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { ReportPDF } from "@/components/pdf/ReportPDF";
import { playClick } from "@/lib/sounds";
import type { InterviewReport } from "@/types";

interface ReportPDFButtonProps {
  report: InterviewReport;
  roleName: string;
}

export function ReportPDFButton({ report, roleName }: ReportPDFButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    playClick("primary");
    setLoading(true);
    try {
      const blob = await pdf(
        <ReportPDF report={report} roleName={roleName} />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const fileId = report._id ?? report.sessionId;
      link.download = `hireloop-report-${fileId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      playClick("success");
    } catch (err) {
      console.error("PDF generation failed:", err);
      playClick("danger");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="btn-term text-[12px]"
      style={{ padding: "6px 12px" }}
    >
      {loading ? (
        <span className="text-muted">generating&hellip;</span>
      ) : (
        "download_pdf"
      )}
    </button>
  );
}

export default ReportPDFButton;
