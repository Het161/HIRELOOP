/* ============================================================ *
 * Small shared utilities.
 * ============================================================ */

/** Join class names, dropping falsy values. */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

/** Format a duration in seconds as MM:SS. */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Human-readable long date, e.g. "May 16, 2026". */
export function formatDate(date: Date | string | number): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Qualitative band for a 0-100 score. */
export function scoreBand(score: number): string {
  if (score >= 90) return "Exceptional";
  if (score >= 75) return "Strong";
  if (score >= 60) return "Promising";
  if (score >= 40) return "Developing";
  return "Needs work";
}

/** Short verdict label for the score rubric. */
export function scoreVerdict(score: number): string {
  if (score >= 90) return "Would hire immediately";
  if (score >= 75) return "Hire with confidence";
  if (score >= 60) return "Hire with a growth plan";
  if (score >= 40) return "Significant gaps remain";
  return "Substantial preparation needed";
}

/** Clamp a number into the [min, max] range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Title-case a seniority value, e.g. "mid" -> "Mid". */
export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
