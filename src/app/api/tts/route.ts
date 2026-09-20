import { CARTESIA_MODEL, VOICE_PARAMS } from "@/lib/voices";

export const runtime = "nodejs"; // needs Node for streaming
export const dynamic = "force-dynamic";

const CARTESIA_TTS_URL = "https://api.cartesia.ai/tts/bytes";
const CARTESIA_VERSION = "2024-11-13";

/** Cap per request — the client sends one sentence at a time. */
const MAX_TEXT_CHARS = 1200;

interface TTSRequestBody {
  text?: string;
  voiceId?: string;
  speed?: "slow" | "normal" | "fast";
  emotion?: string[];
}

interface SynthesisInput {
  text: string;
  voiceId: string;
  speed: "slow" | "normal" | "fast";
  emotion: string[];
}

/**
 * Call Cartesia and return the streaming response. The MP3 bytes start
 * arriving in ~130ms on a warm connection, well before the full clip is
 * generated, so callers should pipe rather than buffer.
 */
async function synthesize(input: SynthesisInput): Promise<Response> {
  const apiKey = process.env.CARTESIA_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "CARTESIA_API_KEY is not configured" },
      { status: 500 },
    );
  }

  let cartesiaRes: Response;
  try {
    cartesiaRes = await fetch(CARTESIA_TTS_URL, {
      method: "POST",
      headers: {
        "Cartesia-Version": CARTESIA_VERSION,
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_id: CARTESIA_MODEL,
        transcript: input.text,
        voice: {
          mode: "id",
          id: input.voiceId,
          __experimental_controls: {
            speed: input.speed,
            emotion: input.emotion,
          },
        },
        // Clear, full-quality speech. Latency is handled on the client by
        // streaming these bytes into playback as they arrive (MediaSource),
        // so we no longer need to trade audio quality for a faster start.
        output_format: {
          container: "mp3",
          bit_rate: 128000,
          sample_rate: 44100,
        },
        language: "en",
      }),
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Cartesia request failed" },
      { status: 502 },
    );
  }

  if (!cartesiaRes.ok || !cartesiaRes.body) {
    const detail = await cartesiaRes.text().catch(() => "");
    return Response.json(
      { error: `Cartesia error (${cartesiaRes.status}): ${detail}` },
      { status: 502 },
    );
  }

  // Stream the MP3 bytes straight through to the client — the <audio>
  // element starts playing while Cartesia is still generating.
  return new Response(cartesiaRes.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}

/**
 * GET /api/tts?text=…&voiceId=… — streaming synthesis for `<audio src>`.
 * A GET is what lets the browser play the clip progressively as bytes
 * arrive; the POST form below buffers and is kept for callers that want
 * the whole blob.
 */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // `?warm=1` opens the TLS connection to Cartesia ahead of the first
  // real sentence, which otherwise pays ~700ms of handshake on stage.
  if (url.searchParams.get("warm") === "1") {
    const res = await synthesize({
      text: "Ready.",
      voiceId: url.searchParams.get("voiceId") ?? "",
      speed: VOICE_PARAMS.speed,
      emotion: VOICE_PARAMS.emotion,
    });
    await res.body?.cancel().catch(() => {});
    return Response.json({ warm: res.ok });
  }

  const text = (url.searchParams.get("text") ?? "").trim();
  const voiceId = url.searchParams.get("voiceId") ?? "";
  const speedParam = url.searchParams.get("speed");
  const speed =
    speedParam === "slow" || speedParam === "fast" ? speedParam : "normal";

  if (!text || !voiceId) {
    return Response.json(
      { error: "text and voiceId are required" },
      { status: 400 },
    );
  }

  return synthesize({
    text: text.slice(0, MAX_TEXT_CHARS),
    voiceId,
    speed,
    emotion: url.searchParams.getAll("emotion"),
  });
}

/**
 * POST /api/tts — same synthesis, for callers that post a JSON body.
 */
export async function POST(req: Request): Promise<Response> {
  let body: TTSRequestBody;
  try {
    body = (await req.json()) as TTSRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const voiceId = typeof body.voiceId === "string" ? body.voiceId : "";

  if (!text || !voiceId) {
    return Response.json(
      { error: "text and voiceId are required" },
      { status: 400 },
    );
  }

  return synthesize({
    text: text.slice(0, MAX_TEXT_CHARS),
    voiceId,
    speed: body.speed ?? "normal",
    emotion: Array.isArray(body.emotion) ? body.emotion : [],
  });
}

/** Connection warm-up — the client pings this on interview mount. */
export function OPTIONS(): Response {
  return new Response(null, { status: 204 });
}
