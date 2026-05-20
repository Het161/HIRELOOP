/* ============================================================ *
 * sounds — tiny Web-Audio click for terminal buttons.
 * No external assets; the click is synthesized on the fly so it
 * stays in keeping with the phosphor-terminal aesthetic.
 * ============================================================ */

type WindowWithWebkit = typeof window & {
  webkitAudioContext?: typeof AudioContext;
};

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const w = window as WindowWithWebkit;
  const Ctor = window.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    ctx = null;
  }
  return ctx;
}

/**
 * Play a short, soft click — a quick high-pitch tick filtered to feel like
 * a mechanical-keyboard tap rather than a synth beep.
 */
export function playClick(): void {
  const audio = getContext();
  if (!audio) return;
  if (audio.state === "suspended") {
    audio.resume().catch(() => {});
  }

  const now = audio.currentTime;

  // Tonal body — a brief sine pop.
  const osc = audio.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(1800, now);
  osc.frequency.exponentialRampToValueAtTime(900, now + 0.04);

  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

  // High-pass filter so it sounds tight rather than boomy.
  const filter = audio.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 600;

  osc.connect(filter).connect(gain).connect(audio.destination);
  osc.start(now);
  osc.stop(now + 0.07);
}
