import { getRole } from "@/lib/roles";
import { MAX_QUESTIONS, MIN_QUESTIONS } from "@/lib/interview.config";
import { SentenceSplitter, splitSentences } from "@/lib/sentences";
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
 * Cut a turn after its first question. Mirrors what was actually sent to
 * the candidate, so the stored transcript matches what they heard.
 */
function trimAfterFirstQuestion(text: string): string {
  const out: string[] = [];
  for (const sentence of splitSentences(text.replaceAll(COMPLETE_MARKER, ""))) {
    out.push(sentence);
    if (/\?["'’”)\]]*$/.test(sentence.trim())) break;
  }
  return out.join(" ").trim();
}

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
    // Not awaited: the write is mirrored to memory synchronously and
    // queued in order, so the interviewer can start generating now
    // instead of after a database round-trip.
    void appendMessage(sessionId, userMsg);
    session.messages.push(userMsg);
  }

  const { seniority, messages } = session;
  const encoder = new TextEncoder();

  // How many questions have been asked, counting the one about to be
  // generated. The interview length is enforced here rather than left to
  // the model, which otherwise wraps up after three or four questions
  // when a candidate gives short answers.
  const questionNumber =
    messages.filter((m) => m.role === "assistant").length + 1;
  const isFinalTurn = questionNumber >= MAX_QUESTIONS;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: object) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
        );
      };

      let fullText = "";
      try {
        const splitter = new SentenceSplitter();
        let questionAsked = false;

        /** Forward a finished sentence, unless the turn is already done. */
        const emitSentence = (sentence: string): boolean => {
          const spoken = sentence.replaceAll(COMPLETE_MARKER, "").trim();
          if (spoken) send({ speak: spoken });
          // One question per turn: the model sometimes strings three
          // together, which would bury the candidate.
          if (!isFinalTurn && /\?["'’”)\]]*$/.test(spoken)) {
            questionAsked = true;
            return false;
          }
          return true;
        };

        for await (const chunk of streamInterviewerResponse(
          role,
          seniority,
          messages,
          isFinalTurn,
        )) {
          fullText += chunk;
          send({ chunk });

          let keepGoing = true;
          for (const sentence of splitter.push(chunk)) {
            if (!emitSentence(sentence)) {
              keepGoing = false;
              break;
            }
          }
          // Stop pulling tokens once the question has been asked — it
          // saves output tokens as well as the candidate's patience.
          if (!keepGoing) break;
        }

        if (!questionAsked) {
          const tail = splitter.flush();
          if (tail) emitSentence(tail);
        } else {
          // Drop anything the model had queued behind the question.
          fullText = trimAfterFirstQuestion(fullText);
        }

        // Honour the model's end-of-interview marker only once the
        // interview has actually covered its ground; force the end on
        // the final turn whether or not the marker was emitted.
        const markedComplete = fullText.includes(COMPLETE_MARKER);
        const isComplete =
          (markedComplete && questionNumber >= MIN_QUESTIONS) || isFinalTurn;

        // The marker is a control token, not speech — never store it.
        const content = fullText.replaceAll(COMPLETE_MARKER, "").trim();

        // Tell the client first — it has everything it needs to finish
        // speaking and reopen the mic — then persist.
        send({ done: true, fullText: content, isComplete });

        await appendMessage(sessionId, {
          role: "assistant",
          content,
          timestamp: Date.now(),
        });
        if (isComplete) {
          await markSessionComplete(sessionId);
        }
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
