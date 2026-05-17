"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/* ============================================================ *
 * RevealWrapper — fades + lifts its children into view the first
 * time they scroll onto the screen (via IntersectionObserver).
 * ============================================================ */

interface RevealWrapperProps {
  children: ReactNode;
  className?: string;
  /** Delay before the reveal animation starts, in milliseconds. */
  delay?: number;
}

export default function RevealWrapper({
  children,
  className,
  delay = 0,
}: RevealWrapperProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const timer = window.setTimeout(() => setShown(true), delay);
            observer.disconnect();
            return () => window.clearTimeout(timer);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`reveal ${shown ? "in" : ""}${className ? ` ${className}` : ""}`}
    >
      {children}
    </div>
  );
}
