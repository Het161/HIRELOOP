import { getRole } from "@/lib/roles";
import { hashSeed } from "@/lib/utils";
import { streamInterviewerResponse } from "@/services/ai.service";
import {
  appendMessage,
  getSession,
  markSessionComplete,
} from "@/services/interview.service";
import type { InterviewSession, Message, SendMessageRequest } from "@/types";

export const runtime = "nodejs"; // groq-sdk needs Node, not edge
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const COMPLETE_MARKER = "[INTERVIEW_COMPLETE]";

/**
 * POST /api/interview/message — stream the interviewer's next turn as
 * Server-Sent Events. Send an empty `userMessage` to get the first question.
 */
export async function POST(req: Request): Promise<Response> {
  let body: SendMessageRequest;
  try {
    body = (await req.json()) as SendMessageRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  const userMessage =
    typeof body.userMessage === "string" ? body.userMessage : "";
  if (!sessionId) {
    return Response.json({ error: "sessionId is required" }, { status: 400 });
  }

  let session: InterviewSession | null;
  try {
    session = await getSession(sessionId);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Database error" },
      { status: 500 },
    );
  }
  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  const role = getRole(session.roleId);
  if (!role) {
    return Response.json({ error: "Unknown role" }, { status: 500 });
  }

  const trimmed = userMessage.trim();
  const now = Date.now();
  const last = session.messages[session.messages.length - 1];

  // Persist the candidate's answer — idempotent if a failed turn is retried.
  if (
    trimmed.length > 0 &&
    !(last && last.role === "user" && last.content === trimmed)
  ) {
    const askedSoFar = session.messages.filter(
      (m) => m.role === "assistant",
    ).length;
    const userMsg: Message = {
      role: "user",
      content: trimmed,
      timestamp: now,
      questionIndex: Math.max(0, askedSoFar - 1),
    };
    await appendMessage(sessionId, userMsg);
    session.messages.push(userMsg);
  }

  const { seniority, messages } = session;
  // Stable per-session seed → this interview's question plan stays consistent
  // across retries but differs from every other session for the same role.
  const seed = hashSeed(sessionId);
  const durationMinutes = session.durationMinutes;
  const streamOptions = {
    seed,
    durationMinutes,
    interviewType: session.interviewType,
    dsaDifficulty: session.dsaDifficulty,
    language: session.language,
  };
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: object) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
        );
      };

      let fullText = "";
      try {
        for await (const chunk of streamInterviewerResponse(
          role,
          seniority,
          messages,
          streamOptions,
        )) {
          fullText += chunk;
          send({ chunk });
        }

        const isComplete = fullText.includes(COMPLETE_MARKER);

        await appendMessage(sessionId, {
          role: "assistant",
          content: fullText,
          timestamp: Date.now(),
        });
        if (isComplete) {
          await markSessionComplete(sessionId);
        }

        send({ done: true, fullText, isComplete });
      } catch (err) {
        send({
          error:
            err instanceof Error ? err.message : "Interview stream failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
