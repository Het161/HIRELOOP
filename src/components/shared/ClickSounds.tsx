"use client";

import { useEffect } from "react";
import { playClick } from "@/lib/sounds";

/**
 * Global click-sound listener. Plays a soft terminal click whenever the user
 * presses a real button, link, or role="button" element. AsciiButton plays its
 * own click too — the WeakSet keeps us from doubling up on the same event.
 */
const seen = new WeakSet<Event>();

export default function ClickSounds() {
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (seen.has(e)) return;
      if (e.button !== 0) return;
      const target = e.target as Element | null;
      if (!target || typeof target.closest !== "function") return;
      const hit = target.closest(
        "button:not(:disabled), a[href], [role='button']:not([aria-disabled='true'])",
      );
      if (!hit) return;
      seen.add(e);
      playClick();
    }
    window.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, {
        capture: true,
      } as EventListenerOptions);
    };
  }, []);
  return null;
}
