import { getRole } from "@/lib/roles";
import { generateReport } from "@/services/ai.service";
import {
  endSession,
  getReportBySessionId,
  getSession,
  saveReport,
} from "@/services/interview.service";
import { endTavusConversation } from "@/services/tavus.service";
import type { EndInterviewRequest, InterviewReport } from "@/types";

export const runtime = "nodejs"; // groq-sdk needs Node, not edge
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/interview/end — close the session, grade the transcript with
 * Groq, persist the report, and return its id.
 */
export async function POST(req: Request): Promise<Response> {
  let body: EndInterviewRequest;
  try {
    body = (await req.json()) as EndInterviewRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  if (!sessionId) {
    return Response.json({ error: "sessionId is required" }, { status: 400 });
  }

  try {
    // Double-submit guard — if a report already exists, return it.
    const existing = await getReportBySessionId(sessionId);
    if (existing?._id) {
      return Response.json({ reportId: existing._id });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    const role = getRole(session.roleId);
    if (!role) {
      return Response.json({ error: "Unknown role" }, { status: 500 });
    }

    // Tear down the Tavus video conversation to free the room + quota.
    // Fire-and-forget: the candidate should never wait on it, and a
    // Tavus outage must not block the debrief.
    if (session.tavusConversationId) {
      void endTavusConversation(session.tavusConversationId).catch((err) => {
        console.error("Tavus teardown failed:", err);
      });
    }

    // Close the session and grade in parallel — the write does not gate
    // the ~5s grading call.
    const closing = endSession(sessionId);

    const reportData = await generateReport(
      role,
      session.seniority,
      session.messages,
      {
        interviewType: session.interviewType,
        dsaDifficulty: session.dsaDifficulty,
        language: session.language,
      },
    );

    const report: InterviewReport = {
      ...reportData,
      sessionId,
      generatedAt: new Date(),
    };

    await closing;
    const reportId = await saveReport(report);
    return Response.json({ reportId });
  } catch (err) {
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to generate report",
      },
      { status: 500 },
    );
  }
}
