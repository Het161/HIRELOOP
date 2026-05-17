import { getRole } from "@/lib/roles";
import { createSession, setTavusConversation } from "@/services/interview.service";
import { createTavusConversation } from "@/services/tavus.service";
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

  const role = getRole(body.roleId);
  if (!role) {
    return Response.json({ error: "Unknown roleId" }, { status: 400 });
  }
  if (!SENIORITIES.includes(body.seniority)) {
    return Response.json({ error: "Invalid seniority" }, { status: 400 });
  }
  if (!MODES.includes(body.mode)) {
    return Response.json({ error: "Invalid mode" }, { status: 400 });
  }

  let session: InterviewSession;
  try {
    session = await createSession(body.roleId, body.seniority, body.mode);
  } catch (err) {
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to start interview",
      },
      { status: 500 },
    );
  }

  let tavusUrl: string | null = null;

  // Video mode → create a Tavus conversation (best-effort: any failure
  // simply falls back to the standard voice/text interview flow).
  if (body.mode === "voice" && process.env.TAVUS_API_KEY) {
    const baseUrl = resolveBaseUrl(req);
    const isPublic =
      !!baseUrl && !/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(baseUrl);

    if (isPublic && baseUrl) {
      try {
        const conversation = await createTavusConversation({
          role,
          seniority: body.seniority,
          customLlmUrl: `${baseUrl}/api/tavus-llm/${session.id}`,
        });
        tavusUrl = conversation.conversationUrl;
        await setTavusConversation(
          session.id,
          conversation.conversationId,
          conversation.conversationUrl,
        );
      } catch (err) {
        console.error("Tavus conversation creation failed:", err);
      }
    } else {
      console.warn(
        "Tavus skipped — NEXT_PUBLIC_APP_URL is not a public URL. " +
          "Tavus must reach /api/tavus-llm; set NEXT_PUBLIC_APP_URL " +
          "(use ngrok for local dev). Falling back to the voice flow.",
      );
    }
  }

  return Response.json({ sessionId: session.id, tavusUrl });
}
