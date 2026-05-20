"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  isMuted,
  playClick,
  setMuted,
  subscribeMuted,
  toggleMuted,
  type SoundVariant,
} from "@/lib/sounds";

/**
 * Returns a stable `play(variant?)` function. Honors mute state and
 * gracefully no-ops on the server / when audio is unavailable.
 */
export function useClickSound(): (variant?: SoundVariant) => void {
  return useCallback((variant: SoundVariant = "soft") => {
    playClick(variant);
  }, []);
}

/** Reactive mute state — re-renders subscribers on toggle. */
export function useMute(): {
  muted: boolean;
  setMuted: (next: boolean) => void;
  toggle: () => void;
} {
  const muted = useSyncExternalStore(
    subscribeMuted,
    () => isMuted(),
    () => false,
  );
  return { muted, setMuted, toggle: toggleMuted };
}
