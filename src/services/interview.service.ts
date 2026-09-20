import { v4 as uuidv4 } from "uuid";
import {
  connectDB,
  isDbConfigured,
  ReportModel,
  SessionModel,
  type ReportDoc,
  type SessionDoc,
} from "@/lib/mongodb";
import {
  appendMemoryMessage,
  findMemoryReportBySession,
  getMemoryReport,
  getMemorySession,
  isDegraded,
  markDegraded,
  markHealthy,
  patchMemorySession,
  putReport,
  putSession,
} from "@/lib/memory-store";
import type {
  CodeLanguage,
  DsaDifficulty,
  InterviewMode,
  InterviewReport,
  InterviewSession,
  InterviewType,
  Message,
  Seniority,
} from "@/types";

/* ============================================================ *
 * Interview persistence — sessions + reports in MongoDB, mirrored
 * into an in-process store so a database outage cannot end a live
 * interview. See src/lib/memory-store.ts.
 * ============================================================ */

/**
 * Run a database operation, falling back to the in-memory mirror if the
 * database is unconfigured, already known to be down, or fails now.
 */
/**
 * Errors that mean "this document is wrong", not "the database is gone".
 * Flipping to memory mode over one bad field would take the whole app
 * offline for a data problem it could simply log.
 */
function isDataError(err: unknown): boolean {
  const name = (err as { name?: string })?.name ?? "";
  return (
    name === "ValidationError" ||
    name === "CastError" ||
    name === "StrictModeError" ||
    name === "DocumentNotFoundError"
  );
}

async function withDb<T>(
  operation: () => Promise<T>,
  fallback: () => T,
): Promise<T> {
  if (!isDbConfigured() || isDegraded()) return fallback();
  try {
    const result = await operation();
    markHealthy();
    return result;
  } catch (err) {
    if (isDataError(err)) {
      console.error(
        "[hireloop] database rejected a document (the connection is fine):",
        err instanceof Error ? err.message : err,
      );
      return fallback();
    }
    markDegraded(err);
    return fallback();
  }
}

/** Map a stored session document to the public InterviewSession shape. */
function toSession(doc: SessionDoc & { _id?: unknown }): InterviewSession {
  return {
    _id: doc._id ? String(doc._id) : undefined,
    id: doc.id,
    roleId: doc.roleId,
    seniority: doc.seniority,
    mode: doc.mode,
    interviewType: doc.interviewType ?? "role",
    dsaDifficulty: doc.dsaDifficulty,
    language: doc.language,
    durationMinutes: doc.durationMinutes ?? 30,
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

export interface CreateSessionInput {
  roleId: string;
  seniority: Seniority;
  mode: InterviewMode;
  durationMinutes: number;
  interviewType: InterviewType;
  dsaDifficulty?: DsaDifficulty;
  language?: CodeLanguage;
}

/** Create a fresh interview session with a public UUID. */
export async function createSession(
  input: CreateSessionInput,
): Promise<InterviewSession> {
  const session: InterviewSession = {
    id: uuidv4(),
    roleId: input.roleId,
    seniority: input.seniority,
    mode: input.mode,
    interviewType: input.interviewType,
    dsaDifficulty: input.dsaDifficulty,
    language: input.language,
    durationMinutes: input.durationMinutes,
    messages: [],
    startedAt: new Date(),
    endedAt: null,
    isComplete: false,
    questionCount: 0,
  };

  // Mirror first: the interview can run from memory even if the write
  // below never lands.
  putSession(session);

  return withDb(
    async () => {
      await connectDB();
      const doc = await SessionModel.create(session);
      const created = toSession(doc.toObject());
      putSession(created);
      return created;
    },
    () => session,
  );
}

/** Load a session by its public id. */
export async function getSession(
  sessionId: string,
): Promise<InterviewSession | null> {
  return withDb(
    async () => {
      await connectDB();
      const doc = await SessionModel.findOne({ id: sessionId }).lean<
        (SessionDoc & { _id: unknown }) | null
      >();
      if (!doc) return getMemorySession(sessionId);
      const session = toSession(doc);
      putSession(session);
      return session;
    },
    () => getMemorySession(sessionId),
  );
}

/**
 * Serialises the database writes for one session so a caller that does
 * not await a write cannot let a later one overtake it — the transcript
 * must stay in the order the interview happened.
 */
const writeQueue = new Map<string, Promise<void>>();

function enqueueWrite(
  sessionId: string,
  operation: () => Promise<void>,
): Promise<void> {
  const previous = writeQueue.get(sessionId) ?? Promise.resolve();
  const next = previous.then(operation, operation);
  writeQueue.set(
    sessionId,
    next.catch(() => undefined),
  );
  return next;
}

/**
 * Append a single message to a session's transcript. The in-memory
 * mirror is updated synchronously, so callers that do not await this
 * still read a correct transcript on the next turn.
 */
export function appendMessage(
  sessionId: string,
  message: Message,
): Promise<void> {
  appendMemoryMessage(sessionId, message);
  return enqueueWrite(sessionId, () =>
    withDb(
      async () => {
        await connectDB();
        await SessionModel.updateOne(
          { id: sessionId },
          { $push: { messages: message } },
        );
      },
      () => undefined,
    ),
  );
}

/** Mark a session complete (the interviewer signalled the end). */
export async function markSessionComplete(sessionId: string): Promise<void> {
  patchMemorySession(sessionId, { isComplete: true });
  await withDb(
    async () => {
      await connectDB();
      await SessionModel.updateOne(
        { id: sessionId },
        { $set: { isComplete: true } },
      );
    },
    () => undefined,
  );
}

/** Attach a Tavus video conversation to a session. */
export async function setTavusConversation(
  sessionId: string,
  conversationId: string,
  conversationUrl: string,
): Promise<void> {
  patchMemorySession(sessionId, {
    tavusConversationId: conversationId,
    tavusConversationUrl: conversationUrl,
  });
  await withDb(
    async () => {
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
    },
    () => undefined,
  );
}

/** Close a session — records the end time and final question count. */
export async function endSession(sessionId: string): Promise<void> {
  const session = await getSession(sessionId);
  const questionCount = session
    ? session.messages.filter((m) => m.role === "assistant").length
    : 0;

  patchMemorySession(sessionId, {
    isComplete: true,
    endedAt: new Date(),
    questionCount,
  });
  await withDb(
    async () => {
      await connectDB();
      await SessionModel.updateOne(
        { id: sessionId },
        { $set: { isComplete: true, endedAt: new Date(), questionCount } },
      );
    },
    () => undefined,
  );
}

/** Persist a finished report. Returns the new report's id. */
export async function saveReport(report: InterviewReport): Promise<string> {
  return withDb(
    async () => {
      await connectDB();
      const doc = await ReportModel.create(report);
      const id = String(doc._id);
      putReport(id, report);
      return id;
    },
    () => {
      // A memory-only id still routes to /report/<id> for this process,
      // so the debrief renders even with the database down.
      const id = uuidv4().replace(/-/g, "").slice(0, 24);
      putReport(id, report);
      return id;
    },
  );
}

/** Load a report by its id. Returns null for missing or malformed ids. */
export async function getReport(
  reportId: string,
): Promise<InterviewReport | null> {
  const fromMemory = getMemoryReport(reportId);
  if (fromMemory) return fromMemory;

  return withDb(
    async () => {
      await connectDB();
      try {
        const doc = await ReportModel.findById(reportId).lean<
          (ReportDoc & { _id: unknown }) | null
        >();
        return doc ? toReport(doc) : null;
      } catch {
        return null; // malformed ObjectId — not a database failure
      }
    },
    () => null,
  );
}

/** Find an existing report for a session, if one was already generated. */
export async function getReportBySessionId(
  sessionId: string,
): Promise<InterviewReport | null> {
  return withDb(
    async () => {
      await connectDB();
      const doc = await ReportModel.findOne({ sessionId }).lean<
        (ReportDoc & { _id: unknown }) | null
      >();
      return doc ? toReport(doc) : findMemoryReportBySession(sessionId);
    },
    () => findMemoryReportBySession(sessionId),
  );
}
