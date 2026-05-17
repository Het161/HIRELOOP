"use client";

/* ============================================================ *
 * ScoreRadial — animated count-up number (0 → score) on mount.
 * Repurposed from SVG radial to terminal big-number display.
 * ============================================================ */

import { useEffect, useState } from "react";

interface ScoreRadialProps {
  score: number;
}

function scoreColor(score: number): string {
  if (score >= 75) return "text-accent";
  if (score >= 50) return "text-accent2";
  return "text-danger";
}

export function ScoreRadial({ score: rawScore }: ScoreRadialProps) {
  const target = Math.min(100, Math.max(0, rawScore));
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    let current = 0;
    const handle = setInterval(() => {
      current += 3;
      if (current >= target) {
        setDisplayed(target);
        clearInterval(handle);
      } else {
        setDisplayed(current);
      }
    }, 24);
    return () => clearInterval(handle);
  }, [target]);

  return (
    <span
      className={`font-mono font-medium leading-none ${scoreColor(target)}`}
      style={{ fontSize: "clamp(78px, 15vw, 128px)" }}
      aria-label={`Overall score: ${target} out of 100`}
    >
      {displayed}
    </span>
  );
}

export default ScoreRadial;
