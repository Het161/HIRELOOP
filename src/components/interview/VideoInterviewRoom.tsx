"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Prompt from "@/components/shared/Prompt";
import AsciiButton from "@/components/shared/AsciiButton";
import StatusBar from "@/components/shared/StatusBar";
import TerminalWindow from "@/components/shared/TerminalWindow";
import { getRole } from "@/lib/roles";
import type { Seniority } from "@/types";
import type { TranscriptLine } from "./TavusVideoPanel";
import Timer from "./Timer";
import EndInterviewDialog from "./EndInterviewDialog";

interface VideoInterviewRoomProps {
  sessionId: string;
  roleId: string;
  seniority: Seniority;
  tavusUrl: string;
}

/** Normalize a caption for comparing growing partial transcripts. */
function normalizeCaption(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ConnectingBox() {
  return (
    <div className="flex aspect-[4/5] w-full flex-col items-center justify-center border border-border bg-surface font-mono">
      <div className="mb-2 text-accent2">❯ booting voice link…</div>
      <div className="text-[12px] text-muted">loading webrtc client</div>
    </div>
  );
}

// @daily-co/daily-js is browser-only — load the panel with ssr disabled.
const TavusVideoPanel = dynamic(
  () => import("./TavusVideoPanel").then((m) => m.TavusVideoPanel),
  { ssr: false, loading: () => <ConnectingBox /> },
);

export default function VideoInterviewRoom({
  sessionId,
  roleId,
  seniority,
  tavusUrl,
}: VideoInterviewRoomProps) {
  const router = useRouter();
  const role = getRole(roleId);

  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [phase, setPhase] = useState<"live" | "ending">("live");
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);
  const [connError, setConnError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(30 * 60);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const handleTranscript = useCallback((line: TranscriptLine) => {
    setTranscript((prev) => {
      const last = prev[prev.length - 1];
      // Tavus streams captions word-by-word. Merge a growing partial into
      // the live line rather than appending every fragment as a new row.
      if (last && last.role === line.role) {
        const prevNorm = normalizeCaption(last.content);
        const nextNorm = normalizeCaption(line.content);
        if (prevNorm === nextNorm) return prev;
        if (nextNorm.startsWith(prevNorm)) {
          return [...prev.slice(0, -1), line];
        }
        if (prevNorm.startsWith(nextNorm)) return prev;
      }
      return [...prev, line];
    });
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  async function endInterview() {
    setShowEndDialog(false);
    setEndError(null);
    setPhase("ending");

    let res: Response;
    try {
      res = await fetch("/api/interview/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    } catch {
      setEndError("network error — could not generate report.");
      setPhase("live");
      return;
    }

    if (!res.ok) {
      setEndError("failed to generate report. please try again.");
      setPhase("live");
      return;
    }

    const data = (await res.json()) as { reportId?: string; error?: string };
    if (!data.reportId) {
      setEndError(data.error ?? "failed to generate report.");
      setPhase("live");
      return;
    }

    router.push(`/report/${data.reportId}`);
  }

  const mmss = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(
    remaining % 60,
  ).padStart(2, "0")}`;

  if (phase === "ending") {
    return (
      <div className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-bg px-6">
        <div className="w-full max-w-md">
          <TerminalWindow title="generating">
            <div className="text-[13px]">
              <div className="mb-3 text-muted">
                <span className="text-accent2">❯</span> groq is grading your
                transcript
                <span className="dot-flash">.</span>
                <span className="dot-flash">.</span>
                <span className="dot-flash">.</span>
              </div>
              <div className="mb-4 leading-relaxed text-dim">
                building your debrief — scored breakdown, per-question feedback,
                and an improvement plan. this usually takes 10&ndash;20 seconds.
              </div>
              <div className="select-none tracking-widest text-accent">
                ████████████████░░░░░░░░
              </div>
            </div>
          </TerminalWindow>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-65px)] flex-col bg-bg">
      <EndInterviewDialog
        open={showEndDialog}
        onConfirm={endInterview}
        onCancel={() => setShowEndDialog(false)}
      />

      {/* top bar */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="min-w-0 truncate text-[12.5px] text-muted">
          ~/interview <span className="text-dim">·</span> session:{" "}
          <span className="text-paper">{sessionId.slice(0, 12)}</span>
        </div>
        <Timer onTick={setRemaining} />
        <AsciiButton variant="danger" onClick={() => setShowEndDialog(true)}>
          end_interview
        </AsciiButton>
      </div>

      {/* split */}
      <div className="mx-auto grid w-full max-w-shell flex-1 grid-cols-1 gap-7 px-5 py-7 lg:grid-cols-[40%_60%]">
        {/* LEFT — voice */}
        <div>
          <Prompt accent="muted" className="mb-3">
            interviewer.voice
          </Prompt>

          {connError ? (
            <TerminalWindow title="voice error">
              <div className="text-[13px]">
                <div className="mb-2 text-danger">❯ {connError}</div>
                <div className="mb-4 leading-relaxed text-muted">
                  the voice link dropped. you can end the interview to grade
                  what you covered, or restart in text mode.
                </div>
                <Link
                  href="/setup"
                  className="text-accent2 transition-colors hover:text-paper"
                >
                  ❯ restart in text mode →
                </Link>
              </div>
            </TerminalWindow>
          ) : (
            <TavusVideoPanel
              conversationUrl={tavusUrl}
              onTranscript={handleTranscript}
              onError={setConnError}
            />
          )}

          <div className="mt-3 text-[12px] text-dim">
            ❯ {role?.name ?? "interview"} · {seniority} · powered by tavus
          </div>
        </div>

        {/* RIGHT — transcript */}
        <div className="flex min-h-0 flex-col">
          <Prompt accent="muted" className="mb-3">
            transcript
          </Prompt>

          <div className="border border-border bg-surface">
            <div
              className="overflow-y-auto px-4 py-4 text-[13px]"
              style={{ maxHeight: "58vh", minHeight: "320px" }}
            >
              {transcript.length === 0 ? (
                <div className="text-dim">
                  — the conversation will transcribe here —
                </div>
              ) : (
                transcript.map((line, i) => {
                  const interviewer = line.role === "assistant";
                  return (
                    <div key={i} className="msg-in mb-3 leading-relaxed">
                      <span
                        className="inline-block text-muted"
                        style={{ width: "11ch" }}
                      >
                        {interviewer ? "interviewer" : "you"}
                      </span>{" "}
                      <span
                        className={interviewer ? "text-accent2" : "text-accent"}
                      >
                        ❯
                      </span>{" "}
                      <span className="text-paper">{line.content}</span>
                    </div>
                  );
                })
              )}
              <div ref={transcriptEndRef} />
            </div>
          </div>

          {endError && (
            <div className="mt-4 border border-danger bg-surface px-4 py-3 text-[13px]">
              <div className="mb-2 text-danger">❯ {endError}</div>
              <AsciiButton onClick={endInterview}>retry report</AsciiButton>
            </div>
          )}
        </div>
      </div>

      <StatusBar
        left={
          <>
            <span className="text-dim">❯ session:</span> {sessionId.slice(0, 8)}
            <span className="px-2 text-dim">·</span>role: {roleId || "—"}
            <span className="px-2 text-dim">·</span>mode: voice
            <span className="px-2 text-dim">·</span>
            {mmss} remaining
          </>
        }
        right={
          <>
            <span className="pulse-dot" /> live · tavus
          </>
        }
      />
    </div>
  );
}
