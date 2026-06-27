"use client";

import TerminalWindow from "@/components/shared/TerminalWindow";

/* ============================================================ *
 * InterviewCompleteOverlay — the celebratory 3D "interview
 * complete" burst shown the moment the timer runs out, while
 * Groq grades the transcript in the background.
 * ============================================================ */
export default function InterviewCompleteOverlay() {
  return (
    <div className="complete-stage flex min-h-[calc(100vh-65px)] items-center justify-center bg-bg px-6">
      <div className="complete-badge w-full max-w-lg text-center">
        {/* expanding rings behind the mark */}
        <div className="relative mx-auto mb-7 h-28 w-28">
          <span className="complete-ring absolute inset-0 rounded-full border border-accent" />
          <span
            className="complete-ring absolute inset-0 rounded-full border border-accent2"
            style={{ animationDelay: "0.5s" }}
          />
          <span
            className="complete-ring absolute inset-0 rounded-full border border-accent"
            style={{ animationDelay: "1s" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="complete-spin text-[44px] text-accent">◆</span>
          </div>
        </div>

        <div className="key-glow mb-2 font-mono text-[26px] font-semibold tracking-[0.18em] text-accent2">
          INTERVIEW COMPLETE
        </div>
        <div className="mb-7 font-mono text-[13px] tracking-wide text-muted">
          time&apos;s up — that&apos;s a wrap. nice work.
        </div>

        <TerminalWindow title="generating">
          <div className="text-left text-[13px]">
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
