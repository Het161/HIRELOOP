"use client";

import { useEffect, useState } from "react";

interface WaveformProps {
  isSpeaking: boolean;
}

const BARS = 9;
const CHARS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
const IDLE: string[] = ["▁", "▂", "▁", "▁", "▂", "▁", "▁", "▂", "▁"];

function randomChar(): string {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

export default function Waveform({ isSpeaking }: WaveformProps) {
  const [bars, setBars] = useState<string[]>(IDLE);

  useEffect(() => {
    if (!isSpeaking) {
      setBars(IDLE);
      return;
    }
    const id = setInterval(() => {
      setBars(Array.from({ length: BARS }, randomChar));
    }, 130);
    return () => clearInterval(id);
  }, [isSpeaking]);

  return (
    <div className="flex items-end gap-[5px] text-accent font-mono leading-none" style={{ height: "34px", fontSize: "26px" }}>
      {bars.map((ch, i) => (
        <span key={i}>{ch}</span>
      ))}
    </div>
  );
}
