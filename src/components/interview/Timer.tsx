"use client";

import { useEffect, useRef, useState } from "react";

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface TimerProps {
  /** Total interview length in minutes. */
  durationMinutes?: number;
  onTick?: (remaining: number) => void;
  /** Fired exactly once when the countdown reaches zero. */
  onComplete?: () => void;
}

export default function Timer({
  durationMinutes = 30,
  onTick,
  onComplete,
}: TimerProps) {
  const total = Math.max(1, Math.round(durationMinutes)) * 60;
  const [remaining, setRemaining] = useState(total);
  const firedRef = useRef(false);

  useEffect(() => {
    if (remaining <= 0) {
      if (!firedRef.current) {
        firedRef.current = true;
        onComplete?.();
      }
      return;
    }
    const id = setInterval(() => {
      setRemaining((prev) => {
        const next = Math.max(0, prev - 1);
        onTick?.(next);
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [remaining, onTick, onComplete]);

  const isLow = remaining < 60 || remaining < total * 0.15;

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
