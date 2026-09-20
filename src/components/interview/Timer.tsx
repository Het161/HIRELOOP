"use client";

import { useEffect, useRef, useState } from "react";
import { INTERVIEW_SECONDS } from "@/lib/interview.config";

const TOTAL_SECONDS = INTERVIEW_SECONDS;

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

  // Keep the latest callback without restarting the interval.
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    // Count down against a fixed deadline rather than by decrementing —
    // a per-second interval drifts, and drifts badly once the tab is
    // backgrounded, which a 30-minute interview would show.
    const endsAt = Date.now() + TOTAL_SECONDS * 1000;

    const tick = () => {
      const next = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
      setRemaining(next);
      onTickRef.current?.(next);
      return next;
    };

    const id = setInterval(() => {
      if (tick() <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, []);

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
