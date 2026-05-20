import type { Metadata } from "next";
import SetupFlow from "@/components/setup/SetupFlow";
import { connectDB, isDbConfigured } from "@/lib/mongodb";

export const metadata: Metadata = {
  title: "Setup",
  description:
    "Configure your mock interview — choose your role, seniority, and format.",
};

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const params = await searchParams;
  const role = typeof params.role === "string" ? params.role : undefined;
  const tavusAvailable = Boolean(process.env.TAVUS_API_KEY);

  // Warm the Mongo connection pool while the user is still picking options —
  // by the time they click Continue the cached promise has resolved and the
  // session insert is one round-trip instead of one round-trip + a TLS
  // handshake. Fire-and-forget; the connection cache is shared with the
  // /api/interview/start route.
  if (isDbConfigured()) {
    connectDB().catch(() => {
      /* surfaced by the start route on real failure */
    });
  }

  return (
    <div className="min-h-screen bg-bg">
      <SetupFlow initialRoleId={role} tavusAvailable={tavusAvailable} />
    </div>
  );
}
