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

    await endSession(sessionId);

    // Tear down the Tavus video conversation to free the room + quota.
    if (session.tavusConversationId) {
      await endTavusConversation(session.tavusConversationId);
    }

    const reportData = await generateReport(
      role,
      session.seniority,
      session.messages,
    );

    const report: InterviewReport = {
      ...reportData,
      sessionId,
      generatedAt: new Date(),
    };

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
