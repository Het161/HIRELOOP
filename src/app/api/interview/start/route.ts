import { getRole } from "@/lib/roles";
import { getDifficulty, getLanguage, DSA_ROLE } from "@/lib/dsa";
import { createSession, setTavusConversation } from "@/services/interview.service";
import { createTavusConversation } from "@/services/tavus.service";
import type {
  CreateSessionInput,
} from "@/services/interview.service";
import type {
  InterviewMode,
  InterviewSession,
  Seniority,
  StartInterviewRequest,
} from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SENIORITIES: Seniority[] = ["junior", "mid", "senior"];
const MODES: InterviewMode[] = ["voice", "text"];

/** Resolve the public base URL Tavus must call back to. */
function resolveBaseUrl(req: Request): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const origin = req.headers.get("origin");
  if (origin) return origin.replace(/\/$/, "");
  const host = req.headers.get("host");
  return host ? `https://${host}` : null;
}

/**
 * POST /api/interview/start — create a session, and for video mode
 * spin up a Tavus conversation wired to our Groq custom-LLM endpoint.
 */
export async function POST(req: Request): Promise<Response> {
  let body: StartInterviewRequest;
  try {
    body = (await req.json()) as StartInterviewRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const interviewType = body.interviewType === "dsa" ? "dsa" : "role";

  // Clamp the requested length to a sane 1–60 minute window; default 15.
  const durationMinutes = Math.round(body.durationMinutes);
  const duration =
    Number.isFinite(durationMinutes) && durationMinutes > 0
      ? Math.min(60, Math.max(1, durationMinutes))
      : 15;

  // Assemble + validate the session input, branching on interview type.
  let input: CreateSessionInput;

  if (interviewType === "dsa") {
    if (!body.dsaDifficulty || !getDifficulty(body.dsaDifficulty)) {
      return Response.json({ error: "Invalid dsaDifficulty" }, { status: 400 });
    }
    if (!body.language || !getLanguage(body.language)) {
      return Response.json({ error: "Invalid language" }, { status: 400 });
    }
    input = {
      // The virtual DSA role keeps the report/session plumbing happy.
      roleId: DSA_ROLE.id,
      seniority: "mid",
      mode: "text",
      durationMinutes: duration,
      interviewType: "dsa",
      dsaDifficulty: body.dsaDifficulty,
      language: body.language,
    };
  } else {
    const role = getRole(body.roleId);
    if (!role || role.id === DSA_ROLE.id) {
      return Response.json({ error: "Unknown roleId" }, { status: 400 });
    }
    if (!SENIORITIES.includes(body.seniority)) {
      return Response.json({ error: "Invalid seniority" }, { status: 400 });
    }
    if (!MODES.includes(body.mode)) {
      return Response.json({ error: "Invalid mode" }, { status: 400 });
    }
    input = {
      roleId: body.roleId,
      seniority: body.seniority,
      mode: body.mode,
      durationMinutes: duration,
      interviewType: "role",
    };
  }

  let session: InterviewSession;
  try {
    session = await createSession(input);
  } catch (err) {
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to start interview",
      },
      { status: 500 },
    );
  }

  // Tavus is opt-in. The 3D-model panel has been replaced with a reactive
  // ASCII waveform driven by Cartesia TTS, so the per-interview persona +
  // conversation calls (~30s combined) are skipped by default and the
  // voice flow starts instantly. Set ENABLE_TAVUS_VIDEO=true to re-enable
  // the photorealistic interviewer.
  const tavusRole = getRole(session.roleId);
  if (
    interviewType === "role" &&
    session.mode === "voice" &&
    tavusRole &&
    process.env.ENABLE_TAVUS_VIDEO === "true" &&
    process.env.TAVUS_API_KEY
  ) {
    const baseUrl = resolveBaseUrl(req);
    const isPublic =
      !!baseUrl && !/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(baseUrl);

    if (isPublic && baseUrl) {
      // Fire-and-forget — don't block interview start on the Tavus round-trip.
      // When the conversation is ready the session row gets the URL, and the
      // interview page picks it up on a later visit. The current visit lands
      // in the standard voice flow.
      createTavusConversation({
        role: tavusRole,
        seniority: session.seniority,
        customLlmUrl: `${baseUrl}/api/tavus-llm/${session.id}`,
      })
        .then((conversation) =>
          setTavusConversation(
            session.id,
            conversation.conversationId,
            conversation.conversationUrl,
          ),
        )
        .catch((err) => {
          console.error("Tavus conversation creation failed:", err);
        });
    } else {
      console.warn(
        "Tavus skipped — NEXT_PUBLIC_APP_URL is not a public URL. " +
          "Tavus must reach /api/tavus-llm; set NEXT_PUBLIC_APP_URL " +
          "(use ngrok for local dev). Falling back to the voice flow.",
      );
    }
  }

  return Response.json({ sessionId: session.id, tavusUrl: null });
}
