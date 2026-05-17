"use client";

import { useEffect, useRef, useState } from "react";

/* ============================================================ *
 * LiveCounter — animates a number counting up to `target` on
 * mount using an easeOutQuart curve over ~1.4 s.
 * ============================================================ */

interface LiveCounterProps {
  target: number;
  className?: string;
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export default function LiveCounter({ target, className }: LiveCounterProps) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const duration = 1400;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);
      setCount(Math.round(eased * target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target]);

  return (
    <span className={`font-mono text-paper${className ? ` ${className}` : ""}`}>
      {count.toLocaleString()}
    </span>
  );
}
