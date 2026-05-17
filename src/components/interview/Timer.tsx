"use client";

import { useEffect, useState } from "react";

const TOTAL_SECONDS = 30 * 60; // 30 minutes

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface TimerProps {
  onTick?: (remaining: number) => void;
}

export default function Timer({ onTick }: TimerProps) {
  const [remaining, setRemaining] = useState(TOTAL_SECONDS);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining((prev) => {
        const next = Math.max(0, prev - 1);
        onTick?.(next);
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [remaining, onTick]);

  const isLow = remaining < 5 * 60;

  return (
    <span
      className={[
        "font-mono tabular-nums tracking-tight",
        "text-[20px] sm:text-[24px] font-medium",
        isLow ? "text-accent2" : "text-paper",
      ].join(" ")}
      aria-label={`${formatTime(remaining)} remaining`}
    >
      {formatTime(remaining)}
    </span>
  );
}
