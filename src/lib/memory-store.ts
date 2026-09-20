import type { InterviewReport, InterviewSession } from "@/types";

/* ============================================================ *
 * In-memory mirror of the interview store.
 *
 * MongoDB stays the durable store, but a live interview must not die
 * because Atlas is unreachable — venue Wi-Fi, an IP allowlist, or a
 * dropped connection would otherwise end the session mid-question.
 * Every write is mirrored here, and reads fall back here when the
 * database call fails.
 *
 * Contents are per-process and vanish on restart; that is the point.
 * ============================================================ */

interface MemoryStore {
  sessions: Map<string, InterviewSession>;
  reports: Map<string, InterviewReport>;
  /** Set once the database has failed, to stop retrying on every call. */
  degradedSince: number | null;
  /** Consecutive failures — each one probes the database less often. */
  failures: number;
}

declare global {
  var _hireloopMemoryStore: MemoryStore | undefined;
}

/** Survives Next's dev-mode module reloads. */
export const store: MemoryStore = (globalThis._hireloopMemoryStore ??= {
  sessions: new Map(),
  reports: new Map(),
  degradedSince: null,
  failures: 0,
});

/** First retry delay; doubles per failure up to the cap below. */
const BASE_RETRY_MS = 30_000;
/**
 * Cap on the retry interval. Every probe of a dead database costs a
 * request up to the 3s connection timeout, so probes get rarer the
 * longer the outage lasts — a live interview should not stall
 * repeatedly for a database it is no longer using.
 */
const MAX_RETRY_MS = 5 * 60_000;

function retryDelay(): number {
  return Math.min(BASE_RETRY_MS * 2 ** (store.failures - 1), MAX_RETRY_MS);
}

/** True while the database is considered unavailable. */
export function isDegraded(): boolean {
  if (store.degradedSince === null) return false;
  if (Date.now() - store.degradedSince > retryDelay()) {
    store.degradedSince = null; // probe the database again
    return false;
  }
  return true;
}

/** Record that a database call failed. */
export function markDegraded(err: unknown): void {
  store.failures += 1;
  if (store.failures === 1) {
    console.error(
      "[hireloop] database unavailable — serving sessions from memory. " +
        "Interviews and reports still work; they just are not persisted.",
      err instanceof Error ? err.message : err,
    );
  }
  store.degradedSince = Date.now();
}

/** Clear the degraded flag after a successful database call. */
export function markHealthy(): void {
  store.degradedSince = null;
  store.failures = 0;
}

/* ---- Session mirror -------------------------------------------- */

export function putSession(session: InterviewSession): void {
  store.sessions.set(session.id, session);
}

export function getMemorySession(id: string): InterviewSession | null {
  return store.sessions.get(id) ?? null;
}

export function appendMemoryMessage(
  id: string,
  message: InterviewSession["messages"][number],
): void {
  const session = store.sessions.get(id);
  if (session) session.messages.push(message);
}

export function patchMemorySession(
  id: string,
  patch: Partial<InterviewSession>,
): void {
  const session = store.sessions.get(id);
  if (session) store.sessions.set(id, { ...session, ...patch });
}

/* ---- Report mirror --------------------------------------------- */

export function putReport(id: string, report: InterviewReport): void {
  store.reports.set(id, { ...report, _id: id });
}

export function getMemoryReport(id: string): InterviewReport | null {
  return store.reports.get(id) ?? null;
}

export function findMemoryReportBySession(
  sessionId: string,
): InterviewReport | null {
  for (const report of store.reports.values()) {
    if (report.sessionId === sessionId) return report;
  }
  return null;
}
