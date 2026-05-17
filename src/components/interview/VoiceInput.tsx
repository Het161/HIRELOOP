"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SpeechService } from "@/services/speech.service";
import TerminalWindow from "@/components/shared/TerminalWindow";
import AsciiButton from "@/components/shared/AsciiButton";
import type { Seniority } from "@/types";

interface VoiceInputProps {
  onSubmit: (text: string) => void;
  disabled: boolean;
  seniority: Seniority;
  /** True while the interviewer's Cartesia audio is playing. */
  speaking: boolean;
  /** Called when the candidate taps the mic while the AI is speaking. */
  onInterrupt: () => void;
}

type MicState = "idle" | "listening" | "processing";

export default function VoiceInput({
  onSubmit,
  disabled,
  seniority,
  speaking,
  onInterrupt,
}: VoiceInputProps) {
  const [supported, setSupported] = useState(true);
  const [micState, setMicState] = useState<MicState>("idle");
  const [interim, setInterim] = useState("");
  const serviceRef = useRef<SpeechService | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    setSupported(SpeechService.isRecognitionSupported());
    serviceRef.current = new SpeechService(seniority);
    const service = serviceRef.current;
    return () => {
      service?.stopListening();
      service?.cancelSpeak();
    };
  }, [seniority]);

  const handleSubmit = useCallback(
    (text: string) => {
      if (submittedRef.current) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      submittedRef.current = true;
      setMicState("processing");
      setInterim("");
      serviceRef.current?.stopListening();
      onSubmit(trimmed);
      setTimeout(() => {
        submittedRef.current = false;
        setMicState("idle");
      }, 400);
    },
    [onSubmit],
  );

  const startListening = useCallback(() => {
    const service = serviceRef.current;
    if (!service || service.isListening) return;
    if (!SpeechService.isRecognitionSupported()) return;
    submittedRef.current = false;
    setInterim("");
    setMicState("listening");
    service.startListening(
      (t) => setInterim(t),
      (finalText) => {
        if (!submittedRef.current) handleSubmit(finalText);
      },
    );
  }, [handleSubmit]);

  // Auto-open the mic the moment the AI finishes speaking and it is the
  // candidate's turn — this is what makes it feel like a real conversation.
  useEffect(() => {
    if (
      !disabled &&
      !speaking &&
      supported &&
      micState === "idle" &&
      !submittedRef.current
    ) {
      startListening();
    }
  }, [disabled, speaking, supported, micState, startListening]);

  function handleMicClick() {
    if (speaking) {
      onInterrupt(); // stop the AI — the effect above then opens the mic
      return;
    }
    if (disabled) return;
    if (micState === "listening") {
      handleSubmit(interim);
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
          this browser can&apos;t transcribe speech — chrome or edge
          recommended. restart in text mode to answer.
        </div>
      </div>
    );
  }

  const isListening = micState === "listening";
  const isProcessing = micState === "processing";

  const micDotClass = speaking
    ? "text-accent2"
    : isListening
      ? "animate-pulse text-danger"
      : isProcessing
        ? "text-muted"
        : "text-dim";

  const statusText = speaking
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
            onClick={handleMicClick}
            disabled={disabled && !speaking}
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

        <div className="mb-1 text-[12px] text-dim">live transcript:</div>
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
            <AsciiButton onClick={() => handleSubmit(interim)}>
              submit <span className="btn-ret">↵</span>
            </AsciiButton>
          )}
        </div>
      </div>
    </TerminalWindow>
  );
}
