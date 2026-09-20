"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Prompt from "@/components/shared/Prompt";
import AsciiButton from "@/components/shared/AsciiButton";
import StatusBar from "@/components/shared/StatusBar";
import TerminalWindow from "@/components/shared/TerminalWindow";
import { getLanguage, getDifficulty, starterCode } from "@/lib/dsa";
import { playInterviewCompleteCue, playKeyQuestionCue } from "@/lib/sounds";
import type {
  CodeLanguage,
  DsaDifficulty,
  Message,
  StreamEvent,
} from "@/types";
import CodeEditor from "./CodeEditor";
import Timer from "./Timer";
import EndInterviewDialog from "./EndInterviewDialog";
import KeyQuestionFlash from "./KeyQuestionFlash";
import InterviewCompleteOverlay from "./InterviewCompleteOverlay";

interface DsaInterviewRoomProps {
  sessionId: string;
  difficulty: DsaDifficulty;
  language: CodeLanguage;
  durationMinutes: number;
}

type Phase = "loading" | "interviewer" | "awaiting-user" | "complete" | "ending";

const KEY_MARKER = "[KEY]";

function strip(text: string): string {
  return text.replaceAll("[INTERVIEW_COMPLETE]", "").replaceAll(KEY_MARKER, "");
}

/** Pull a "Verdict: X" line out of a feedback message, if present. */
function parseVerdict(text: string): "Correct" | "Almost" | "Incorrect" | null {
  const m = text.match(/verdict:\s*(correct|almost|incorrect)/i);
  if (!m) return null;
  const v = m[1].toLowerCase();
  return v === "correct" ? "Correct" : v === "almost" ? "Almost" : "Incorrect";
}

function VerdictChip({ verdict }: { verdict: string }) {
  const color =
    verdict === "Correct"
      ? "text-accent border-accent"
      : verdict === "Almost"
        ? "text-accent2 border-accent2"
        : "text-danger border-danger";
  return (
    <span
      className={`inline-block border px-2 py-0.5 font-mono text-[11px] tracking-wide ${color}`}
    >
      ❯ {verdict.toUpperCase()}
    </span>
  );
}

export default function DsaInterviewRoom({
  sessionId,
  difficulty,
  language,
  durationMinutes,
}: DsaInterviewRoomProps) {
  const router = useRouter();

  const langMeta = getLanguage(language);
  const difficultyLabel = getDifficulty(difficulty)?.label ?? difficulty;

  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(durationMinutes * 60);
  const [keyFlash, setKeyFlash] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [code, setCode] = useState(starterCode(language));
  const [clarify, setClarify] = useState("");

  const lastUserMessageRef = useRef<string>("");
  const initCalledRef = useRef(false);
  const keyFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endTriggeredRef = useRef(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (keyFlashTimer.current) clearTimeout(keyFlashTimer.current);
    };
  }, []);

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
        if (value) buffer += decoder.decode(value, { stream: true });

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
            setStreamingText((prev) => prev + event.chunk);
          }

          if (event.done && event.fullText !== undefined) {
            const cleaned = strip(event.fullText);
            const isKey = event.fullText.includes(KEY_MARKER);
            const finalMsg: Message = {
              role: "assistant",
              content: cleaned,
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, finalMsg]);
            setStreamingText("");

            if (isKey) {
              if (keyFlashTimer.current) clearTimeout(keyFlashTimer.current);
              setKeyFlash(true);
              playKeyQuestionCue();
              keyFlashTimer.current = setTimeout(
                () => setKeyFlash(false),
                2400,
              );
            }

            setPhase(event.isComplete ? "complete" : "awaiting-user");
          }
        }
      }
    },
    [sessionId],
  );

  useEffect(() => {
    if (initCalledRef.current) return;
    initCalledRef.current = true;
    sendTurn("");
  }, [sendTurn]);

  useEffect(() => {
    // Keep the scroll contained to the log — never yank the whole page.
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const submitCode = useCallback(() => {
    if (phase !== "awaiting-user") return;
    const trimmed = code.trim();
    if (!trimmed) return;
    const fence = langMeta?.fence ?? "";
    const label = langMeta?.label ?? language;
    const payload = `Here is my solution in ${label}:\n\n\`\`\`${fence}\n${code}\n\`\`\``;
    lastUserMessageRef.current = payload;
    setMessages((prev) => [
      ...prev,
      { role: "user", content: payload, timestamp: Date.now() },
    ]);
    setPhase("loading");
    sendTurn(payload);
  }, [phase, code, langMeta, language, sendTurn]);

  const submitClarify = useCallback(() => {
    if (phase !== "awaiting-user") return;
    const trimmed = clarify.trim();
    if (!trimmed) return;
    lastUserMessageRef.current = trimmed;
    setClarify("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: trimmed, timestamp: Date.now() },
    ]);
    setPhase("loading");
    sendTurn(trimmed);
  }, [phase, clarify, sendTurn]);

  function handleRetry() {
    sendTurn(lastUserMessageRef.current);
  }

  const handleTimeUp = useCallback(() => {
    if (endTriggeredRef.current) return;
    setKeyFlash(false);
    setTimeUp(true);
    playInterviewCompleteCue();
    void endInterview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function endInterview() {
    if (endTriggeredRef.current) return;
    endTriggeredRef.current = true;
    setShowEndDialog(false);
    setEndError(null);
    setPhase("ending");

    const fail = (msg: string) => {
      endTriggeredRef.current = false;
      setTimeUp(false);
      setEndError(msg);
      setPhase("complete");
    };

    let res: Response;
    try {
      res = await fetch("/api/interview/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    } catch {
      fail("network error — could not generate report.");
      return;
    }
    if (!res.ok) {
      fail("failed to generate report. please try again.");
      return;
    }
    const data = (await res.json()) as { reportId?: string; error?: string };
    if (!data.reportId) {
      fail(data.error ?? "failed to generate report.");
      return;
    }
    router.push(`/report/${data.reportId}`);
  }

  /* ---- derived ---- */
  const problemNum = messages.filter((m) => m.role === "assistant").length;
  const targetProblems = Math.max(2, Math.min(8, Math.round(durationMinutes / 6)));
  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");
  const currentText = streamingText
    ? strip(streamingText)
    : lastAssistant
      ? lastAssistant.content
      : "warming up the interviewer…";
  const verdict = lastAssistant ? parseVerdict(lastAssistant.content) : null;
  const thinking = phase === "loading" || phase === "interviewer";

  /* ---- ending overlay ---- */
  if (phase === "ending" && timeUp) {
    return <InterviewCompleteOverlay />;
  }
  if (phase === "ending") {
    return (
      <div className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-bg px-6">
        <div className="w-full max-w-md">
          <TerminalWindow title="generating">
            <div className="text-[13px]">
              <div className="mb-3 text-muted">
                <span className="text-accent2">❯</span> groq is grading your
                code
                <span className="dot-flash">.</span>
                <span className="dot-flash">.</span>
                <span className="dot-flash">.</span>
              </div>
              <div className="mb-4 leading-relaxed text-dim">
                building your debrief — per-problem correctness, complexity, and
                what to drill next. this usually takes 10&ndash;20 seconds.
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
      {keyFlash && <KeyQuestionFlash />}

      <EndInterviewDialog
        open={showEndDialog}
        onConfirm={endInterview}
        onCancel={() => setShowEndDialog(false)}
      />

      {/* top bar */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="min-w-0 truncate text-[12.5px] text-muted">
          ~/dsa <span className="text-dim">·</span>{" "}
          <span className="text-accent2">{difficultyLabel}</span>{" "}
          <span className="text-dim">·</span> {langMeta?.label ?? language}
        </div>
        <Timer
          durationMinutes={durationMinutes}
          onTick={setRemaining}
          onComplete={handleTimeUp}
        />
        <AsciiButton
          variant="danger"
          sound="danger"
          onClick={() => setShowEndDialog(true)}
        >
          end_interview
        </AsciiButton>
      </div>

      {/* split */}
      <div className="mx-auto grid w-full max-w-shell flex-1 grid-cols-1 gap-7 px-5 py-7 lg:grid-cols-[45%_55%]">
        {/* LEFT — problem + feedback */}
        <div className="flex min-h-0 flex-col">
          <div className="mb-3 flex items-center justify-between">
            <Prompt accent="muted">problem</Prompt>
            <span className="font-mono text-[12px] text-dim">
              {thinking ? (
                <span>
                  {"[ thinking "}
                  <span className="dot-flash">·</span>
                  <span className="dot-flash">·</span>
                  <span className="dot-flash">·</span>
                  {" ]"}
                </span>
              ) : (
                `problem ${Math.max(1, problemNum)}`
              )}
            </span>
          </div>

          {verdict && !streamingText && (
            <div className="mb-3">
              <VerdictChip verdict={verdict} />
            </div>
          )}

          <TerminalWindow title="prompt" bodyClassName="p-5">
            <pre className="whitespace-pre-wrap break-words font-mono text-[13.5px] leading-relaxed text-paper">
              {currentText}
              {streamingText && <span className="cursor" />}
            </pre>
          </TerminalWindow>

          {error && (
            <div className="mt-5 border border-danger bg-surface px-4 py-3 text-[13px]">
              <div className="mb-2 text-danger">❯ error: {error}</div>
              <AsciiButton sound="secondary" onClick={handleRetry}>
                retry
              </AsciiButton>
            </div>
          )}

          {phase === "complete" && !error && (
            <div className="mt-5">
              <TerminalWindow title="complete">
                <div className="text-[13px]">
                  <div className="mb-1 text-accent">✓ interview complete</div>
                  <div className="mb-4 leading-relaxed text-muted">
                    nice work. ready to see your coding debrief?
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

          {/* transcript log */}
          <div className="mt-5 min-h-0 flex-1">
            <div className="mb-2 text-[12px] text-dim">❯ session log</div>
            <div className="max-h-[280px] space-y-3 overflow-y-auto pr-1">
              {messages.map((m, i) => (
                <div key={i} className="text-[12.5px]">
                  {m.role === "assistant" ? (
                    <div className="border-l-2 border-border pl-3 text-muted">
                      <span className="text-accent2">interviewer</span>
                      <pre className="mt-1 whitespace-pre-wrap break-words font-mono leading-relaxed text-paper">
                        {m.content}
                      </pre>
                    </div>
                  ) : (
                    <div className="border-l-2 border-accent/40 pl-3">
                      <span className="text-accent">you</span>
                      <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-surface p-2 font-mono text-[12px] leading-relaxed text-paper">
                        {m.content}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>

        {/* RIGHT — code editor */}
        <div className="flex min-h-0 flex-col">
          <div className="mb-3 flex items-center justify-between">
            <Prompt accent="muted">code</Prompt>
            <span className="font-mono text-[12px] text-dim">
              {phase === "awaiting-user"
                ? "your turn — write & submit"
                : phase === "complete"
                  ? "interview complete"
                  : "waiting for the interviewer…"}
            </span>
          </div>

          <CodeEditor
            value={code}
            onChange={setCode}
            disabled={phase !== "awaiting-user"}
            languageLabel={langMeta?.label ?? language}
          />

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <AsciiButton
              sound="success"
              onClick={submitCode}
              disabled={phase !== "awaiting-user" || code.trim().length === 0}
            >
              run check <span className="btn-ret">▶</span>
            </AsciiButton>
            <button
              type="button"
              onClick={() => setCode(starterCode(language))}
              disabled={phase !== "awaiting-user"}
              className="border border-border px-3 py-1.5 font-mono text-[12px] text-muted transition-colors hover:border-muted hover:text-paper disabled:cursor-not-allowed disabled:opacity-40"
            >
              reset
            </button>
            <span className="font-mono text-[11px] text-dim">
              the AI reviews correctness, edge cases &amp; complexity
            </span>
          </div>

          {/* clarifying question */}
          <div className="mt-4">
            <div className="mb-1 text-[12px] text-dim">
              ❯ ask a clarifying question (optional)
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={clarify}
                onChange={(e) => setClarify(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitClarify();
                }}
                disabled={phase !== "awaiting-user"}
                placeholder="e.g. can the array contain negatives?"
                className="flex-1 border border-border bg-surface px-3 py-1.5 font-mono text-[12.5px] text-paper outline-none focus:border-accent2 disabled:opacity-40"
              />
              <AsciiButton
                sound="secondary"
                onClick={submitClarify}
                disabled={phase !== "awaiting-user" || clarify.trim().length === 0}
              >
                ask
              </AsciiButton>
            </div>
          </div>
        </div>
      </div>

      <StatusBar
        left={
          <>
            <span className="text-dim">❯ session:</span> {sessionId.slice(0, 8)}
            <span className="px-2 text-dim">·</span>dsa
            <span className="px-2 text-dim">·</span>problem{" "}
            {Math.max(1, problemNum)}/{targetProblems}
          </>
        }
        right={
          <>
            {`${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(
              remaining % 60,
            ).padStart(2, "0")}`}{" "}
            remaining
            <span className="px-2 text-dim">·</span>
            <span className="pulse-dot" /> connected
          </>
        }
      />
    </div>
  );
}
