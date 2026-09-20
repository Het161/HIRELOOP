"use client";

import { CODE_LANGUAGES } from "@/lib/dsa";
import { playClick } from "@/lib/sounds";
import type { CodeLanguage } from "@/types";

interface LanguagePickerProps {
  selected: CodeLanguage | null;
  onSelect: (l: CodeLanguage) => void;
}

export default function LanguagePicker({
  selected,
  onSelect,
}: LanguagePickerProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {CODE_LANGUAGES.map(({ value, label }) => {
        const active = selected === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => {
              playClick("toggle");
              onSelect(value);
            }}
            className={[
              "border px-4 py-2 font-mono text-[13px] transition-colors",
              active
                ? "border-accent2 text-accent2"
                : "border-border text-muted hover:border-muted hover:text-paper",
            ].join(" ")}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
