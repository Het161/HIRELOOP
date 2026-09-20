"use client";

/* ============================================================ *
 * ShareReportButton — copies the current page URL to clipboard.
 * Reskinned as terminal bracket button. Logic preserved exactly.
 * ============================================================ */

import { useState } from "react";
import { playClick } from "@/lib/sounds";

/**
 * Copy text without the async Clipboard API, which does not exist
 * outside a secure context — including `http://<lan-ip>:3000`, exactly
 * how this gets shown on a projector or shared across a room.
 */
function copyFallback(text: string): boolean {
  try {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(field);
    return ok;
  } catch {
    return false;
  }
}

type CopyState = "idle" | "copied" | "failed";

export function ShareReportButton() {
  const [state, setState] = useState<CopyState>("idle");

  const handleCopy = async () => {
    const url = window.location.href;
    let ok = false;

    try {
      // Optional chaining: `navigator.clipboard` is undefined, not just
      // rejecting, on an insecure origin.
      await navigator.clipboard?.writeText(url);
      ok = Boolean(navigator.clipboard);
    } catch {
      ok = false;
    }
    if (!ok) ok = copyFallback(url);

    setState(ok ? "copied" : "failed");
    playClick(ok ? "success" : "danger");
    setTimeout(() => setState("idle"), 2200);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="btn-term text-[12px]"
      style={{ padding: "6px 12px" }}
      aria-label="Share — copy a link to this report"
    >
      {state === "copied" ? (
        <span className="text-accent">copied ✓</span>
      ) : state === "failed" ? (
        <span className="text-danger">copy failed</span>
      ) : (
        "share"
      )}
    </button>
  );
}

export default ShareReportButton;
