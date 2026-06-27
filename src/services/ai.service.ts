import Groq from "groq-sdk";
import { buildInterviewerSystemPrompt, buildReportPrompt } from "@/lib/prompts";
import { clamp } from "@/lib/utils";
import type {
  InterviewReport,
  Message,
  QuestionBreakdown,
  RecommendedResource,
  Role,
  Seniority,
} from "@/types";

/* ============================================================ *
 * Groq (Llama 3.3) integration — the interviewer brain + report
 * grader. Every LLM call in HireLoop goes through this module.
 * ============================================================ */

/** Active Groq model for report grading — quality over latency. */
export const GROQ_MODEL = "llama-3.3-70b-versatile";
// Alternatives if needed: "llama-3.1-8b-instant" (faster), "openai/gpt-oss-120b"

/**
 * Live interviewer turns use the instant model: interview replies are only
 * 1-3 spoken sentences, so the 8B model is more than capable AND cuts
 * time-to-first-token dramatically — the audio starts almost immediately.
 */
export const GROQ_INTERVIEWER_MODEL = "llama-3.1-8b-instant";

const INTERVIEWER_MAX_TOKENS = 256;
const REPORT_MAX_TOKENS = 4096;

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
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

/* ============================================================ *
 * Streaming interviewer turns.
 * ============================================================ */

/**
 * Stream the AI interviewer's next response. Yields text chunks as they
 * arrive from Groq's streaming API.
 */
export async function* streamInterviewerResponse(
  role: Role,
  seniority: Seniority,
  messages: Message[],
  options: { seed?: number; durationMinutes?: number; keyMarker?: boolean } = {},
): AsyncGenerator<string, void, unknown> {
  const systemPrompt = buildInterviewerSystemPrompt(role, seniority, options);

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

  const stream = await getGroq().chat.completions.create({
    model: GROQ_INTERVIEWER_MODEL,
    messages: [{ role: "system" as const, content: systemPrompt }, ...convo],
    temperature: 0.85,
    max_tokens: INTERVIEWER_MAX_TOKENS,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
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
): Promise<Omit<InterviewReport, "_id" | "sessionId" | "generatedAt">> {
  const response = await getGroq().chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a senior engineering manager. You ALWAYS respond with valid JSON only — no markdown, no backticks, no preamble, no explanation. Just the raw JSON object.",
      },
      { role: "user", content: buildReportPrompt(role, seniority, transcript) },
    ],
    temperature: 0.4,
    max_tokens: REPORT_MAX_TOKENS,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty response from Groq");

  return { roleId: role.id, seniority, ...parseReportJSON(raw) };
}
