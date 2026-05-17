"use client";

import TerminalWindow from "@/components/shared/TerminalWindow";
import type { InterviewMode } from "@/types";

interface ModeToggleProps {
  selected: InterviewMode | null;
  onSelect: (m: InterviewMode) => void;
  /** Whether TAVUS_API_KEY is configured — gates the video mode. */
  tavusAvailable: boolean;
}

export default function ModeToggle({
  selected,
  onSelect,
  tavusAvailable,
}: ModeToggleProps) {
  // "video" mode keeps the internal value "voice" for back-compatibility.
  const videoSelected = selected === "voice";
  const textSelected = selected === "text";

  return (
    <div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Video — live Tavus avatar */}
        <button
          type="button"
          onClick={() => {
            if (tavusAvailable) onSelect("voice");
          }}
          disabled={!tavusAvailable}
          aria-pressed={videoSelected}
          className={`text-left focus-visible:outline-none ${
            tavusAvailable ? "" : "cursor-not-allowed opacity-50"
          }`}
        >
          <TerminalWindow
            title="video"
            titleRight={
              videoSelected ? (
                <span className="text-accent2">[selected]</span>
              ) : undefined
            }
            className={videoSelected ? "border-accent2" : undefined}
            bodyClassName="px-6 py-6"
          >
            <div className="flex gap-5">
              <pre className="m-0 flex-none font-mono text-[13px] leading-[1.35] text-accent">
{`╔════════╗
║ ◕    ◕ ║
║   ──   ║
╚════════╝`}
              </pre>
              <div>
                <div className="mb-1 font-mono text-[14px] text-paper">
                  video mode
                </div>
                <div className="mb-2 font-mono text-dim">──────────</div>
                <div className="font-mono text-[12.5px] leading-relaxed text-muted">
                  live face-to-face with the AI interviewer — a real,
                  photorealistic face that talks back.
                </div>
                <div className="mt-2 font-mono text-[12px]">
                  {tavusAvailable ? (
                    <span className="text-dim">
                      powered by tavus · needs camera + mic
                    </span>
                  ) : (
                    <span className="text-danger">
                      ❯ requires TAVUS_API_KEY
                    </span>
                  )}
                </div>
              </div>
            </div>
          </TerminalWindow>
        </button>

        {/* Text */}
        <button
          type="button"
          onClick={() => onSelect("text")}
          aria-pressed={textSelected}
          className="text-left focus-visible:outline-none"
        >
          <TerminalWindow
            title="text"
            titleRight={
              textSelected ? (
                <span className="text-accent2">[selected]</span>
              ) : undefined
            }
            className={textSelected ? "border-accent2" : undefined}
            bodyClassName="px-6 py-6"
          >
            <div className="flex gap-5">
              <pre className="m-0 flex-none font-mono text-[13px] leading-[1.35] text-accent">
{`┌────────┐
│ > _    │
│        │
└────────┘`}
              </pre>
              <div>
                <div className="mb-1 font-mono text-[14px] text-paper">
                  text mode
                </div>
                <div className="mb-2 font-mono text-dim">──────────</div>
                <div className="font-mono text-[12.5px] leading-relaxed text-muted">
                  classic text interface. type your answers at your own pace.
                </div>
                <div className="mt-2 font-mono text-[12px] text-dim">
                  works anywhere, every browser
                </div>
              </div>
            </div>
          </TerminalWindow>
        </button>
      </div>

      <div className="mt-4 font-mono text-[12px] text-dim">
        ~/note: video uses ~1 free tavus minute per minute of interview · 25
        free minutes total
      </div>
    </div>
  );
}
