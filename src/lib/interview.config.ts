/* ============================================================ *
 * Interview shape — shared by the server (which enforces it) and
 * the UI (which displays it).
 *
 * Kept out of `prompts.ts` so client components can import these
 * numbers without bundling the interviewer's system prompt.
 * ============================================================ */

/** Fewest questions before the interviewer may end the interview. */
export const MIN_QUESTIONS = 8;

/** The interviewer is told to wrap up on this turn. */
export const MAX_QUESTIONS = 12;

/** Interview length in seconds. */
export const INTERVIEW_SECONDS = 30 * 60;
