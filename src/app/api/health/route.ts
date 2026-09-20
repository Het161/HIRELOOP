import { connectDB, isDbConfigured } from "@/lib/mongodb";
import { GROQ_MODEL } from "@/services/ai.service";
import { CARTESIA_MODEL, getVoiceForSeniority } from "@/lib/voices";
import { isDegraded } from "@/lib/memory-store";
import { maxQuestionCount, DEFAULT_DURATION_MINUTES } from "@/lib/interview.config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One dependency's result. */
interface Check {
  name: string;
  ok: boolean;
  /** Round-trip time in milliseconds. */
  ms: number;
  detail: string;
  /** False when the app still works without it. */
  required: boolean;
}

async function check(
  name: string,
  required: boolean,
  work: () => Promise<string>,
): Promise<Check> {
  const t0 = Date.now();
  try {
    const detail = await work();
    return { name, ok: true, ms: Date.now() - t0, detail, required };
  } catch (err) {
    return {
      name,
      ok: false,
      ms: Date.now() - t0,
      detail: err instanceof Error ? err.message : "failed",
      required,
    };
  }
}

/**
 * GET /api/health — preflight for a live demo.
 *
 * Verifies that the interviewer brain, the voice, the transcription and
 * the database are all reachable *and* that the configured model ids
 * still exist, which is the failure that is otherwise invisible until a
 * candidate is already on screen.
 */
export async function GET(): Promise<Response> {
  const groqKey = process.env.GROQ_API_KEY;
  const cartesiaKey = process.env.CARTESIA_API_KEY;

  /** Rate-limit headroom, captured by the groq:completion probe below. */
  let lastTokenLimit = Number.NaN;
  let lastTokensLeft = Number.NaN;

  const checks = await Promise.all([
    check("groq:model", true, async () => {
      if (!groqKey) throw new Error("GROQ_API_KEY is not set");
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${groqKey}` },
      });
      if (!res.ok) throw new Error(`models endpoint returned ${res.status}`);
      const data = (await res.json()) as { data?: Array<{ id: string }> };
      const ids = (data.data ?? []).map((m) => m.id);
      if (!ids.includes(GROQ_MODEL)) {
        throw new Error(
          `model "${GROQ_MODEL}" is NOT available on this key — questions would fall back. Live chat models: ${ids.filter((id) => !id.includes("whisper") && !id.includes("guard")).join(", ")}`,
        );
      }
      return `${GROQ_MODEL} is live`;
    }),

    check("groq:completion", true, async () => {
      if (!groqKey) throw new Error("GROQ_API_KEY is not set");
      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [{ role: "user", content: "Reply with the word OK." }],
            max_tokens: 5,
          }),
        },
      );
      if (!res.ok) {
        throw new Error(`${res.status}: ${(await res.text()).slice(0, 160)}`);
      }

      // Token-per-minute headroom is the limit that actually bites
      // during a live interview: exceed it and turns start returning
      // 429s mid-conversation. Recorded here, judged by groq:quota.
      lastTokenLimit = Number(res.headers.get("x-ratelimit-limit-tokens"));
      lastTokensLeft = Number(res.headers.get("x-ratelimit-remaining-tokens"));

      return "interviewer brain responding";
    }),

    check("cartesia:tts", false, async () => {
      if (!cartesiaKey) throw new Error("CARTESIA_API_KEY is not set");
      const res = await fetch("https://api.cartesia.ai/tts/bytes", {
        method: "POST",
        headers: {
          "Cartesia-Version": "2024-11-13",
          "X-API-Key": cartesiaKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model_id: CARTESIA_MODEL,
          transcript: "Preflight check.",
          voice: { mode: "id", id: getVoiceForSeniority("mid").id },
          output_format: {
            container: "mp3",
            bit_rate: 128000,
            sample_rate: 44100,
          },
          language: "en",
        }),
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${(await res.text()).slice(0, 160)}`);
      }
      const bytes = (await res.arrayBuffer()).byteLength;
      return `${CARTESIA_MODEL} returned ${bytes} bytes of audio`;
    }),

    check("groq:whisper", false, async () => {
      if (!groqKey) throw new Error("GROQ_API_KEY is not set");
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${groqKey}` },
      });
      if (!res.ok) throw new Error(`models endpoint returned ${res.status}`);
      const data = (await res.json()) as { data?: Array<{ id: string }> };
      const ok = (data.data ?? []).some(
        (m) => m.id === "whisper-large-v3-turbo",
      );
      if (!ok) throw new Error("whisper-large-v3-turbo is not available");
      return "voice-input fallback available";
    }),

    check("mongodb", false, async () => {
      if (!isDbConfigured()) {
        throw new Error("MONGODB_URI is not set — sessions live in memory only");
      }
      const mongoose = await connectDB();
      await mongoose.connection.db?.admin().ping();
      return isDegraded()
        ? "reachable, but the app is currently in memory-fallback mode"
        : "connected";
    }),
  ]);

  // Runs after the probe above, which is what reads the headers.
  checks.push(
    await check("groq:quota", false, async () => {
      if (!Number.isFinite(lastTokenLimit)) {
        throw new Error("rate-limit headers unavailable");
      }
      if (lastTokenLimit <= 10_000) {
        throw new Error(
          `this key allows only ${lastTokenLimit} tokens/minute (free tier). A full ${maxQuestionCount(DEFAULT_DURATION_MINUTES)}-question ` +
            "interview plus its report needs roughly 20k, so late turns will hit 429s and fall back to a " +
            "smaller model. Upgrade the Groq plan before presenting, or keep the demo interview short.",
        );
      }
      return `${lastTokensLeft}/${lastTokenLimit} tokens available this minute`;
    }),
  );

  const blocking = checks.filter((c) => c.required && !c.ok);
  const degraded = checks.filter((c) => !c.required && !c.ok);

  return Response.json(
    {
      status: blocking.length > 0 ? "down" : degraded.length > 0 ? "degraded" : "ok",
      summary:
        blocking.length > 0
          ? `${blocking.length} required dependency down — the interview will not run.`
          : degraded.length > 0
            ? `Running with reduced features: ${degraded.map((c) => c.name).join(", ")}.`
            : "All systems go.",
      checks,
      checkedAt: new Date().toISOString(),
    },
    {
      status: blocking.length > 0 ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
