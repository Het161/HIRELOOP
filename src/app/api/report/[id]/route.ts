import { getReport } from "@/services/interview.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/report/[id] — return a full interview report as JSON. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  try {
    const report = await getReport(id);
    if (!report) {
      return Response.json({ error: "Report not found" }, { status: 404 });
    }
    return Response.json(report);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Database error" },
      { status: 500 },
    );
  }
}
