"use client";

import { useCallback, useEffect } from "react";
import {
  DailyAudio,
  DailyProvider,
  DailyVideo,
  useDaily,
  useDailyEvent,
  useParticipantIds,
  useVideoTrack,
} from "@daily-co/daily-react";

/* ============================================================ *
 * TavusVideoPanel — the one non-terminal element in HireLoop.
 * A real-time photorealistic video interviewer streamed over
 * Daily.co WebRTC. The terminal frame around it is the point.
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

function VideoStage({
  onTranscript,
  onLeft,
  onError,
}: Omit<TavusVideoPanelProps, "conversationUrl">) {
  const daily = useDaily();
  const remoteIds = useParticipantIds({ filter: "remote" });
  const remoteId = remoteIds[0] ?? "";
  const videoState = useVideoTrack(remoteId);

  // Join the Daily room on mount; leave on unmount.
  useEffect(() => {
    if (!daily) return;
    daily.join({ startVideoOff: false, startAudioOff: false }).catch(() => {
      onError?.("could not join the video room");
    });
    return () => {
      daily.leave().catch(() => {});
    };
  }, [daily, onError]);

  // Live captions → transcript panel.
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
    useCallback(() => onError?.("video connection error"), [onError]),
  );

  const hasVideo = remoteId.length > 0 && !videoState.isOff;

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden border border-border bg-surface">
      {/* ASCII corner glyphs — terminal vibe even on the video */}
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

      {/* status overlays */}
      <div className="absolute left-3 top-3 z-10 flex items-center gap-2 font-mono text-[11px]">
        <span className="pulse-dot" style={{ background: "#7ec96f" }} />
        <span className="text-paper">{hasVideo ? "LIVE" : "STANDBY"}</span>
      </div>
      <div className="absolute right-3 top-3 z-10 font-mono text-[11px] text-muted">
        interviewer.cam
      </div>

      {hasVideo ? (
        <DailyVideo
          sessionId={remoteId}
          type="video"
          automirror={false}
          fit="cover"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center font-mono">
          <div className="mb-2 text-accent2">❯ connecting…</div>
          <div className="text-[12px] text-muted">establishing video link</div>
        </div>
      )}

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
      <VideoStage
        onTranscript={onTranscript}
        onLeft={onLeft}
        onError={onError}
      />
    </DailyProvider>
  );
}

export default TavusVideoPanel;
