import { v4 as uuidv4 } from "uuid";
import {
  connectDB,
  ReportModel,
  SessionModel,
  type ReportDoc,
  type SessionDoc,
} from "@/lib/mongodb";
import type {
  InterviewMode,
  InterviewReport,
  InterviewSession,
  Message,
  Seniority,
} from "@/types";

/* ============================================================ *
 * Interview persistence — sessions + reports in MongoDB.
 * ============================================================ */

/** Map a stored session document to the public InterviewSession shape. */
function toSession(doc: SessionDoc & { _id?: unknown }): InterviewSession {
  return {
    _id: doc._id ? String(doc._id) : undefined,
    id: doc.id,
    roleId: doc.roleId,
    seniority: doc.seniority,
    mode: doc.mode,
    messages: (doc.messages ?? []).map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
      questionIndex: m.questionIndex,
    })),
    startedAt: new Date(doc.startedAt),
    endedAt: doc.endedAt ? new Date(doc.endedAt) : null,
    isComplete: doc.isComplete,
    questionCount: doc.questionCount,
    tavusConversationId: doc.tavusConversationId,
    tavusConversationUrl: doc.tavusConversationUrl,
  };
}

/** Map a stored report document to the public InterviewReport shape. */
function toReport(doc: ReportDoc & { _id?: unknown }): InterviewReport {
  return {
    _id: doc._id ? String(doc._id) : undefined,
    sessionId: doc.sessionId,
    roleId: doc.roleId,
    seniority: doc.seniority,
    overallScore: doc.overallScore,
    scores: {
      technicalDepth: doc.scores.technicalDepth,
      communicationClarity: doc.scores.communicationClarity,
      problemSolving: doc.scores.problemSolving,
    },
    verdict: doc.verdict,
    headline: doc.headline,
    questionBreakdown: (doc.questionBreakdown ?? []).map((q) => ({ ...q })),
    strengths: [...(doc.strengths ?? [])],
    improvements: [...(doc.improvements ?? [])],
    recommendedResources: (doc.recommendedResources ?? []).map((r) => ({
      ...r,
    })),
    durationMinutes: doc.durationMinutes,
    generatedAt: new Date(doc.generatedAt),
  };
}

/** Create a fresh interview session with a public UUID. */
export async function createSession(
  roleId: string,
  seniority: Seniority,
  mode: InterviewMode,
): Promise<InterviewSession> {
  await connectDB();
  const doc = await SessionModel.create({
    id: uuidv4(),
    roleId,
    seniority,
    mode,
    messages: [],
    startedAt: new Date(),
    endedAt: null,
    isComplete: false,
    questionCount: 0,
  });
  return toSession(doc.toObject());
}

/** Load a session by its public id. */
export async function getSession(
  sessionId: string,
): Promise<InterviewSession | null> {
  await connectDB();
  const doc = await SessionModel.findOne({ id: sessionId }).lean<
    (SessionDoc & { _id: unknown }) | null
  >();
  return doc ? toSession(doc) : null;
}

/** Append a single message to a session's transcript. */
export async function appendMessage(
  sessionId: string,
  message: Message,
): Promise<void> {
  await connectDB();
  await SessionModel.updateOne(
    { id: sessionId },
    { $push: { messages: message } },
  );
}

/** Mark a session complete (the interviewer signalled the end). */
export async function markSessionComplete(sessionId: string): Promise<void> {
  await connectDB();
  await SessionModel.updateOne({ id: sessionId }, { $set: { isComplete: true } });
}

/** Attach a Tavus video conversation to a session. */
export async function setTavusConversation(
  sessionId: string,
  conversationId: string,
  conversationUrl: string,
): Promise<void> {
  await connectDB();
  await SessionModel.updateOne(
    { id: sessionId },
    {
      $set: {
        tavusConversationId: conversationId,
        tavusConversationUrl: conversationUrl,
      },
    },
  );
}

/** Close a session — records the end time and final question count. */
export async function endSession(sessionId: string): Promise<void> {
  await connectDB();
  const session = await getSession(sessionId);
  const questionCount = session
    ? session.messages.filter((m) => m.role === "assistant").length
    : 0;
  await SessionModel.updateOne(
    { id: sessionId },
    { $set: { isComplete: true, endedAt: new Date(), questionCount } },
  );
}

/** Persist a finished report. Returns the new report's id. */
export async function saveReport(report: InterviewReport): Promise<string> {
  await connectDB();
  const doc = await ReportModel.create(report);
  return String(doc._id);
}

/** Load a report by its id. Returns null for missing or malformed ids. */
export async function getReport(
  reportId: string,
): Promise<InterviewReport | null> {
  await connectDB();
  try {
    const doc = await ReportModel.findById(reportId).lean<
      (ReportDoc & { _id: unknown }) | null
    >();
    return doc ? toReport(doc) : null;
  } catch {
    return null;
  }
}

/** Find an existing report for a session, if one was already generated. */
export async function getReportBySessionId(
  sessionId: string,
): Promise<InterviewReport | null> {
  await connectDB();
  const doc = await ReportModel.findOne({ sessionId }).lean<
    (ReportDoc & { _id: unknown }) | null
  >();
  return doc ? toReport(doc) : null;
}
