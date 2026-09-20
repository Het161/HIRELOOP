"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  SpeechService,
  type ListenError,
  type ListenMode,
} from "@/services/speech.service";
import TerminalWindow from "@/components/shared/TerminalWindow";
import AsciiButton from "@/components/shared/AsciiButton";
import { playClick } from "@/lib/sounds";

interface VoiceInputProps {
  /** Shared service — the same instance that speaks the questions. */
  service: SpeechService | null;
  onSubmit: (text: string) => void;
  disabled: boolean;
  /** True while the interviewer's Cartesia audio is playing. */
  speaking: boolean;
  /** Called when the candidate taps the mic while the AI is speaking. */
  onInterrupt: () => void;
}

type MicState = "idle" | "listening" | "processing";

export default function VoiceInput({
  service,
  onSubmit,
  disabled,
  speaking,
  onInterrupt,
}: VoiceInputProps) {
  const [supported, setSupported] = useState(true);
  const [micState, setMicState] = useState<MicState>("idle");
  const [interim, setInterim] = useState("");
  const [listenMode, setListenMode] = useState<ListenMode>("browser");
  const [micError, setMicError] = useState<ListenError | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    setSupported(SpeechService.isVoiceInputSupported());
  }, []);

  const handleFinal = useCallback(
    (text: string) => {
      if (submittedRef.current) return;
      const trimmed = text.trim();
      setMicState("idle");
      if (!trimmed) {
        // Nothing usable was captured — reopen the mic rather than
        // sending an empty turn.
        setInterim("");
        return;
      }
      submittedRef.current = true;
      setMicState("processing");
      setInterim("");
      onSubmit(trimmed);
      setTimeout(() => {
        submittedRef.current = false;
        setMicState("idle");
      }, 400);
    },
    [onSubmit],
  );

  const startListening = useCallback(() => {
    if (!service || service.isListening) return;
    if (!SpeechService.isVoiceInputSupported()) return;
    submittedRef.current = false;
    setMicError(null);
    setInterim("");
    setMicState("listening");
    service.startListening(
      (t) => setInterim(t),
      handleFinal,
      (err) => {
        setMicError(err);
        setMicState("idle");
      },
      (mode) => setListenMode(mode),
    );
  }, [service, handleFinal]);

  // Auto-open the mic the moment the AI finishes speaking and it is the
  // candidate's turn — this is what makes it feel like a real conversation.
  useEffect(() => {
    if (
      service &&
      !disabled &&
      !speaking &&
      supported &&
      !micError &&
      micState === "idle" &&
      !submittedRef.current
    ) {
      startListening();
    }
  }, [
    service,
    disabled,
    speaking,
    supported,
    micError,
    micState,
    startListening,
  ]);

  function handleMicClick() {
    if (speaking) {
      onInterrupt(); // stop the AI — the effect above then opens the mic
      return;
    }
    if (micError) {
      startListening(); // retry after the candidate fixes permissions
      return;
    }
    if (disabled) return;
    if (micState === "listening") {
      // In Whisper mode the transcript arrives after upload, so let the
      // service decide what "submit now" means for the active path.
      setMicState("processing");
      service?.submitNow();
      return;
    }
    if (micState === "idle") {
      startListening();
    }
  }

  if (!supported) {
    return (
      <div className="border border-border bg-surface px-4 py-4 text-[13px]">
        <div className="mb-1 text-danger">❯ voice input unsupported</div>
        <div className="leading-relaxed text-muted">
          this browser can&apos;t capture audio — chrome or edge recommended.
          restart in text mode to answer.
        </div>
      </div>
    );
  }

  const isListening = micState === "listening";
  const isProcessing = micState === "processing";

  const micDotClass = micError
    ? "text-danger"
    : speaking
      ? "text-accent2"
      : isListening
        ? "animate-pulse text-danger"
        : isProcessing
          ? "text-muted"
          : "text-dim";

  const statusText = micError
    ? "mic unavailable — tap to retry"
    : speaking
      ? "interviewer speaking — tap to interrupt"
      : isProcessing
        ? "processing…"
        : isListening
          ? "listening"
          : disabled
            ? "waiting for the interviewer…"
            : "tap [ ● ] to answer";

  return (
    <TerminalWindow title="recording">
      <div className="text-[13px]">
        <div className="mb-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (!(disabled && !speaking)) playClick("toggle");
              handleMicClick();
            }}
            disabled={disabled && !speaking && !micError}
            aria-label={
              speaking
                ? "Interrupt the interviewer"
                : isListening
                  ? "Submit answer"
                  : "Start recording"
            }
            className="border border-border px-3 py-1.5 transition-colors hover:border-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            [ <span className={micDotClass}>●</span> ]
          </button>
          <span className="text-muted">
            {statusText}
            {isListening && <span className="cursor" />}
          </span>
        </div>

        {micError && (
          <div className="mb-3 border border-danger px-3 py-2 text-[12px] leading-relaxed text-danger">
            ❯ {micError.message}
          </div>
        )}

        <div className="mb-1 flex items-center justify-between text-[12px] text-dim">
          <span>live transcript:</span>
          {listenMode === "whisper" && (
            <span className="text-accent2">[ whisper mode ]</span>
          )}
        </div>
        <div className="min-h-[2.6em] leading-relaxed text-paper">
          {interim || (
            <span className="text-dim">
              {speaking
                ? "— interviewer speaking —"
                : "— waiting for your voice —"}
            </span>
          )}
        </div>

        <div className="my-3 select-none overflow-hidden whitespace-nowrap leading-none text-dim">
          {"─".repeat(140)}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] text-dim">
            [ auto-submits on silence · tap mic to submit now ]
          </span>
          {isListening && (
            <AsciiButton
              sound="primary"
              onClick={() => {
                setMicState("processing");
                service?.submitNow();
              }}
            >
              submit <span className="btn-ret">↵</span>
            </AsciiButton>
          )}
        </div>
      </div>
    </TerminalWindow>
  );
}
