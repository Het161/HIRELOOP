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

  // Keep the latest callbacks without restarting the interval.
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    // Count down against a fixed deadline rather than by decrementing —
    // a per-second interval drifts, and drifts badly once the tab is
    // backgrounded, which a 30-minute interview would show.
    firedRef.current = false;
    const endsAt = Date.now() + total * 1000;

    const tick = () => {
      const next = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
      setRemaining(next);
      onTickRef.current?.(next);
      if (next <= 0 && !firedRef.current) {
        firedRef.current = true;
        onCompleteRef.current?.();
      }
      return next;
    };

    const id = setInterval(() => {
      if (tick() <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [total]);

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
