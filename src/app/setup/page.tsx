import type { Metadata } from "next";
import SetupFlow from "@/components/setup/SetupFlow";

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

  return (
    <div className="min-h-screen bg-bg">
      <SetupFlow initialRoleId={role} tavusAvailable={tavusAvailable} />
    </div>
  );
}
