"use client";

import { useEffect, useState } from "react";

/* ============================================================ *
 * Toast — bottom-right terminal-output notification.
 *
 * Call `toast("message")` from anywhere on the client; the
 * single <Toast /> instance (mounted in the root layout) shows
 * it and auto-dismisses after 1.8s.
 * ============================================================ */

const TOAST_EVENT = "hireloop:toast";

/** Fire a toast notification. Client-side only. */
export function toast(message: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message } }));
}

export default function Toast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    function onToast(event: Event) {
      const detail = (event as CustomEvent<{ message: string }>).detail;
      if (!detail) return;
      setMessage(detail.message);
      clearTimeout(timer);
      timer = setTimeout(() => setMessage(null), 1800);
    }

    window.addEventListener(TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className={`fixed bottom-10 right-5 z-[120] border border-border bg-surface px-4 py-2 text-[13px] transition-all duration-300 ${
        message
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <span className="text-accent2">❯</span> {message ?? ""}{" "}
      <span className="text-accent">✓</span>
    </div>
  );
}
