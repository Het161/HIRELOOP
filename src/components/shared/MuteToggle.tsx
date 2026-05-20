"use client";

import { useEffect } from "react";
import { useMute } from "@/hooks/useClickSound";
import { playClick, preloadSounds } from "@/lib/sounds";

/**
 * MuteToggle — terminal-style speaker icon in the navbar. Persists
 * to localStorage as `hireloop_sound_muted`. Mounting it also
 * preloads every variant so the first click is instant.
 */
export default function MuteToggle() {
  const { muted, toggle } = useMute();

  useEffect(() => {
    preloadSounds();
  }, []);

  function handleClick() {
    // If we're about to unmute, play a confirmation tick after the state
    // flips so the user hears the change. If we're muting, no sound (it'd
    // be cut off anyway).
    const willUnmute = muted;
    toggle();
    if (willUnmute) {
      // Defer so the new mute state is in effect.
      setTimeout(() => playClick("toggle"), 0);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={muted ? "Unmute click sounds" : "Mute click sounds"}
      aria-pressed={muted}
      title={muted ? "sounds: muted" : "sounds: on"}
      className="text-muted transition-colors hover:text-paper"
    >
      [ {muted ? "🔇" : "🔊"} ]
    </button>
  );
}
