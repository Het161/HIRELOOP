"use client";

import TerminalWindow from "@/components/shared/TerminalWindow";
import { playClick } from "@/lib/sounds";
import type { Seniority } from "@/types";

interface DifficultyPickerProps {
  selected: Seniority | null;
  onSelect: (s: Seniority) => void;
}

interface Level {
  value: Seniority;
  title: string;
  line: string;
  focus: string;
}

const LEVELS: Level[] = [
  {
    value: "junior",
    title: "junior",
    line: "0–2 years experience",
    focus: "fundamentals, syntax, core patterns, and how fast you learn.",
  },
  {
    value: "mid",
    title: "mid",
    line: "3–5 years experience",
    focus: "applied scenarios, real trade-offs, and how you reason on the job.",
  },
  {
    value: "senior",
    title: "senior",
    line: "6+ years experience",
    focus: "architecture, scale, leadership, and the hard calls under ambiguity.",
  },
];

export default function DifficultyPicker({ selected, onSelect }: DifficultyPickerProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {LEVELS.map(({ value, title, line, focus }) => {
        const isSelected = selected === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => {
              playClick("toggle");
              onSelect(value);
            }}
            aria-pressed={isSelected}
            className="text-left focus-visible:outline-none"
          >
            <TerminalWindow
              title={title}
              titleRight={
                isSelected ? (
                  <span className="text-accent2">[selected]</span>
                ) : undefined
              }
              className={isSelected ? "border-accent2" : undefined}
              bodyClassName="px-5 py-5"
            >
              <div className="text-paper text-[13.5px] font-mono mb-2">{line}</div>
              <div className="text-muted text-[12.5px] font-mono leading-relaxed">
                focus: {focus}
              </div>
            </TerminalWindow>
          </button>
        );
      })}
    </div>
  );
}
