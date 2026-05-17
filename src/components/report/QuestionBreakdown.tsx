"use client";

/* ============================================================ *
 * QuestionBreakdown — terminal-style per-question cards.
 * Each card: TerminalWindow with Q01 title + colored score.
 * Expand/collapse your-answer + feedback always visible.
 * [▸ show model answer] toggle preserved exactly.
 * ============================================================ */

import { useState } from "react";
import TerminalWindow from "@/components/shared/TerminalWindow";
import type { QuestionBreakdown as QB } from "@/types";

interface QuestionBreakdownProps {
  items: QB[];
}

interface CardProps {
  item: QB;
  index: number;
}

function questionScoreColor(score: number): string {
  if (score >= 8) return "text-accent";
  if (score >= 6) return "text-paper";
  return "text-accent2";
}

function QuestionCard({ item, index }: CardProps) {
  const [showModel, setShowModel] = useState(false);

  const qLabel = `Q${String(index + 1).padStart(2, "0")}`;
  const scoreColor = questionScoreColor(item.score);

  return (
    <TerminalWindow
      title={qLabel}
      titleRight={
        <span className={`font-mono text-[12px] ${scoreColor}`}>
          score: {item.score}/10
        </span>
      }
    >
      <div className="text-[13px] leading-relaxed">
        {/* Question */}
        <div className="mb-3 text-accent2">
          ❯ &ldquo;{item.question}&rdquo;
        </div>

        {/* Your answer */}
        <div className="mb-0.5 text-dim">your answer:</div>
        <div className="mb-3 pl-3 text-muted">{item.yourAnswer}</div>

        {/* Feedback */}
        <div className="mb-0.5 text-dim">feedback:</div>
        <div className="mb-3 pl-3 text-paper">{item.feedback}</div>

        {/* Model answer toggle */}
        <button
          type="button"
          onClick={() => setShowModel((v) => !v)}
          className="text-[12.5px] text-accent2 transition-colors hover:text-paper"
        >
          {showModel ? "[▾ hide model answer]" : "[▸ show model answer]"}
        </button>

        {showModel && (
          <div className="mt-3 border-l border-border pl-3">
            <div className="mb-0.5 text-dim">model answer:</div>
            <div className="text-muted">{item.modelAnswer}</div>
          </div>
        )}
      </div>
    </TerminalWindow>
  );
}

export function QuestionBreakdown({ items }: QuestionBreakdownProps) {
  if (!items.length) return null;

  return (
    <div>
      <div className="mb-6 text-[14px]">
        <span className="text-dim">## </span>
        <span className="font-medium">question-by-question</span>
      </div>
      <div className="space-y-4">
        {items.map((item, i) => (
          <QuestionCard key={item.questionIndex} item={item} index={i} />
        ))}
      </div>
    </div>
  );
}

export default QuestionBreakdown;
