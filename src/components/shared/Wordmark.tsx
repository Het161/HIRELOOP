/* ============================================================ *
 * HireLoop Wordmark — terminal logotype.
 *
 * Mono only, always lowercase: "hire" in paper, "loop" in
 * terracotta. No serif, no italic, no icon.
 * ============================================================ */

export type WordmarkSize = "sm" | "md" | "lg";

export interface WordmarkProps {
  size?: WordmarkSize;
  className?: string;
}

const sizePx: Record<WordmarkSize, number> = {
  sm: 14,
  md: 20,
  lg: 32,
};

export function Wordmark({ size = "md", className }: WordmarkProps) {
  return (
    <span
      className={`font-mono font-medium lowercase tracking-tight${className ? ` ${className}` : ""}`}
      style={{ fontSize: sizePx[size], lineHeight: 1 }}
    >
      <span className="text-paper">hire</span>
      <span className="text-accent2">loop</span>
    </span>
  );
}

export default Wordmark;
