import Groq from "groq-sdk";
import {
  buildDsaInterviewerSystemPrompt,
  buildDsaReportPrompt,
  buildInterviewerSystemPrompt,
  buildReportPrompt,
} from "@/lib/prompts";
import { clamp } from "@/lib/utils";
import type {
  CodeLanguage,
  DsaDifficulty,
  InterviewReport,
  InterviewType,
  Message,
  QuestionBreakdown,
  RecommendedResource,
  Role,
  Seniority,
} from "@/types";

/* ============================================================ *
 * Groq integration — the interviewer brain + report grader.
 * Every LLM call in HireLoop goes through this module.
 * ============================================================ */

/**
 * Active Groq model for report grading — quality over latency. Grades a
 * full transcript in ~5s.
 *
 * NOTE: `llama-3.3-70b-versatile` and `llama-3.1-8b-instant` were both
 * retired by Groq and now 404, which broke every question and every
 * report. Verify a model is still live with `GET /openai/v1/models`
 * before switching, and check `/api/health`, which fails loudly when the
 * configured id is missing.
 */
export const GROQ_MODEL =
  process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-120b";

/**
 * Live interviewer turns: a reply is only 1-3 spoken sentences, so this
 * is tuned for time-to-first-token rather than depth. Kept separate from
 * the grading model so the two can be traded off independently.
 */
export const GROQ_INTERVIEWER_MODEL =
  process.env.GROQ_INTERVIEWER_MODEL?.trim() || "openai/gpt-oss-120b";

/**
 * Models tried in order when the primary is unavailable (404 from a
 * retirement, 429 rate limit, or a 5xx). Rate limits are per model, so
 * failing over also routes around a exhausted token budget.
 */
function chainFrom(primary: string): string[] {
  return [
    primary,
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
    "groq/compound-mini",
  ].filter((m, i, all) => all.indexOf(m) === i);
}

const INTERVIEWER_MODELS = chainFrom(GROQ_INTERVIEWER_MODEL);
const REPORT_MODELS = chainFrom(GROQ_MODEL);

const INTERVIEWER_MAX_TOKENS = 400; // a turn is 1-3 spoken sentences
const REPORT_MAX_TOKENS = 6000;

/** Lazily-constructed, cached Groq client (never crashes at import time). */
let groqClient: Groq | null = null;
function getGroq(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error(
        "GROQ_API_KEY is not defined — add it to .env.local (see .env.local.example).",
      );
    }
    groqClient = new Groq({
      apiKey,
      // No SDK-level retries: on a 429 the SDK waits out `Retry-After`,
      // which showed up as 4-9s stalls mid-interview. Rate limits are
      // per model, so failing straight over to the next model in
      // FALLBACK_MODELS is both faster and more likely to succeed.
      maxRetries: 0,
      timeout: 30_000,
    });
  }
  return groqClient;
}

/**
 * Per-model tuning. The gpt-oss and Qwen models emit hidden reasoning
 * tokens before their first visible token; asking one spoken interview
 * question needs none of that, and `low` cuts time-to-first-token by
 * ~85ms. `groq/compound-mini` rejects the parameter outright, so it is
 * only sent to models that accept it.
 */
function speedOptions(model: string): { reasoning_effort?: "low" } {
  const supportsReasoningEffort =
    model.startsWith("openai/gpt-oss") || model.startsWith("qwen/");
  return supportsReasoningEffort ? { reasoning_effort: "low" } : {};
}

/** True for errors worth retrying on the next model in the chain. */
function isRetriable(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (typeof status === "number") {
    return status === 404 || status === 429 || status >= 500;
  }
  return true; // network/timeout — worth one more try
}

/* ============================================================ *
 * Streaming interviewer turns.
 * ============================================================ */

/** Recent messages kept verbatim (4 question/answer pairs). */
const RECENT_MESSAGES = 8;

type ChatMessage = { role: "assistant" | "user"; content: string };

/**
 * Bound the size of each request.
 *
 * Replaying the whole transcript every turn makes later turns several
 * times more expensive than early ones — on Groq's free tier (8k tokens
 * per minute) that is what pushes a long interview into 429s and
 * multi-second stalls. Recent turns are kept verbatim so follow-ups stay
 * coherent, while older ones collapse into a list of topics already
 * covered, which is all the interviewer needs to avoid repeating itself.
 */
function trimHistory(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= RECENT_MESSAGES) return messages;

  const older = messages.slice(0, -RECENT_MESSAGES);
  const recent = messages.slice(-RECENT_MESSAGES);

  const askedEarlier = older
    .filter((m) => m.role === "assistant")
    .map((m, i) => `${i + 1}. ${m.content.split(/(?<=[.!?])\s/)[0]}`)
    .join("\n");

  if (!askedEarlier) return recent;

  return [
    {
      role: "user",
      content: `[Context: earlier in this interview you already asked these questions — do not repeat them:\n${askedEarlier}\n\nThe most recent exchanges follow.]`,
    },
    ...recent,
  ];
}

/**
 * Stream the AI interviewer's next response. Yields text chunks as they
 * arrive from Groq's streaming API.
 */
export async function* streamInterviewerResponse(
  role: Role,
  seniority: Seniority,
  messages: Message[],
  options: {
    seed?: number;
    durationMinutes?: number;
    keyMarker?: boolean;
    interviewType?: InterviewType;
    dsaDifficulty?: DsaDifficulty;
    language?: CodeLanguage;
    /** Closing turn: wrap up instead of asking again. */
    finalTurn?: boolean;
  } = {},
): AsyncGenerator<string, void, unknown> {
  const systemPrompt =
    options.interviewType === "dsa" && options.dsaDifficulty && options.language
      ? buildDsaInterviewerSystemPrompt({
          difficulty: options.dsaDifficulty,
          language: options.language,
          seed: options.seed,
          durationMinutes: options.durationMinutes,
        })
      : buildInterviewerSystemPrompt(role, seniority, options);

  // Convert internal Message[] to Groq's OpenAI-style format.
  const convo = messages.map((m) => ({
    role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: m.content,
  }));

  // Groq needs at least one non-system message; on the very first turn the
  // transcript is empty, so seed a kickoff message.
  if (convo.length === 0) {
    convo.push({
      role: "user" as const,
      content: "I'm ready to begin. Please start the interview.",
    });
  }

  // On the closing turn the instruction goes *after* the transcript.
  // Placed in the system prompt it competes with "ask 8-12 questions"
  // and loses; last position wins, and the model closes cleanly.
  const closingInstruction = options.finalTurn
    ? [
        {
          role: "system" as const,
          content:
            "The interview is now over. Do NOT ask another question of any kind. Reply with exactly one warm sentence thanking the candidate for their time, and nothing else.",
        },
      ]
    : [];

  const payload = {
    messages: [
      { role: "system" as const, content: systemPrompt },
      ...trimHistory(convo),
      ...closingInstruction,
    ],
    // 0.85 keeps questions varied between attempts at the same role.
    temperature: 0.85,
    max_tokens: INTERVIEWER_MAX_TOKENS,
    stream: true as const,
  };

  let lastError: unknown = null;

  for (const model of INTERVIEWER_MODELS) {
    let emitted = false;
    try {
      const stream = await getGroq().chat.completions.create({
        model,
        ...speedOptions(model),
        ...payload,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          emitted = true;
          yield content;
        }
      }
      return; // turn delivered
    } catch (err) {
      lastError = err;
      // Once text has reached the candidate we cannot restart cleanly —
      // a second model would repeat the half-spoken question.
      if (emitted || !isRetriable(err)) throw err;
      console.warn(
        `Groq model "${model}" failed (${(err as Error)?.message}) — trying the next one.`,
      );
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("All Groq models failed to produce an interviewer turn");
}

/* ============================================================ *
 * Report generation (single non-streaming call).
 * ============================================================ */

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

function parseQuestionBreakdown(value: unknown): QuestionBreakdown[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw, index): QuestionBreakdown => {
    const item = (raw ?? {}) as Record<string, unknown>;
    return {
      questionIndex: Math.round(asNumber(item.questionIndex, index)),
      question: asString(item.question),
      yourAnswer: asString(item.yourAnswer),
      score: clamp(Math.round(asNumber(item.score)), 0, 10),
      feedback: asString(item.feedback),
      modelAnswer: asString(item.modelAnswer),
      timestamp: Math.round(asNumber(item.timestamp, Date.now())),
    };
  });
}

function parseResources(value: unknown): RecommendedResource[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw): RecommendedResource => {
      const item = (raw ?? {}) as Record<string, unknown>;
      return {
        title: asString(item.title),
        url: asString(item.url),
        reason: asString(item.reason),
      };
    })
    .filter((r) => r.title.length > 0);
}

/** The LLM-derived portion of a report (role + session metadata added later). */
type ReportContent = Omit<
  InterviewReport,
  "_id" | "sessionId" | "roleId" | "seniority" | "generatedAt"
>;

/**
 * Robustly extract + validate the report JSON. Llama occasionally wraps
 * output in code fences or adds stray text — this strips fences and
 * isolates the `{ ... }` object, then coerces every field.
 */
function parseReportJSON(raw: string): ReportContent {
  const text = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Groq report response did not contain a JSON object");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error("Failed to parse the Groq report response as JSON");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Groq report JSON is not an object");
  }

  const obj = parsed as Record<string, unknown>;
  const scores = (obj.scores ?? {}) as Record<string, unknown>;

  return {
    overallScore: clamp(Math.round(asNumber(obj.overallScore)), 0, 100),
    scores: {
      technicalDepth: clamp(
        Math.round(asNumber(scores.technicalDepth)),
        0,
        100,
      ),
      communicationClarity: clamp(
        Math.round(asNumber(scores.communicationClarity)),
        0,
        100,
      ),
      problemSolving: clamp(
        Math.round(asNumber(scores.problemSolving)),
        0,
        100,
      ),
    },
    verdict: asString(obj.verdict, "Assessment unavailable."),
    headline: asString(obj.headline, "Interview debrief"),
    questionBreakdown: parseQuestionBreakdown(obj.questionBreakdown),
    strengths: asStringArray(obj.strengths),
    improvements: asStringArray(obj.improvements),
    recommendedResources: parseResources(obj.recommendedResources),
    durationMinutes: Math.max(0, Math.round(asNumber(obj.durationMinutes, 0))),
  };
}

/**
 * Generate the full scored debrief report from the interview transcript.
 * Non-streaming call — returns the parsed, validated report (minus the
 * `_id`, `sessionId`, and `generatedAt` fields the caller fills in).
 */
export async function generateReport(
  role: Role,
  seniority: Seniority,
  transcript: Message[],
  opts: {
    interviewType?: InterviewType;
    dsaDifficulty?: DsaDifficulty;
    language?: CodeLanguage;
  } = {},
): Promise<Omit<InterviewReport, "_id" | "sessionId" | "generatedAt">> {
  const userPrompt =
    opts.interviewType === "dsa" && opts.dsaDifficulty && opts.language
      ? buildDsaReportPrompt(opts.dsaDifficulty, opts.language, transcript)
      : buildReportPrompt(role, seniority, transcript);

  const messages = [
    {
      role: "system" as const,
      content:
        "You are a senior engineering manager. You ALWAYS respond with valid JSON only — no markdown, no backticks, no preamble, no explanation. Just the raw JSON object.",
    },
    {
      role: "user" as const,
      content: userPrompt,
    },
  ];

  let lastError: unknown = null;

  for (const model of REPORT_MODELS) {
    try {
      const response = await getGroq().chat.completions.create({
        model,
        messages,
        temperature: 0.4,
        max_tokens: REPORT_MAX_TOKENS,
        response_format: { type: "json_object" },
      });

      const raw = response.choices[0]?.message?.content;
      if (!raw) throw new Error("Empty response from Groq");

      return { roleId: role.id, seniority, ...parseReportJSON(raw) };
    } catch (err) {
      lastError = err;
      console.warn(
        `Report generation failed on "${model}": ${(err as Error)?.message}`,
      );
    }
  }

  // Every model failed (or returned unparseable JSON). A finished interview
  // must still produce a debrief, so fall back to a transcript-derived one
  // rather than dropping the candidate on an error screen.
  console.error("All report models failed — serving fallback report", lastError);
  return buildFallbackReport(role, seniority, transcript);
}

/* ============================================================ *
 * Deterministic fallback report — no LLM required.
 * ============================================================ */

/**
 * Build a usable debrief straight from the transcript when every model
 * call fails. Scores are derived from answer depth, so the report is
 * honest about what it can measure and never fabricates feedback.
 */
function buildFallbackReport(
  role: Role,
  seniority: Seniority,
  transcript: Message[],
): Omit<InterviewReport, "_id" | "sessionId" | "generatedAt"> {
  const questions = transcript.filter((m) => m.role === "assistant");
  const answers = transcript.filter((m) => m.role === "user");

  const words = answers.reduce(
    (sum, a) => sum + a.content.trim().split(/\s+/).filter(Boolean).length,
    0,
  );
  const avgWords = answers.length > 0 ? words / answers.length : 0;
  // 40 words per answer ≈ a substantive response; scale to a 0-100 band
  // centred on 65 so the number reads as "provisional", not authoritative.
  const base = clamp(Math.round(40 + Math.min(avgWords, 80) * 0.45), 0, 100);

  const breakdown: QuestionBreakdown[] = questions.map((q, i) => {
    const answer = answers[i];
    const answerWords = answer
      ? answer.content.trim().split(/\s+/).filter(Boolean).length
      : 0;
    return {
      questionIndex: i,
      question: q.content.replace(/\[INTERVIEW_COMPLETE\]/g, "").trim(),
      yourAnswer: answer?.content.trim() ?? "(no answer recorded)",
      score: clamp(Math.round(Math.min(answerWords, 80) / 8), 0, 10),
      feedback:
        "Automatic grading was unavailable for this session, so this entry shows your answer as recorded. Re-run the interview for full per-question feedback.",
      modelAnswer: `A strong ${seniority}-level answer would work through this out loud: state your approach, name the trade-offs you are weighing, and finish with how you would verify it. Model answers are written by the grader, which could not be reached for this session.`,
      timestamp: q.timestamp,
    };
  });

  const first = transcript[0]?.timestamp;
  const last = transcript[transcript.length - 1]?.timestamp;
  const durationMinutes =
    first && last && last > first ? Math.round((last - first) / 60000) : 0;

  return {
    roleId: role.id,
    seniority,
    overallScore: base,
    scores: {
      technicalDepth: base,
      communicationClarity: base,
      problemSolving: base,
    },
    verdict: `You completed ${answers.length} answer${answers.length === 1 ? "" : "s"} across ${questions.length} question${questions.length === 1 ? "" : "s"} in this ${seniority}-level ${role.name} interview. Detailed AI grading was unavailable, so this debrief shows your full transcript with provisional scores based on answer depth.`,
    headline: `${role.name} interview — transcript recorded`,
    questionBreakdown: breakdown,
    strengths: [
      `Completed ${answers.length} of ${questions.length} questions end to end.`,
      `Averaged ${Math.round(avgWords)} words per answer.`,
    ],
    improvements: [
      "Re-run this interview to get full AI-scored feedback per question.",
    ],
    recommendedResources: role.topics.slice(0, 3).map((topic) => ({
      title: `Review: ${topic}`,
      url: `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(topic)}`,
      reason: `A core focus area for ${seniority}-level ${role.name} interviews.`,
    })),
    durationMinutes,
  };
}
