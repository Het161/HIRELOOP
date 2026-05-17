import type { ReactNode } from "react";

/* ============================================================ *
 * Prompt — a "❯ " prefixed terminal line.
 * ============================================================ */

interface PromptProps {
  children: ReactNode;
  /** Color of the ❯ glyph. Defaults to terracotta. */
  accent?: "green" | "terracotta" | "muted";
  className?: string;
}

const GLYPH_COLOR: Record<NonNullable<PromptProps["accent"]>, string> = {
  green: "text-accent",
  terracotta: "text-accent2",
  muted: "text-dim",
};

export default function Prompt({
  children,
  accent = "terracotta",
  className,
}: PromptProps) {
  return (
    <div className={`text-[12.5px] text-muted${className ? ` ${className}` : ""}`}>
      <span className={GLYPH_COLOR[accent]}>❯</span> {children}
    </div>
  );
}
