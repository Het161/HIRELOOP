/* ============================================================ *
 * Server boot warm-up.
 *
 * Every external dependency charges a one-time connection cost:
 * MongoDB Atlas ~2.7s, Cartesia TLS ~700ms, Groq ~300ms. Paying them
 * here means the first candidate of the session gets the same latency
 * as the tenth — which matters when the first candidate is a live demo.
 * ============================================================ */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const started = Date.now();
  const timings: string[] = [];

  const time = async (label: string, work: () => Promise<unknown>) => {
    const t0 = Date.now();
    try {
      await work();
      timings.push(`${label}=${Date.now() - t0}ms`);
    } catch (err) {
      timings.push(
        `${label}=FAILED (${err instanceof Error ? err.message : "error"})`,
      );
    }
  };

  await Promise.all([
    // Opens the Atlas connection pool. A failure here flips the app into
    // memory mode up front, so the first candidate does not pay the
    // connection timeout to discover the database is unreachable.
    time("mongo", async () => {
      const { connectDB, isDbConfigured } = await import("@/lib/mongodb");
      const { markDegraded, markHealthy } = await import("@/lib/memory-store");
      if (!isDbConfigured()) {
        markDegraded(new Error("MONGODB_URI not set"));
        throw new Error("MONGODB_URI not set");
      }
      try {
        await connectDB();
        markHealthy();
      } catch (err) {
        markDegraded(err);
        throw err;
      }
    }),

    // Opens the TLS session to Cartesia.
    time("cartesia", async () => {
      const apiKey = process.env.CARTESIA_API_KEY;
      if (!apiKey) throw new Error("CARTESIA_API_KEY not set");
      const res = await fetch("https://api.cartesia.ai/voices?limit=1", {
        headers: { "Cartesia-Version": "2024-11-13", "X-API-Key": apiKey },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.arrayBuffer();
    }),

    // Opens the TLS session to Groq and confirms the model is live —
    // a retired model id is the failure that silently breaks every
    // question and every report.
    time("groq", async () => {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) throw new Error("GROQ_API_KEY not set");
      const { GROQ_MODEL } = await import("@/services/ai.service");
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { data?: Array<{ id: string }> };
      const live = (data.data ?? []).some((m) => m.id === GROQ_MODEL);
      if (!live) {
        console.warn(
          `[hireloop] WARNING: GROQ_MODEL "${GROQ_MODEL}" is not available on this API key. ` +
            "Interview turns will fall back to a secondary model. " +
            "Run `curl -H \"Authorization: Bearer $GROQ_API_KEY\" https://api.groq.com/openai/v1/models` to see what is live.",
        );
      }
    }),
  ]);

  console.log(
    `[hireloop] warm-up complete in ${Date.now() - started}ms — ${timings.join(" ")}`,
  );
}
