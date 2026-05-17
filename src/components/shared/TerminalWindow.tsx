import type { ReactNode } from "react";

/* ============================================================ *
 * TerminalWindow — a 1px-bordered panel with a label that sits
 * inline on the top border, reading like an ASCII titled box:
 *
 *   ┌─ title ─────────────────┐
 *   │  {children}             │
 *   └─────────────────────────┘
 * ============================================================ */

interface TerminalWindowProps {
  /** Label shown sitting on the top border (left side). */
  title?: string;
  /** Optional content sitting on the top border (right side). */
  titleRight?: ReactNode;
  children: ReactNode;
  /** Classes for the outer frame. */
  className?: string;
  /** Classes for the inner padding container. */
  bodyClassName?: string;
}

export default function TerminalWindow({
  title,
  titleRight,
  children,
  className,
  bodyClassName,
}: TerminalWindowProps) {
  return (
    <div
      className={`relative border border-border${className ? ` ${className}` : ""}`}
    >
      {title && (
        <span
          className="absolute left-3.5 z-10 bg-bg px-2 text-[12px] text-muted"
          style={{ top: "-0.72em" }}
        >
          {title}
        </span>
      )}
      {titleRight && (
        <span
          className="absolute right-3.5 z-10 bg-bg px-2 text-[12px]"
          style={{ top: "-0.72em" }}
        >
          {titleRight}
        </span>
      )}
      <div className={bodyClassName ?? "p-5"}>{children}</div>
    </div>
  );
}
