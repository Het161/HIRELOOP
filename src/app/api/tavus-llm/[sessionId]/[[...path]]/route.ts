import { GROQ_MODEL, streamInterviewerResponse } from "@/services/ai.service";
import { appendMessage, getSession } from "@/services/interview.service";
import { getRole } from "@/lib/roles";
import type { Message } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* ============================================================ *
 * OpenAI-compatible endpoint that Tavus calls for each interview
 * turn. The conversation's persona points its custom LLM at
 *   {APP_URL}/api/tavus-llm/{sessionId}
 * — and OpenAI clients append `/chat/completions`, so this is an
 * optional catch-all that answers either path.
 *
 * Latency note: the Groq stream is the only thing on the
 * candidate-perceived critical path — the transcript is persisted
 * AFTER the response has been streamed back to Tavus.
 * ============================================================ */

interface TavusLlmBody {
  messages?: Array<{ role?: unknown; content?: unknown }>;
}

interface OpenAIChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: { content?: string };
    finish_reason: "stop" | null;
  }>;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<Response> {
  const { sessionId } = await params;

  let body: TavusLlmBody;
  try {
    body = (await req.json()) as TavusLlmBody;
  } catch {
    body = {};
  }

  const session = await getSession(sessionId);
  if (!session) return new Response("Session not found", { status: 404 });
  const role = getRole(session.roleId);
  if (!role) return new Response("Role not found", { status: 404 });
  const seniority = session.seniority;

  // Tavus sends the running conversation in OpenAI format — keep the
  // user/assistant turns, drop system messages (we inject our own).
  const incoming = (body.messages ?? []).filter(
    (m): m is { role: string; content: string } =>
      typeof m?.role === "string" &&
      typeof m?.content === "string" &&
      m.role !== "system",
  );

  const latestUser = [...incoming].reverse().find((m) => m.role === "user");
  const userText = latestUser ? latestUser.content.trim() : "";

  const history: Message[] = incoming.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
    timestamp: Date.now(),
  }));

  const encoder = new TextEncoder();
  const responseId = `chatcmpl-${Date.now()}`;
  const created = Math.floor(Date.now() / 1000);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (delta: string, finish: "stop" | null) => {
        const chunk: OpenAIChunk = {
          id: responseId,
          object: "chat.completion.chunk",
          created,
          model: GROQ_MODEL,
          choices: [
            {
              index: 0,
              delta: finish ? {} : { content: delta },
              finish_reason: finish,
            },
          ],
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      };

      let assistantText = "";
      try {
        for await (const piece of streamInterviewerResponse(
          role,
          seniority,
          history,
          { keyMarker: false },
        )) {
          assistantText += piece;
          emit(piece, null);
        }
      } catch {
        // Emit a graceful spoken line so the avatar never hangs silently.
        if (assistantText.trim().length === 0) {
          emit(
            "Sorry, I lost my train of thought — could you repeat that?",
            null,
          );
        }
      }

      // Close the response to Tavus FIRST — this ends the latency the
      // candidate feels.
      emit("", "stop");
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();

      // Persist the transcript afterwards — off the critical path.
      try {
        if (userText.length > 0) {
          await appendMessage(sessionId, {
            role: "user",
            content: userText,
            timestamp: Date.now(),
          });
        }
        if (assistantText.trim().length > 0) {
          await appendMessage(sessionId, {
            role: "assistant",
            content: assistantText,
            timestamp: Date.now(),
          });
        }
      } catch {
        /* transcript persistence is best-effort */
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

/** Health check — Tavus probes the endpoint before the conversation. */
export function GET(): Response {
  return new Response("OK", { status: 200 });
}
