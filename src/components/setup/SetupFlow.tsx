"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import InterviewTypePicker from "./InterviewTypePicker";
import RoleSelector from "./RoleSelector";
import DifficultyPicker from "./DifficultyPicker";
import DsaDifficultyPicker from "./DsaDifficultyPicker";
import LanguagePicker from "./LanguagePicker";
import DurationPicker from "./DurationPicker";
import ModeToggle from "./ModeToggle";
import TerminalWindow from "@/components/shared/TerminalWindow";
import AsciiButton from "@/components/shared/AsciiButton";
import { getRole } from "@/lib/roles";
import type {
  CodeLanguage,
  DsaDifficulty,
  InterviewMode,
  InterviewType,
  Seniority,
  StartInterviewResponse,
} from "@/types";

interface SetupFlowProps {
  initialRoleId?: string;
  /** Whether TAVUS_API_KEY is configured — enables video mode. */
  tavusAvailable: boolean;
}

/** Step marker — terracotta [●] when done, dim [○] when pending. */
function Marker({ done }: { done: boolean }) {
  return done ? (
    <span className="text-accent2">[●]</span>
  ) : (
    <span className="text-dim">[○]</span>
  );
}

export default function SetupFlow({
  initialRoleId,
  tavusAvailable,
}: SetupFlowProps) {
  const router = useRouter();

  const resolvedInitialRole =
    initialRoleId && getRole(initialRoleId) ? initialRoleId : null;

  const [interviewType, setInterviewType] = useState<InterviewType | null>(
    resolvedInitialRole ? "role" : null,
  );
  const [roleId, setRoleId] = useState<string | null>(resolvedInitialRole);
  const [query, setQuery] = useState("");
  const [seniority, setSeniority] = useState<Seniority | null>(null);
  const [difficulty, setDifficulty] = useState<DsaDifficulty | null>(null);
  const [language, setLanguage] = useState<CodeLanguage | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [mode, setMode] = useState<InterviewMode | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDsa = interviewType === "dsa";
  const isRole = interviewType === "role";
  const selectedRole = roleId ? getRole(roleId) : null;

  const ready = isDsa
    ? difficulty !== null && language !== null && duration !== null
    : isRole
      ? roleId !== null &&
        seniority !== null &&
        duration !== null &&
        mode !== null
      : false;

  // The "voice" value is shown to the candidate as "video".
  const modeLabel = mode === "voice" ? "video" : mode;

  async function handleContinue() {
    if (!ready || !interviewType || !duration) return;
    setSubmitting(true);
    setError(null);

    const payload = isDsa
      ? {
          interviewType,
          dsaDifficulty: difficulty,
          language,
          durationMinutes: duration,
          // Filler values the server ignores for DSA.
          roleId: "dsa",
          seniority: "mid",
          mode: "text",
        }
      : {
          interviewType,
          roleId,
          seniority,
          mode,
          durationMinutes: duration,
        };

    try {
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `server error ${res.status}`);
      }

      const data = (await res.json()) as StartInterviewResponse;
      router.push(`/interview/${data.sessionId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "something went wrong — try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-bg">
      <main className="mx-auto max-w-shell px-5 pb-36 pt-10 sm:px-8">
        <div className="mb-2 text-[12.5px] text-dim">
          &gt; ./configure-interview --type --difficulty --mode
        </div>
        <h1 className="mb-9 text-[20px] font-medium">
          interview setup
          <span className="cursor" />
        </h1>

        {/* progress strip */}
        <div className="mb-12 flex flex-wrap items-center gap-x-1 gap-y-2 text-[12.5px]">
          <span>
            <Marker done={interviewType !== null} />{" "}
            <span className={interviewType ? "text-paper" : "text-dim"}>
              {interviewType ? `type: ${isDsa ? "dsa" : "role"}` : "type"}
            </span>
          </span>
          <span className="px-2 text-dim">──</span>
          {isDsa ? (
            <>
              <span>
                <Marker done={difficulty !== null} />{" "}
                <span className={difficulty ? "text-paper" : "text-dim"}>
                  {difficulty ? `level: ${difficulty}` : "level"}
                </span>
              </span>
              <span className="px-2 text-dim">──</span>
              <span>
                <Marker done={language !== null} />{" "}
                <span className={language ? "text-paper" : "text-dim"}>
                  {language ? `lang: ${language}` : "lang"}
                </span>
              </span>
            </>
          ) : (
            <>
              <span>
                <Marker done={roleId !== null} />{" "}
                <span className={roleId ? "text-paper" : "text-dim"}>
                  {roleId ? `role: ${roleId}` : "role"}
                </span>
              </span>
              <span className="px-2 text-dim">──</span>
              <span>
                <Marker done={seniority !== null} />{" "}
                <span className={seniority ? "text-paper" : "text-dim"}>
                  {seniority ? `seniority: ${seniority}` : "seniority"}
                </span>
              </span>
            </>
          )}
          <span className="px-2 text-dim">──</span>
          <span>
            <Marker done={duration !== null} />{" "}
            <span className={duration ? "text-paper" : "text-dim"}>
              {duration ? `length: ${duration}m` : "length"}
            </span>
          </span>
          {isRole && (
            <>
              <span className="px-2 text-dim">──</span>
              <span>
                <Marker done={mode !== null} />{" "}
                <span className={mode ? "text-paper" : "text-dim"}>
                  {mode ? `mode: ${modeLabel}` : "mode"}
                </span>
              </span>
            </>
          )}
        </div>

        {/* STEP 1 — interview type */}
        <section className="mb-14">
          <div className="mb-4 text-[14px]">
            <span className="text-accent2">01</span>{" "}
            <span className="text-muted">choose interview type</span>
          </div>
          <InterviewTypePicker
            selected={interviewType}
            onSelect={setInterviewType}
          />
        </section>

        {/* ROLE-BASED FLOW */}
        {isRole && (
          <>
            {/* STEP 2 — role */}
            <section className="mb-14">
              <div className="mb-4 text-[14px]">
                <span className="text-accent2">02</span>{" "}
                <span className="text-muted">select a role</span>
              </div>

              {selectedRole && (
                <div className="mb-5">
                  <TerminalWindow title="selected" bodyClassName="px-4 py-3">
                    <div className="text-[13px]">
                      <span className="text-accent">●</span>{" "}
                      <span className="text-paper">{selectedRole.id}.md</span>{" "}
                      <span className="text-dim">
                        →{" "}
                        {selectedRole.topics
                          .slice(0, 5)
                          .join(" · ")
                          .toLowerCase()}
                      </span>
                    </div>
                  </TerminalWindow>
                </div>
              )}

              <RoleSelector
                selectedId={roleId}
                onSelect={setRoleId}
                query={query}
                onQueryChange={setQuery}
              />
            </section>

            {/* STEP 3 — seniority */}
            <section className="mb-14">
              <div className="mb-6 text-[14px]">
                <span className="text-accent2">03</span>{" "}
                <span className="text-muted">select seniority</span>
              </div>
              <DifficultyPicker selected={seniority} onSelect={setSeniority} />
            </section>
          </>
        )}

        {/* DSA FLOW */}
        {isDsa && (
          <>
            {/* STEP 2 — difficulty */}
            <section className="mb-14">
              <div className="mb-6 text-[14px]">
                <span className="text-accent2">02</span>{" "}
                <span className="text-muted">select difficulty</span>
              </div>
              <DsaDifficultyPicker
                selected={difficulty}
                onSelect={setDifficulty}
              />
            </section>

            {/* STEP 3 — language */}
            <section className="mb-14">
              <div className="mb-6 text-[14px]">
                <span className="text-accent2">03</span>{" "}
                <span className="text-muted">select language</span>
              </div>
              <LanguagePicker selected={language} onSelect={setLanguage} />
            </section>
          </>
        )}

        {/* STEP 4 — duration (both flows) */}
        {interviewType && (
          <section className="mb-14">
            <div className="mb-6 text-[14px]">
              <span className="text-accent2">04</span>{" "}
              <span className="text-muted">how long should it run?</span>
            </div>
            <DurationPicker selected={duration} onSelect={setDuration} />
          </section>
        )}

        {/* STEP 5 — mode (role flow only) */}
        {isRole && (
          <section className="mb-6">
            <div className="mb-6 text-[14px]">
              <span className="text-accent2">05</span>{" "}
              <span className="text-muted">select interview mode</span>
            </div>
            <ModeToggle
              selected={mode}
              onSelect={setMode}
              tavusAvailable={tavusAvailable}
            />
          </section>
        )}
      </main>

      {/* sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface">
        <div className="mx-auto flex max-w-shell items-center justify-between gap-4 px-5 py-2.5 text-[12.5px] sm:px-8">
          <div className="min-w-0 truncate text-muted">
            type:{" "}
            {interviewType ? (
              <span className="text-paper">{isDsa ? "dsa" : "role"}</span>
            ) : (
              <span className="text-dim">—</span>
            )}
            {isDsa ? (
              <>
                <span className="px-2 text-dim">·</span>
                level:{" "}
                {difficulty ? (
                  <span className="text-paper">{difficulty}</span>
                ) : (
                  <span className="text-dim">—</span>
                )}
                <span className="px-2 text-dim">·</span>
                lang:{" "}
                {language ? (
                  <span className="text-paper">{language}</span>
                ) : (
                  <span className="text-dim">—</span>
                )}
              </>
            ) : (
              <>
                <span className="px-2 text-dim">·</span>
                role:{" "}
                {roleId ? (
                  <span className="text-paper">{roleId}</span>
                ) : (
                  <span className="text-dim">—</span>
                )}
                <span className="px-2 text-dim">·</span>
                seniority:{" "}
                {seniority ? (
                  <span className="text-paper">{seniority}</span>
                ) : (
                  <span className="text-dim">—</span>
                )}
              </>
            )}
            <span className="px-2 text-dim">·</span>
            length:{" "}
            {duration ? (
              <span className="text-paper">{duration}m</span>
            ) : (
              <span className="text-dim">—</span>
            )}
            {isRole && (
              <>
                <span className="px-2 text-dim">·</span>
                mode:{" "}
                {mode ? (
                  <span className="text-paper">{modeLabel}</span>
                ) : (
                  <span className="text-dim">—</span>
                )}
              </>
            )}
          </div>
          <div className="flex flex-none items-center gap-3">
            {error && (
              <span className="hidden max-w-[220px] truncate text-danger sm:inline">
                {error}
              </span>
            )}
            <AsciiButton
              sound="primary"
              onClick={handleContinue}
              disabled={!ready || submitting}
            >
              {submitting ? (
                "starting…"
              ) : (
                <>
                  continue <span className="btn-ret">→</span>
                </>
              )}
            </AsciiButton>
          </div>
        </div>
      </div>
    </div>
  );
}
