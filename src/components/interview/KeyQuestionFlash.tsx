"use client";

/* ============================================================ *
 * KeyQuestionFlash — a brief 3D badge that punches onto the
 * screen when the interviewer asks one of the pivotal [KEY]
 * questions. Self-dismisses; the parent drops it after ~2.4s.
 * ============================================================ */
export default function KeyQuestionFlash() {
  return (
    <div className="key-flash pointer-events-none fixed inset-0 z-[60] flex items-start justify-center pt-[18vh]">
      <div className="key-flash-badge">
        <div className="relative border-2 border-accent2 bg-bg/95 px-7 py-5 shadow-[0_0_40px_rgba(217,119,87,0.35)]">
          {/* corner ticks */}
          <span className="absolute -left-1 -top-1 text-accent2">┌</span>
          <span className="absolute -right-1 -top-1 text-accent2">┐</span>
          <span className="absolute -bottom-1 -left-1 text-accent2">└</span>
          <span className="absolute -bottom-1 -right-1 text-accent2">┘</span>

          <div className="flex items-center gap-3 font-mono">
            <span className="key-glow text-[26px] text-accent2">◆</span>
            <div>
              <div className="key-glow text-[18px] font-semibold tracking-[0.25em] text-accent2">
                KEY QUESTION
              </div>
              <div className="mt-0.5 text-[11px] tracking-wide text-muted">
                this one matters — take your time
              </div>
            </div>
            <span className="key-glow text-[26px] text-accent2">◆</span>
          </div>
        </div>
      </div>
    </div>
  );
}
