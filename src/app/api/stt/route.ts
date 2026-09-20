import Groq from "groq-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Groq's Whisper deployment. `turbo` transcribes a 6-second clip in
 * ~290ms, which is fast enough to feel instant after the candidate
 * stops speaking.
 */
const WHISPER_MODEL = "whisper-large-v3-turbo";

/** Guard against oversized uploads — an answer is at most a few minutes. */
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

let groqClient: Groq | null = null;
function getGroq(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error("GROQ_API_KEY is not defined");
    }
    groqClient = new Groq({ apiKey, maxRetries: 1, timeout: 20_000 });
  }
  return groqClient;
}

/**
 * POST /api/stt — transcribe recorded answer audio.
 *
 * This is the fallback path for browsers without the Web Speech API
 * (Safari, Firefox) and for when the browser's own recognition service
 * fails, which it commonly does on conference Wi-Fi.
 */
export async function POST(req: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json(
      { error: "Expected multipart form data" },
      { status: 400 },
    );
  }

  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return Response.json({ error: "audio file is required" }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return Response.json({ error: "audio file is too large" }, { status: 413 });
  }

  try {
    const transcription = await getGroq().audio.transcriptions.create({
      file: audio,
      model: WHISPER_MODEL,
      language: "en",
      response_format: "json",
      // Nudges Whisper toward the vocabulary of a technical interview.
      prompt:
        "A candidate answering a technical job interview question about software engineering, APIs, databases, React, and system design.",
    });

    return Response.json({ text: (transcription.text ?? "").trim() });
  } catch (err) {
    return Response.json(
      {
        error: err instanceof Error ? err.message : "Transcription failed",
      },
      { status: 502 },
    );
  }
}
