"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/types";

interface TranscriptViewProps {
  messages: Message[];
  streamingText?: string;
}

function strip(text: string): string {
  return text.replaceAll("[INTERVIEW_COMPLETE]", "");
}

function clock(timestamp: number): string {
  const d = new Date(timestamp);
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

export default function TranscriptView({
  messages,
  streamingText,
}: TranscriptViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const streaming = streamingText && streamingText.trim().length > 0;
  const hasContent = messages.length > 0 || streaming;

  return (
    <div className="border border-border bg-surface">
      <div
        className="overflow-y-auto px-4 py-4 text-[13px]"
        style={{ maxHeight: "46vh", minHeight: "260px" }}
      >
        {!hasContent && (
          <div className="text-dim">— transcript will appear here —</div>
        )}

        {messages.map((msg, i) => {
          const interviewer = msg.role === "assistant";
          return (
            <div key={i} className="msg-in mb-3 leading-relaxed">
              <span className="text-dim">[{clock(msg.timestamp)}]</span>{" "}
              <span
                className="inline-block text-muted"
                style={{ width: "11ch" }}
              >
                {interviewer ? "interviewer" : "you"}
              </span>{" "}
              <span className={interviewer ? "text-accent2" : "text-accent"}>
                ❯
              </span>{" "}
              <span className="text-paper">{strip(msg.content)}</span>
            </div>
          );
        })}

        {streaming && (
          <div className="mb-3 leading-relaxed">
            <span className="text-dim">[{clock(Date.now())}]</span>{" "}
            <span
              className="inline-block text-muted"
              style={{ width: "11ch" }}
            >
              interviewer
            </span>{" "}
            <span className="text-accent2">❯</span>{" "}
            <span className="text-paper">{strip(streamingText ?? "")}</span>
            <span className="cursor" />
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
