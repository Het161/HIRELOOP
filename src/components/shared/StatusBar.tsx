import type { ReactNode } from "react";

/* ============================================================ *
 * StatusBar — fixed-bottom VSCode-style status strip.
 * ============================================================ */

interface StatusBarProps {
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
}

export default function StatusBar({ left, right, className }: StatusBarProps) {
  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 h-7 border-t border-border bg-surface${className ? ` ${className}` : ""}`}
    >
      <div className="mx-auto flex h-full max-w-shell items-center justify-between gap-4 overflow-x-auto whitespace-nowrap px-4 text-[11.5px] text-muted">
        <span className="flex items-center gap-1.5">{left}</span>
        <span className="flex items-center gap-1.5">{right}</span>
      </div>
    </div>
  );
}
