"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DailyAudio,
  DailyProvider,
  useAudioLevelObserver,
  useAudioTrack,
  useDaily,
  useDailyEvent,
  useParticipantIds,
} from "@daily-co/daily-react";

/* ============================================================ *
 * TavusVoicePanel — voice-only Tavus conversation.
 * The 3D video model is gone; we keep the live Daily audio
 * stream and render a reactive ASCII waveform that animates to
 * the interviewer's actual voice level.
 * ============================================================ */

export interface TranscriptLine {
  role: "assistant" | "user";
  content: string;
}

interface TavusVideoPanelProps {
  conversationUrl: string;
  onTranscript?: (line: TranscriptLine) => void;
  onLeft?: () => void;
  onError?: (message: string) => void;
}

const BAR_COUNT = 21;
const CHARS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
const IDLE_BARS: string[] = Array.from({ length: BAR_COUNT }, (_, i) =>
  i % 3 === 0 ? "▂" : "▁",
);

/** Best-effort extraction of a caption line from a Daily app-message. */
function extractCaption(data: unknown): TranscriptLine | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  const props =
    obj.properties && typeof obj.properties === "object"
      ? (obj.properties as Record<string, unknown>)
      : obj;
  const speech =
    typeof props.speech === "string"
      ? props.speech
      : typeof props.text === "string"
        ? props.text
        : null;
  if (!speech || speech.trim().length === 0) return null;
  const rawRole = typeof props.role === "string" ? props.role : "";
  const role: "assistant" | "user" = /replica|assistant|agent/i.test(rawRole)
    ? "assistant"
    : "user";
  return { role, content: speech.trim() };
}

function ReactiveWaveform({ remoteId }: { remoteId: string }) {
  const [bars, setBars] = useState<string[]>(IDLE_BARS);
  const [active, setActive] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleVolume = useCallback((volume: number) => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (volume < 0.02) {
      idleTimerRef.current = setTimeout(() => {
        setActive(false);
        setBars(IDLE_BARS);
      }, 350);
      return;
    }
    setActive(true);
    const intensity = Math.min(1, volume * 4);
    setBars(
      Array.from({ length: BAR_COUNT }, (_, i) => {
        // Center-weighted: middle bars react more strongly than edges.
        const center = (BAR_COUNT - 1) / 2;
        const dist = Math.abs(i - center) / center;
        const weight = 1 - dist * 0.55;
        const jitter = 0.55 + Math.random() * 0.45;
        const level = Math.min(1, intensity * weight * jitter);
        const idx = Math.min(
          CHARS.length - 1,
          Math.max(0, Math.floor(level * CHARS.length)),
        );
        return CHARS[idx];
      }),
    );
  }, []);

  useAudioLevelObserver(remoteId, handleVolume);

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div
        className={`flex items-end gap-[4px] font-mono leading-none ${
          active ? "text-accent" : "text-muted"
        }`}
        style={{ height: "72px", fontSize: "44px" }}
      >
        {bars.map((ch, i) => (
          <span key={i}>{ch}</span>
        ))}
      </div>
      <div className="mt-5 font-mono text-[12px] tracking-wide text-dim">
        {active ? (
          <span className="text-accent2">❯ speaking</span>
        ) : (
          <span>❯ listening</span>
        )}
      </div>
    </div>
  );
}

function VoiceStage({
  onTranscript,
  onLeft,
  onError,
}: Omit<TavusVideoPanelProps, "conversationUrl">) {
  const daily = useDaily();
  const remoteIds = useParticipantIds({ filter: "remote" });
  const remoteId = remoteIds[0] ?? "";
  const audioState = useAudioTrack(remoteId);

  useEffect(() => {
    if (!daily) return;
    daily.join({ startVideoOff: true, startAudioOff: false }).catch(() => {
      onError?.("could not join the voice room");
    });
    return () => {
      daily.leave().catch(() => {});
    };
  }, [daily, onError]);

  useDailyEvent(
    "app-message",
    useCallback(
      (ev: { data?: unknown }) => {
        const line = extractCaption(ev.data);
        if (line) onTranscript?.(line);
      },
      [onTranscript],
    ),
  );

  useDailyEvent(
    "left-meeting",
    useCallback(() => onLeft?.(), [onLeft]),
  );

  useDailyEvent(
    "error",
    useCallback(() => onError?.("voice connection error"), [onError]),
  );

  const connected = remoteId.length > 0 && !audioState.isOff;

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden border border-border bg-surface">
      {/* ASCII corner glyphs */}
      <span className="pointer-events-none absolute left-1 top-0 z-10 font-mono text-sm text-accent2">
        ┌
      </span>
      <span className="pointer-events-none absolute right-1 top-0 z-10 font-mono text-sm text-accent2">
        ┐
      </span>
      <span className="pointer-events-none absolute bottom-0 left-1 z-10 font-mono text-sm text-accent2">
        └
      </span>
      <span className="pointer-events-none absolute bottom-0 right-1 z-10 font-mono text-sm text-accent2">
        ┘
      </span>

      <div className="absolute left-3 top-3 z-10 flex items-center gap-2 font-mono text-[11px]">
        <span className="pulse-dot" style={{ background: "#7ec96f" }} />
        <span className="text-paper">{connected ? "LIVE" : "STANDBY"}</span>
      </div>
      <div className="absolute right-3 top-3 z-10 font-mono text-[11px] text-muted">
        interviewer.voice
      </div>

      <div className="flex h-full w-full flex-col items-center justify-center px-6 font-mono">
        <pre className="m-0 mb-6 select-none text-[13px] leading-[1.3] text-muted">
{`╭────────────╮
│  AI VOICE  │
╰────────────╯`}
        </pre>

        {connected ? (
          <ReactiveWaveform remoteId={remoteId} />
        ) : (
          <>
            <div className="mb-2 text-accent2">❯ connecting…</div>
            <div className="text-[12px] text-muted">
              establishing voice link
            </div>
          </>
        )}
      </div>

      <DailyAudio />
    </div>
  );
}

export function TavusVideoPanel({
  conversationUrl,
  onTranscript,
  onLeft,
  onError,
}: TavusVideoPanelProps) {
  return (
    <DailyProvider url={conversationUrl}>
      <VoiceStage
        onTranscript={onTranscript}
        onLeft={onLeft}
        onError={onError}
      />
    </DailyProvider>
  );
}

export default TavusVideoPanel;
