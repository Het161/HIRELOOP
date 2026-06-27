import { notFound } from "next/navigation";
import { getSession } from "@/services/interview.service";
import InterviewRoom from "@/components/interview/InterviewRoom";
import VideoInterviewRoom from "@/components/interview/VideoInterviewRoom";
import type { InterviewSession } from "@/types";

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let session: InterviewSession | null;
  try {
    session = await getSession(id);
  } catch {
    session = null;
  }
  if (!session) notFound();

  // Video mode with a live Tavus conversation → photorealistic interviewer.
  if (session.mode === "voice" && session.tavusConversationUrl) {
    return (
      <VideoInterviewRoom
        sessionId={session.id}
        roleId={session.roleId}
        seniority={session.seniority}
        tavusUrl={session.tavusConversationUrl}
        durationMinutes={session.durationMinutes}
      />
    );
  }

  // Text mode (or video mode where Tavus was unavailable) → standard room.
  return (
    <InterviewRoom
      sessionId={session.id}
      mode={session.mode}
      roleId={session.roleId}
      seniority={session.seniority}
      durationMinutes={session.durationMinutes}
    />
  );
}
