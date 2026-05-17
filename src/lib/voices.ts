import type { Seniority } from "@/types";

/* ============================================================ *
 * Cartesia voice configuration — realistic female interviewer
 * voices. IDs below are verified against Cartesia's live voice
 * library (all feminine, English).
 * ============================================================ */

export interface VoiceProfile {
  /** Cartesia voice id. */
  id: string;
  /** Persona name shown to the candidate. */
  name: string;
  description: string;
}

export const VOICES = {
  warm_professional: {
    id: "829ccd10-f8b3-43cd-b8a0-4aeaa81f3b30", // Cartesia "Linda — Conversational Guide"
    name: "Sarah",
    description: "Warm, supportive senior engineer vibe",
  },
  friendly_encouraging: {
    id: "58fbaf73-d7de-4e82-a6b3-118180e7057c", // Cartesia "Janet — Sunny Speaker"
    name: "Maya",
    description: "Younger, friendly, encouraging tone",
  },
  confident_authoritative: {
    id: "643f5eee-459d-4b41-b4fc-0b8407139be6", // Cartesia "Vicky — Businesswoman"
    name: "Elena",
    description: "Confident, professional, senior staff engineer",
  },
} as const satisfies Record<string, VoiceProfile>;

/**
 * Pick the interviewer voice for the candidate's seniority level.
 * - junior  → encouraging voice (less intimidating)
 * - mid     → warm professional voice
 * - senior  → confident authoritative voice (peer-to-peer feel)
 */
export function getVoiceForSeniority(seniority: Seniority): VoiceProfile {
  switch (seniority) {
    case "junior":
      return VOICES.friendly_encouraging;
    case "senior":
      return VOICES.confident_authoritative;
    case "mid":
    default:
      return VOICES.warm_professional;
  }
}

/** Cartesia model — Sonic-2 is the fastest high-quality model. */
export const CARTESIA_MODEL = "sonic-2";

/**
 * Voice tuning. NOTE: Cartesia emotion levels are limited to
 * `low` / `high` / `highest` (no `medium`) — verified against the API.
 */
export const VOICE_PARAMS = {
  language: "en" as const,
  speed: "normal" as const, // 'slow' | 'normal' | 'fast'
  emotion: ["positivity:high", "curiosity:high"] as string[],
};
