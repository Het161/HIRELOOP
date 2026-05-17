"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AsciiButton from "@/components/shared/AsciiButton";

/* ============================================================ *
 * HeroHeadline — types out "Ready when you are" then appends
 * a terracotta "?" and a blinking cursor. Enter key navigates
 * to /setup.
 * ============================================================ */

export default function HeroHeadline() {
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);
  const fullText = "Ready when you are";
  const indexRef = useRef(0);

  useEffect(() => {
    const delay = setTimeout(() => {
      function tick() {
        if (indexRef.current < fullText.length) {
          indexRef.current += 1;
          setTyped(fullText.slice(0, indexRef.current));
          setTimeout(tick, 52);
        } else {
          setDone(true);
        }
      }
      tick();
    }, 380);
    return () => clearTimeout(delay);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === "Enter" && tag !== "INPUT" && tag !== "TEXTAREA") {
        router.push("/setup");
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [router]);

  return (
    <>
      <h1
        className="font-mono font-medium tracking-tight"
        style={{ fontSize: "clamp(52px, 8vw, 96px)", lineHeight: 1.04 }}
      >
        {typed}
        {done && (
          <span className="text-accent2">?</span>
        )}
        <span className="cursor" aria-hidden="true" />
      </h1>

      <p className="mt-8 max-w-[640px] text-[14.5px] leading-relaxed text-muted">
        &gt; A senior engineer is waiting on the other end. So is an honest
        scoring system. Pick a role, pick a mode, press start.
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-5">
        <AsciiButton onClick={() => router.push("/setup")}>
          press enter to start <span className="btn-ret">↵</span>
        </AsciiButton>
        <span className="hidden text-[13px] text-dim sm:inline">
          or try one of these →
        </span>
      </div>
    </>
  );
}
