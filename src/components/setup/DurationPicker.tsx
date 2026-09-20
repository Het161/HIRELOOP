"use client";

import { playClick } from "@/lib/sounds";

interface DurationPickerProps {
  /** Current value in minutes, or null when nothing is chosen yet. */
  selected: number | null;
  onSelect: (minutes: number) => void;
}

const PRESETS = [5, 10, 15, 20, 30, 45];
const MIN = 1;
const MAX = 60;

export default function DurationPicker({
  selected,
  onSelect,
}: DurationPickerProps) {
  const isPreset = selected !== null && PRESETS.includes(selected);

  function commit(raw: number) {
    if (!Number.isFinite(raw)) return;
    const clamped = Math.min(MAX, Math.max(MIN, Math.round(raw)));
    onSelect(clamped);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {PRESETS.map((mins) => {
          const active = selected === mins;
          return (
            <button
              key={mins}
              type="button"
              aria-pressed={active}
              onClick={() => {
                playClick("toggle");
                onSelect(mins);
              }}
              className={[
                "border px-4 py-2 font-mono text-[13px] transition-colors",
                active
                  ? "border-accent2 text-accent2"
                  : "border-border text-muted hover:border-muted hover:text-paper",
              ].join(" ")}
            >
              {mins} min
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 font-mono text-[12.5px] text-muted">
        <span className="text-dim">❯ or type a custom length:</span>
        <input
          type="number"
          min={MIN}
          max={MAX}
          inputMode="numeric"
          value={selected !== null && !isPreset ? selected : ""}
          placeholder="—"
          onChange={(e) => {
            const v = Number(e.target.value);
            if (e.target.value === "") return;
            commit(v);
          }}
          className="w-20 border border-border bg-surface px-2 py-1.5 text-center text-paper outline-none focus:border-accent2"
          aria-label="Custom interview length in minutes"
        />
        <span className="text-dim">minutes (1–60)</span>
      </div>
    </div>
  );
}
