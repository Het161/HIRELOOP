import { connectDB, isDbConfigured, ReportModel, SessionModel } from "@/lib/mongodb";
import { isDegraded, markDegraded, markHealthy, store } from "@/lib/memory-store";

/* ============================================================ *
 * Public activity stats for the landing page.
 *
 * These were hard-coded ("3,127 interviews this week · avg score
 * 71"). They are now counted from the interviews that actually
 * happened — including the ones run during a live demo, which is
 * the point: the ticker moves while you present.
 * ============================================================ */

export interface InterviewStats {
  /** Interviews started in the last 7 days. */
  interviewsThisWeek: number;
  /**
   * Interviews started in the last 7 days that ran to the end. Kept
   * separate because "completed" and "started" are different claims and
   * the page makes both.
   */
  completedThisWeek: number;
  /** Interviews started, ever. */
  totalInterviews: number;
  /** Mean overall score across graded reports, or null if none yet. */
  averageScore: number | null;
  /** How many reports the average is based on. */
  reportCount: number;
  /** Most-interviewed role id, or null when there is no data. */
  topRoleId: string | null;
  /** True when the numbers came from the in-process mirror. */
  fromMemory: boolean;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Count from the in-process mirror — used when the database is down. */
function statsFromMemory(): InterviewStats {
  const sessions = [...store.sessions.values()];
  const reports = [...store.reports.values()];
  const since = Date.now() - WEEK_MS;

  const roleCounts = new Map<string, number>();
  for (const session of sessions) {
    roleCounts.set(session.roleId, (roleCounts.get(session.roleId) ?? 0) + 1);
  }
  const topRoleId =
    [...roleCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const scored = reports.filter((r) => Number.isFinite(r.overallScore));

  const startedThisWeek = sessions.filter(
    (s) => new Date(s.startedAt).getTime() >= since,
  );

  return {
    interviewsThisWeek: startedThisWeek.length,
    completedThisWeek: startedThisWeek.filter((s) => s.isComplete).length,
    totalInterviews: sessions.length,
    averageScore:
      scored.length > 0
        ? Math.round(
            scored.reduce((sum, r) => sum + r.overallScore, 0) / scored.length,
          )
        : null,
    reportCount: scored.length,
    topRoleId,
    fromMemory: true,
  };
}

/**
 * Read the real activity numbers. Never throws: a database problem
 * falls back to this process's own mirror rather than taking the
 * landing page down — or, worse, inventing a number.
 */
export async function getInterviewStats(): Promise<InterviewStats> {
  if (!isDbConfigured() || isDegraded()) return statsFromMemory();

  try {
    await connectDB();
    const since = new Date(Date.now() - WEEK_MS);

    const [thisWeek, completedThisWeek, total, scoreAgg, topRoleAgg] =
      await Promise.all([
      SessionModel.countDocuments({ startedAt: { $gte: since } }),
      SessionModel.countDocuments({
        startedAt: { $gte: since },
        isComplete: true,
      }),
      SessionModel.countDocuments({}),
      ReportModel.aggregate<{ avg: number; count: number }>([
        { $match: { overallScore: { $gt: 0 } } },
        {
          $group: { _id: null, avg: { $avg: "$overallScore" }, count: { $sum: 1 } },
        },
      ]),
      SessionModel.aggregate<{ _id: string; count: number }>([
        { $match: { roleId: { $nin: [null, ""] } } },
        { $sortByCount: "$roleId" },
        { $limit: 1 },
      ]),
    ]);

    markHealthy();

    const scores = scoreAgg[0];
    return {
      interviewsThisWeek: thisWeek,
      completedThisWeek,
      totalInterviews: total,
      averageScore: scores?.count ? Math.round(scores.avg) : null,
      reportCount: scores?.count ?? 0,
      topRoleId: topRoleAgg[0]?._id ?? null,
      fromMemory: false,
    };
  } catch (err) {
    markDegraded(err);
    return statsFromMemory();
  }
}
