"use client";

import TerminalWindow from "@/components/shared/TerminalWindow";
import { playClick } from "@/lib/sounds";
import type { InterviewType } from "@/types";

interface InterviewTypePickerProps {
  selected: InterviewType | null;
  onSelect: (t: InterviewType) => void;
}

interface TypeMeta {
  value: InterviewType;
  title: string;
  line: string;
  blurb: string;
}

const TYPES: TypeMeta[] = [
  {
    value: "role",
    title: "role-based",
    line: "behavioral + technical Q&A",
    blurb:
      "pick a role and seniority — the AI asks adaptive spoken/written questions.",
  },
  {
    value: "dsa",
    title: "dsa / coding",
    line: "live code editor + review",
    blurb:
      "solve DSA problems at a chosen difficulty. write code, submit, get it checked.",
  },
];

export default function InterviewTypePicker({
  selected,
  onSelect,
}: InterviewTypePickerProps) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {TYPES.map(({ value, title, line, blurb }) => {
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
              <div className="mb-2 font-mono text-[13.5px] text-paper">
                {line}
              </div>
              <div className="font-mono text-[12.5px] leading-relaxed text-muted">
                {blurb}
              </div>
            </TerminalWindow>
          </button>
        );
      })}
    </div>
  );
}
