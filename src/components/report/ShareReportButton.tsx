"use client";

/* ============================================================ *
 * ShareReportButton — copies the current page URL to clipboard.
 * Reskinned as terminal bracket button. Logic preserved exactly.
 * ============================================================ */

import { useState } from "react";
import { playClick } from "@/lib/sounds";

export function ShareReportButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      playClick("success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      playClick("danger");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="btn-term text-[12px]"
      style={{ padding: "6px 12px" }}
    >
      {copied ? (
        <span className="text-accent">copied ✓</span>
      ) : (
        "share"
      )}
    </button>
  );
}

export default ShareReportButton;
