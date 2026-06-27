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

/**
 * Deterministic 32-bit hash of a string (FNV-1a). Same input → same seed,
 * so a given session always produces the same interview variety while
 * different sessions diverge.
 */
export function hashSeed(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Deterministically shuffle a copy of `items` using a numeric seed
 * (seeded Fisher–Yates via a tiny mulberry32 PRNG).
 */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  let state = seed >>> 0;
  const rand = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Title-case a seniority value, e.g. "mid" -> "Mid". */
export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
