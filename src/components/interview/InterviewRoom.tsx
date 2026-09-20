"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SpeechService } from "@/services/speech.service";
import { INTERVIEW_SECONDS, MAX_QUESTIONS } from "@/lib/interview.config";
import { getVoiceForSeniority } from "@/lib/voices";
import TerminalWindow from "@/components/shared/TerminalWindow";
import Prompt from "@/components/shared/Prompt";
import AsciiButton from "@/components/shared/AsciiButton";
import StatusBar from "@/components/shared/StatusBar";
import Wordmark from "@/components/shared/Wordmark";
import type { InterviewMode, Message, Seniority, StreamEvent } from "@/types";
import InterviewerAvatar from "./InterviewerAvatar";
import TranscriptView from "./TranscriptView";
import VoiceInput from "./VoiceInput";
import TextInput from "./TextInput";
import Timer from "./Timer";
import EndInterviewDialog from "./EndInterviewDialog";

interface InterviewRoomProps {
  sessionId: string;
  mode: InterviewMode;
  roleId: string;
  seniority: Seniority;
}

type Phase = "loading" | "interviewer" | "awaiting-user" | "complete" | "ending";

function strip(text: string): string {
  return text.replaceAll("[INTERVIEW_COMPLETE]", "");
}

function clock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function InterviewRoom({
  sessionId,
  mode,
  roleId,
  seniority,
}: InterviewRoomProps) {
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [remaining, setRemaining] = useState(INTERVIEW_SECONDS);

  const lastUserMessageRef = useRef<string>("");
  const speechRef = useRef<SpeechService | null>(null);
  const initCalledRef = useRef(false);

  const voiceName =
    mode === "voice" ? getVoiceForSeniority(seniority).name : undefined;

  // One SpeechService drives both the interviewer's voice and the
  // candidate's mic, so interrupting the audio and opening the mic stay
  // in sync (voice mode only).
  const [speech, setSpeech] = useState<SpeechService | null>(null);
  useEffect(() => {
    if (mode !== "voice") return;

    const service = new SpeechService(seniority);
    service.onSpeakingChange = setIsSpeaking;
    service.onAutoplayBlocked = () => setAudioBlocked(true);
    speechRef.current = service;
    setSpeech(service);

    return () => {
      service.cancelSpeak();
      service.stopListening();
      speechRef.current = null;
      setSpeech(null);
    };
  }, [mode, seniority]);

  // Open the TLS connection to Cartesia before the first question needs
  // it — a cold handshake costs ~700ms that would land as dead air.
  useEffect(() => {
    if (mode !== "voice") return;
    const voiceId = getVoiceForSeniority(seniority).id;
    fetch(`/api/tts?warm=1&voiceId=${voiceId}`).catch(() => {});
  }, [mode, seniority]);

  const sendTurn = useCallback(
    async (userMessage: string) => {
      setError(null);
      setStreamingText("");
      setPhase("loading");

      let res: Response;
      try {
        res = await fetch("/api/interview/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, userMessage }),
        });
      } catch {
        setError("network error — could not reach the server.");
        setPhase("awaiting-user");
        return;
      }

      if (!res.ok || !res.body) {
        setError(`server error (${res.status}) — please retry.`);
        setPhase("awaiting-user");
        return;
      }

      setPhase("interviewer");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // The server marks sentence boundaries and sends each finished
      // sentence as it is generated, so the interviewer starts speaking
      // while the rest of the turn is still being written.
      const speaker = mode === "voice" ? speechRef.current : null;
      speaker?.beginTurn();

      for (;;) {
        let done = false;
        let value: Uint8Array | undefined;
        try {
          const result = await reader.read();
          done = result.done;
          value = result.value;
        } catch {
          setError("stream interrupted — please retry.");
          setPhase("awaiting-user");
          return;
        }

        if (done) break;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
        }

        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const dataLine = part.split("\n").find((l) => l.startsWith("data:"));
          if (!dataLine) continue;

          let event: StreamEvent;
          try {
            event = JSON.parse(dataLine.slice(5)) as StreamEvent;
          } catch {
            continue;
          }

          if (event.error) {
            setError(event.error);
            setPhase("awaiting-user");
            return;
          }

          if (event.chunk) {
            const chunk = event.chunk;
            setStreamingText((prev) => prev + chunk);
          }

          if (event.speak) {
            speaker?.speakSentence(event.speak);
          }

          if (event.done && event.fullText !== undefined) {
            const cleaned = strip(event.fullText);
            const finalMsg: Message = {
              role: "assistant",
              content: cleaned,
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, finalMsg]);
            setStreamingText("");

            if (event.isComplete) {
              setPhase("complete");
            } else {
              setPhase("awaiting-user");
            }

            // Wait for the speech queue to drain — the voice input
            // opens the mic once it does.
            if (speaker) await speaker.endTurn();
          }
        }
      }
    },
    [sessionId, mode],
  );

  useEffect(() => {
    if (initCalledRef.current) return;
    initCalledRef.current = true;
    sendTurn("");
  }, [sendTurn]);

  const handleUserSubmit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      speechRef.current?.cancelSpeak();

      lastUserMessageRef.current = trimmed;

      const userMsg: Message = {
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setPhase("loading");
      sendTurn(trimmed);
    },
    [sendTurn],
  );

  function handleRetry() {
    sendTurn(lastUserMessageRef.current);
  }

  /** User taps the mic while the AI is still speaking — stop the audio. */
  function handleInterrupt() {
    speechRef.current?.cancelSpeak();
  }

  /** Browser blocked autoplay — a tap unlocks it and resumes the queue. */
  async function handleUnlockAudio() {
    const unlocked = await speechRef.current?.unlockAudio();
    if (unlocked) setAudioBlocked(false);
  }

  async function endInterview() {
    setShowEndDialog(false);
    setEndError(null);
    setPhase("ending");
    speechRef.current?.cancelSpeak();
    speechRef.current?.stopListening();

    let res: Response;
    try {
      res = await fetch("/api/interview/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    } catch {
      setEndError("network error — could not generate report.");
      setPhase("complete");
      return;
    }

    if (!res.ok) {
      setEndError("failed to generate report. please try again.");
      setPhase("complete");
      return;
    }

    const data = (await res.json()) as { reportId?: string; error?: string };
    if (!data.reportId) {
      setEndError(data.error ?? "failed to generate report.");
      setPhase("complete");
      return;
    }

    router.push(`/report/${data.reportId}`);
  }

  /* ---- derived ---- */
  const thinking = phase === "loading";
  const speaking = isSpeaking || phase === "interviewer";
  const questionNum = messages.filter((m) => m.role === "assistant").length;
  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");
  const currentQuestion = streamingText
    ? strip(streamingText)
    : lastAssistant
      ? strip(lastAssistant.content)
      : "warming up the interviewer…";

  /* ---- ending overlay ---- */
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
              <div className="mb-4 text-dim leading-relaxed">
                building your debrief — scored breakdown, per-question feedback,
                and an improvement plan. this usually takes about 5 seconds.
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

      {/* Autoplay gate — browsers block sound until the page is tapped. */}
      {audioBlocked && (
        <button
          type="button"
          onClick={handleUnlockAudio}
          className="w-full border-b border-accent2 bg-surface px-5 py-2.5 text-left text-[13px] text-accent2 transition-colors hover:bg-border/40"
        >
          ❯ your browser muted the interviewer —{" "}
          <span className="underline">tap here to enable audio</span>
        </button>
      )}

      {/* top bar */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="flex min-w-0 items-center gap-2.5 text-[12.5px] text-muted">
          <Wordmark size="sm" />
          <span className="text-dim">·</span>
          <span className="truncate">
            session:{" "}
            <span className="text-paper">{sessionId.slice(0, 12)}</span>
          </span>
        </div>
        <Timer onTick={setRemaining} />
        <AsciiButton
          variant="danger"
          sound="danger"
          onClick={() => setShowEndDialog(true)}
        >
          end_interview
        </AsciiButton>
      </div>

      {/* split */}
      <div className="mx-auto grid w-full max-w-shell flex-1 grid-cols-1 gap-7 px-5 py-7 lg:grid-cols-[40%_60%]">
        {/* LEFT — interviewer */}
        <div>
          <Prompt accent="muted" className="mb-3">
            interviewer
          </Prompt>

          <InterviewerAvatar
            speaking={speaking}
            thinking={thinking}
            voiceName={voiceName}
          />

          <div className="mb-2 mt-5 text-[12px] text-dim">
            ❯ now-asking · Q{Math.max(1, questionNum)}
          </div>
          <p
            className="editorial leading-[1.45]"
            style={{ fontSize: "clamp(19px, 2.4vw, 28px)" }}
          >
            {currentQuestion}
          </p>

          {error && (
            <div className="mt-5 border border-danger bg-surface px-4 py-3 text-[13px]">
              <div className="mb-2 text-danger">❯ error: {error}</div>
              <AsciiButton sound="secondary" onClick={handleRetry}>retry</AsciiButton>
            </div>
          )}

          {phase === "complete" && !error && (
            <div className="mt-5">
              <TerminalWindow title="complete">
                <div className="text-[13px]">
                  <div className="mb-1 text-accent">✓ interview complete</div>
                  <div className="mb-4 text-muted leading-relaxed">
                    you answered every question. ready to see the debrief?
                  </div>
                  {endError && (
                    <div className="mb-3 text-[12px] text-danger">
                      ❯ {endError}
                    </div>
                  )}
                  <AsciiButton sound="success" onClick={endInterview}>
                    view report <span className="btn-ret">→</span>
                  </AsciiButton>
                </div>
              </TerminalWindow>
            </div>
          )}
        </div>

        {/* RIGHT — transcript + input */}
        <div className="flex min-h-0 flex-col">
          <Prompt accent="muted" className="mb-3">
            transcript
          </Prompt>

          <TranscriptView messages={messages} streamingText={streamingText} />

          {phase !== "complete" && (
            <div className="mt-5">
              {mode === "voice" ? (
                <VoiceInput
                  service={speech}
                  onSubmit={handleUserSubmit}
                  disabled={phase !== "awaiting-user"}
                  speaking={isSpeaking}
                  onInterrupt={handleInterrupt}
                />
              ) : (
                <TextInput
                  onSubmit={handleUserSubmit}
                  disabled={phase !== "awaiting-user"}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <StatusBar
        left={
          <>
            <span className="text-dim">❯ session:</span> {sessionId.slice(0, 8)}
            <span className="px-2 text-dim">·</span>role: {roleId || "—"}
            <span className="px-2 text-dim">·</span>question{" "}
            {Math.max(1, questionNum)}/{MAX_QUESTIONS}
            <span className="px-2 text-dim">·</span>mode: {mode}
          </>
        }
        right={
          <>
            {clock(remaining)} remaining
            <span className="px-2 text-dim">·</span>
            <span className="pulse-dot" /> connected
          </>
        }
      />
    </div>
  );
}
