"use client";

import TerminalWindow from "@/components/shared/TerminalWindow";
import { DSA_DIFFICULTIES } from "@/lib/dsa";
import { playClick } from "@/lib/sounds";
import type { DsaDifficulty } from "@/types";

interface DsaDifficultyPickerProps {
  selected: DsaDifficulty | null;
  onSelect: (d: DsaDifficulty) => void;
}

export default function DsaDifficultyPicker({
  selected,
  onSelect,
}: DsaDifficultyPickerProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {DSA_DIFFICULTIES.map(({ value, title, blurb }) => {
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
                  <span className="text-accent2">[✓]</span>
                ) : undefined
              }
              className={isSelected ? "border-accent2" : undefined}
              bodyClassName="px-4 py-4"
            >
              <div className="font-mono text-[12px] leading-relaxed text-muted">
                {blurb}
              </div>
            </TerminalWindow>
          </button>
        );
      })}
    </div>
  );
}
