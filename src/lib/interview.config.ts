/* ============================================================ *
 * Interview shape — shared by the prompt builder, the server
 * (which enforces it) and the UI (which displays it).
 *
 * Kept out of `prompts.ts` so client components can import these
 * numbers without bundling the interviewer's system prompt.
 * ============================================================ */

/** Fallback when a session predates the duration picker. */
export const DEFAULT_DURATION_MINUTES = 30;

/**
 * How many substantive questions fit in the chosen duration, at roughly
 * 2.5 minutes per question. The prompt asks for this many; the server
 * enforces the bounds below, because left to itself the model wraps up
 * after three or four when answers are short.
 */
export function targetQuestionCount(durationMinutes: number): number {
  const minutes = Number.isFinite(durationMinutes)
    ? durationMinutes
    : DEFAULT_DURATION_MINUTES;
  return Math.max(4, Math.min(14, Math.round(minutes / 2.5)));
}

/** The interviewer may not end before this many questions. */
export function minQuestionCount(durationMinutes: number): number {
  return Math.max(3, Math.round(targetQuestionCount(durationMinutes) * 0.7));
}

/** The interviewer is told to wrap up on this turn. */
export function maxQuestionCount(durationMinutes: number): number {
  return targetQuestionCount(durationMinutes) + 2;
}
