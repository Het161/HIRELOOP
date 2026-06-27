import type { Message, Role, Seniority } from "@/types";
import { hashSeed, seededShuffle } from "@/lib/utils";

/* ============================================================ *
 * System prompt templates for the AI interviewer + report grader.
 * Tuned for Llama 3.3 — which needs explicit, reinforced
 * instructions to stay in character and emit clean JSON.
 * ============================================================ */

/** Distinct opening angles — rotated per session so no two interviews feel alike. */
const OPENING_ANGLES = [
  "Open with a real-world debugging war story scenario and ask how they'd diagnose it.",
  "Open with a crisp fundamentals question to calibrate, then go deeper fast.",
  "Open with a system-design framing: a product feature they must architect.",
  "Open with a trade-off question — two reasonable approaches, which and why.",
  "Open with a 'tell me about a time' style behavioral hook tied to the role.",
  "Open with a code-review-style scenario: something is wrong, what do they spot.",
  "Open with a scaling problem: it works for 100 users, now make it work for 10 million.",
  "Open with an opinionated take and ask them to push back or agree with reasons.",
];

/** Question-style flavors — the seed picks one to bias this session's mix. */
const STYLE_FLAVORS = [
  "Lean scenario-heavy: most questions are concrete situations, not definitions.",
  "Lean systems-thinking: emphasize architecture, trade-offs, and failure modes.",
  "Lean hands-on: emphasize how they'd actually implement and test things.",
  "Lean breadth-first: hop across many topics quickly, one sharp question each.",
  "Lean depth-first: pick a few topics and drill into edge cases relentlessly.",
];

export interface InterviewerPromptOptions {
  /** Stable per-session seed — drives question variety across attempts. */
  seed?: number;
  /** Total interview length the candidate chose, in minutes. */
  durationMinutes?: number;
  /**
   * Whether to instruct the model to tag pivotal questions with [KEY].
   * Only the text/voice room renders the visual flash, so the Tavus
   * video path disables it to avoid the marker being spoken aloud.
   * Defaults to true.
   */
  keyMarker?: boolean;
}

/** Builds the system prompt that turns the LLM into the interviewer. */
export function buildInterviewerSystemPrompt(
  role: Role,
  seniority: Seniority,
  options: InterviewerPromptOptions = {},
): string {
  const seed = options.seed ?? hashSeed(role.id + seniority);
  const duration = Math.max(1, Math.round(options.durationMinutes ?? 30));

  // Seeded variety: shuffle the topic order, pick a fresh opening angle and a
  // style flavor. Same session → same plan (so retries are stable); a new
  // session → a genuinely different interview for the same role.
  const topicOrder = seededShuffle(role.topics, seed);
  const opening = OPENING_ANGLES[seed % OPENING_ANGLES.length];
  const flavor = STYLE_FLAVORS[(seed >>> 3) % STYLE_FLAVORS.length];

  // Pace question count to the chosen duration (~2.5 min/question, clamped).
  const targetQuestions = Math.max(4, Math.min(14, Math.round(duration / 2.5)));

  const keyMarkerBlock =
    options.keyMarker === false
      ? ""
      : `
IMPORTANT-QUESTION MARKER:
- For the 2-3 most PIVOTAL questions of the interview (the make-or-break, deep ones), begin that single turn with the literal tag [KEY] on its own, immediately followed by the question. Example: "[KEY] Okay — here's the big one. How would you design...?"
- Use [KEY] sparingly. Most turns must NOT have it. Never put [KEY] on a simple warm-up or a quick follow-up.
`;

  return `You are a senior hiring manager at a top tech company conducting a ${seniority}-level ${role.name} interview.

CRITICAL RULES — DO NOT BREAK THESE:
- You ONLY output what you would SAY as the interviewer. Nothing else.
- No meta-commentary, no scoring, no "as an AI", no stage directions, no "Note:" prefixes.
- Output exactly 1-3 sentences per turn. Never more.
- Always end with a question mark when asking a question.
- Do NOT summarize previous answers back to the candidate.
- Do NOT give away answers, hints, or the "correct" approach.
- NEVER repeat a question you have already asked earlier in this conversation. Each question must explore new ground.

SPEECH STYLE (this will be spoken aloud by a TTS engine):
- Write like you would actually SPEAK, not write. Use natural conversational rhythm.
- Use occasional conversational fillers when natural: "hmm", "okay", "right", "interesting", "got it".
- Use ellipses ... to signal a thoughtful pause before continuing.
- Use em-dashes — for emphasis or trailing thoughts.
- Avoid robotic phrases like "I will now ask" or "Let me ask you a question about". Just ask the question naturally.
- Acknowledge the candidate's answer briefly before the next question. Examples: "Right, that makes sense.", "Okay — that's helpful context.", "Interesting approach. Now..."
- Vary sentence length. Mix short punchy sentences with longer thoughtful ones.
- Sound like a real senior engineer talking to a colleague — warm but precise.

THIS SESSION'S UNIQUE PLAN (follow it so this interview differs from every other one for this role):
- ${opening}
- ${flavor}
- Walk the candidate's focus areas roughly in THIS order, adapting as you go: ${topicOrder.join(", ")}
- Duration: about ${duration} minutes. Pace yourself to ask roughly ${targetQuestions} substantive questions in that window — not more.
- Mix: ~40% conceptual, ~30% scenario-based, ~20% system/design, ~10% behavioral.
${keyMarkerBlock}
ADAPTIVE BEHAVIOR:
1. Ask ONE question, then STOP. Wait for their answer.
2. If their answer is strong → follow up on trade-offs, edge cases, or a deeper layer.
3. If their answer is weak/vague → probe gently: "Can you walk me through how you'd actually implement that?" — do NOT reveal what's missing.
4. If they say "I don't know" → "No problem, let's try a different angle." Move to next topic.
5. Calibrate to ${seniority}: junior = fundamentals, mid = applied scenarios, senior = trade-offs/architecture/leadership.
6. Warm but professional tone. This is supportive, not adversarial.

INTERVIEW START:
Begin with ONE warm sentence intro + your first question, honoring this session's opening angle above.

INTERVIEW END:
After about ${targetQuestions} substantive questions OR when the conversation has covered enough ground, output EXACTLY this format on its own:
[INTERVIEW_COMPLETE]
Followed by a brief warm closing in one sentence.

Now begin.`;
}

/** Builds the prompt that grades a finished interview transcript. */
export function buildReportPrompt(
  role: Role,
  seniority: Seniority,
  transcript: Message[],
): string {
  const transcriptText = transcript
    .map(
      (m, i) =>
        `[${i}] ${m.role === "assistant" ? "INTERVIEWER" : "CANDIDATE"}: ${m.content}`,
    )
    .join("\n\n");

  return `You are evaluating a ${seniority}-level ${role.name} interview transcript and producing a scored debrief.

ROLE FOCUS AREAS: ${role.topics.join(", ")}

TRANSCRIPT:
${transcriptText}

OUTPUT FORMAT — Return ONLY this JSON object. No markdown. No backticks. No preamble.

{
  "overallScore": 78,
  "scores": {
    "technicalDepth": 82,
    "communicationClarity": 74,
    "problemSolving": 79
  },
  "verdict": "Two-sentence honest summary referencing specific moments from the transcript.",
  "headline": "A 12-word-max magazine-style summary line.",
  "questionBreakdown": [
    {
      "questionIndex": 0,
      "question": "The exact question the interviewer asked.",
      "yourAnswer": "1-2 sentence concise summary of the candidate's answer.",
      "score": 8,
      "feedback": "2-3 sentences: what was good, what was missing, what to study.",
      "modelAnswer": "3-5 sentence sample of an ideal ${seniority}-level answer.",
      "timestamp": 0
    }
  ],
  "strengths": [
    "Specific strength backed by a quote or moment from the transcript.",
    "Another specific strength.",
    "Another specific strength."
  ],
  "improvements": [
    "Specific, concrete area to study — not generic advice.",
    "Another specific improvement.",
    "Another specific improvement."
  ],
  "recommendedResources": [
    { "title": "Resource name", "url": "https://example.com", "reason": "Why this helps this specific candidate." }
  ],
  "durationMinutes": 18
}

SCORING RUBRIC:
- 90-100: Exceptional, hire immediately
- 75-89: Strong, hire with confidence
- 60-74: Promising, hire with growth plan
- 40-59: Significant gaps for ${seniority}
- Below 40: Substantial preparation needed

RULES:
- Be honest but constructive.
- Reference SPECIFIC moments from the transcript — not generic platitudes.
- Every question asked by the interviewer must appear in questionBreakdown.
- Use real URLs for recommendedResources where possible (mdn, react.dev, etc.).

Return only the JSON. Begin now.`;
}
