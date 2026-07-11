import { CARTESIA_MODEL } from "@/lib/voices";

export const runtime = "nodejs"; // needs Node for streaming
export const dynamic = "force-dynamic";

const CARTESIA_TTS_URL = "https://api.cartesia.ai/tts/bytes";
const CARTESIA_VERSION = "2024-06-10";

interface TTSRequestBody {
  text?: string;
  voiceId?: string;
  speed?: "slow" | "normal" | "fast";
  emotion?: string[];
}

/**
 * POST /api/tts — proxy a Cartesia Sonic text-to-speech request and
 * stream the MP3 audio bytes back to the client.
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
  const speed = body.speed ?? "normal";
  const emotion = Array.isArray(body.emotion) ? body.emotion : [];

  if (!text || !voiceId) {
    return Response.json(
      { error: "text and voiceId are required" },
      { status: 400 },
    );
  }

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
        transcript: text,
        voice: {
          mode: "id",
          id: voiceId,
          __experimental_controls: { speed, emotion },
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

  // Stream the MP3 bytes straight through to the client.
  return new Response(cartesiaRes.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}

/** Connection warm-up — the client pings this on interview mount. */
export function OPTIONS(): Response {
  return new Response(null, { status: 204 });
}
