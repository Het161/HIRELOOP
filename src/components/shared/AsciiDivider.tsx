/* ============================================================ *
 * AsciiDivider — a full-width horizontal rule drawn with real
 * box-drawing characters. The line overflows and clips to the
 * container width, so it stays responsive.
 * ============================================================ */

interface AsciiDividerProps {
  /** "single" → ─ · "double" → ═ */
  variant?: "single" | "double";
  className?: string;
}

export default function AsciiDivider({
  variant = "single",
  className,
}: AsciiDividerProps) {
  const ch = variant === "double" ? "═" : "─";
  return (
    <div
      aria-hidden="true"
      className={`select-none overflow-hidden whitespace-nowrap leading-none text-dim${className ? ` ${className}` : ""}`}
    >
      {ch.repeat(420)}
    </div>
  );
}
