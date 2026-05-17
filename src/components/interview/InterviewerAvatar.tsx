"use client";

import TerminalWindow from "@/components/shared/TerminalWindow";
import Waveform from "./Waveform";

interface InterviewerAvatarProps {
  speaking: boolean;
  thinking: boolean;
  /** Cartesia voice persona name — shown only in voice mode. */
  voiceName?: string;
}

export default function InterviewerAvatar({
  speaking,
  thinking,
  voiceName,
}: InterviewerAvatarProps) {
  return (
    <TerminalWindow className="w-full" bodyClassName="p-6">
      <div
        className="flex flex-col items-center justify-center"
        style={{ minHeight: "188px" }}
      >
        {/* ASCII AI badge */}
        <pre className="m-0 mb-5 select-none font-mono text-[13px] leading-[1.3] text-muted">
{`╭────────╮
│   AI   │
╰────────╯`}
        </pre>

        {/* Waveform — animates while the Cartesia audio is playing */}
        <Waveform isSpeaking={speaking} />

        {/* State line */}
        <div className="mt-4 font-mono text-[12px] tracking-wide text-dim">
          {thinking ? (
            <span>
              {"[ thinking "}
              <span className="dot-flash">·</span>
              <span className="dot-flash">·</span>
              <span className="dot-flash">·</span>
              {" ]"}
            </span>
          ) : speaking ? (
            <span className="text-dim">❯ speaking</span>
          ) : (
            <span className="text-dim">❯ idle</span>
          )}
        </div>

        {/* Voice persona indicator */}
        {voiceName && (
          <div className="mt-2 font-mono text-[11px] text-muted">
            <span className="text-accent2">●</span> speaking as {voiceName}
          </div>
        )}
      </div>
    </TerminalWindow>
  );
}
