import Image from "next/image";

/* ============================================================ *
 * HireLoop Wordmark — the phosphor logotype.
 *
 * Renders the real logo (public/brand/wordmark.png), keyed to a
 * transparent background so it sits on --bg and --surface alike.
 * `variant="mark"` is the square "h▊" for tight spots — the full
 * wordmark stops being readable below ~80px wide.
 * ============================================================ */

export type WordmarkSize = "sm" | "md" | "lg" | "xl";
export type WordmarkVariant = "full" | "mark";

export interface WordmarkProps {
  size?: WordmarkSize;
  variant?: WordmarkVariant;
  className?: string;
  /** Set on the one logo that acts as the page's heading. */
  priority?: boolean;
}

/** Rendered height in px; width follows the asset's aspect ratio. */
const HEIGHT: Record<WordmarkSize, number> = {
  sm: 14,
  md: 20,
  lg: 32,
  xl: 64,
};

/* Intrinsic sizes of the generated assets. */
const FULL_RATIO = 1664 / 364; // wordmark.png
const MARK_RATIO = 1; // mark.png is square

export function Wordmark({
  size = "md",
  variant = "full",
  className,
  priority = false,
}: WordmarkProps) {
  const height = HEIGHT[size];
  const width = Math.round(height * (variant === "mark" ? MARK_RATIO : FULL_RATIO));

  return (
    <Image
      src={variant === "mark" ? "/brand/mark.png" : "/brand/wordmark.png"}
      alt="hireloop"
      width={width}
      height={height}
      priority={priority}
      className={`select-none${className ? ` ${className}` : ""}`}
      style={{ height, width: "auto" }}
    />
  );
}

export default Wordmark;
