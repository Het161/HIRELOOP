/* ============================================================ *
 * sounds — per-variant terminal click effects.
 *
 * Seven distinct click sounds, one for each interaction category.
 * Real MP3 files are preferred (drop them in /public/sounds/ —
 * see SOUNDS below for filenames). When the file is missing or
 * still loading, we synthesize the click on the fly via Web
 * Audio so the site never goes silent.
 *
 * Mute state is persisted to localStorage under
 * `hireloop_sound_muted`. The store exposes a small subscribe
 * API so React components can sync via useSyncExternalStore.
 * ============================================================ */

export type SoundVariant =
  | "primary"
  | "secondary"
  | "nav"
  | "toggle"
  | "success"
  | "danger"
  | "soft";

export const SOUNDS: Record<SoundVariant, string> = {
  primary: "/sounds/click-primary.mp3",
  secondary: "/sounds/click-secondary.mp3",
  nav: "/sounds/click-nav.mp3",
  toggle: "/sounds/click-toggle.mp3",
  success: "/sounds/click-success.mp3",
  danger: "/sounds/click-danger.mp3",
  soft: "/sounds/click-soft.mp3",
};

/** Default volume per variant (0..1). Tuned to balance the synth tones. */
export const DEFAULT_VOLUMES: Record<SoundVariant, number> = {
  primary: 0.5,
  secondary: 0.5,
  nav: 0.4,
  toggle: 0.4,
  success: 0.55,
  danger: 0.6,
  soft: 0.3,
};

/* ----------------------- Web Audio context ---------------------- */

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

/* ----------------------- MP3 buffer cache ----------------------- */

const buffers = new Map<SoundVariant, AudioBuffer | null>();
const loading = new Map<SoundVariant, Promise<AudioBuffer | null>>();

/**
 * Real MP3 samples are optional and none ship with the repo, so the
 * fetch is opt-in: without this flag every page load fired seven 404s
 * before falling back to the synth. Set NEXT_PUBLIC_SOUND_SAMPLES=true
 * once files are in /public/sounds (see the README there).
 */
const SAMPLES_ENABLED = process.env.NEXT_PUBLIC_SOUND_SAMPLES === "true";

async function loadBuffer(variant: SoundVariant): Promise<AudioBuffer | null> {
  if (!SAMPLES_ENABLED) return null;
  if (buffers.has(variant)) return buffers.get(variant) ?? null;
  if (loading.has(variant)) return loading.get(variant)!;
  const audio = getContext();
  if (!audio) return null;
  const url = SOUNDS[variant];
  const task = fetch(url)
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.arrayBuffer();
      return audio.decodeAudioData(data);
    })
    .then((buf) => {
      buffers.set(variant, buf);
      return buf;
    })
    .catch(() => {
      // Missing or corrupt file → mark as null so the synth fallback kicks in.
      buffers.set(variant, null);
      return null;
    })
    .finally(() => {
      loading.delete(variant);
    });
  loading.set(variant, task);
  return task;
}

/** Preload every variant — called once on app mount. */
export function preloadSounds(): void {
  if (typeof window === "undefined") return;
  (Object.keys(SOUNDS) as SoundVariant[]).forEach((v) => {
    loadBuffer(v).catch(() => {});
  });
}

/* ------------------------ synth fallbacks ----------------------- */

interface SynthSpec {
  /** OscillatorType for the body. */
  type: OscillatorType;
  /** Start frequency in Hz. */
  freqStart: number;
  /** End frequency in Hz — exponential ramp. */
  freqEnd: number;
  /** Duration in seconds. */
  duration: number;
  /** High-pass cutoff so the click doesn't sound boomy. */
  highpass: number;
  /** Peak gain (multiplied by volume). */
  peak: number;
  /** Optional second oscillator delayed for chord-like clicks. */
  second?: { freqStart: number; freqEnd: number; delay: number };
}

const SYNTH: Record<SoundVariant, SynthSpec> = {
  // Bright two-note ascending blip — feels like "go".
  primary: {
    type: "square",
    freqStart: 880,
    freqEnd: 1320,
    duration: 0.09,
    highpass: 500,
    peak: 0.18,
    second: { freqStart: 1320, freqEnd: 1760, delay: 0.045 },
  },
  // Crisp single tick — the workhorse click.
  secondary: {
    type: "square",
    freqStart: 1700,
    freqEnd: 900,
    duration: 0.06,
    highpass: 600,
    peak: 0.16,
  },
  // Soft, airy high tick for navigation.
  nav: {
    type: "triangle",
    freqStart: 2200,
    freqEnd: 1600,
    duration: 0.045,
    highpass: 900,
    peak: 0.12,
  },
  // Mid "tock" with descending pitch — selection/toggle feel.
  toggle: {
    type: "square",
    freqStart: 1100,
    freqEnd: 700,
    duration: 0.07,
    highpass: 400,
    peak: 0.18,
  },
  // Two-note ascending chime — confirmation.
  success: {
    type: "triangle",
    freqStart: 740,
    freqEnd: 740,
    duration: 0.13,
    highpass: 300,
    peak: 0.18,
    second: { freqStart: 988, freqEnd: 988, delay: 0.07 },
  },
  // Low descending bonk — destructive warning.
  danger: {
    type: "sawtooth",
    freqStart: 420,
    freqEnd: 180,
    duration: 0.13,
    highpass: 120,
    peak: 0.22,
  },
  // Whisper-quiet high tick for icons / close.
  soft: {
    type: "sine",
    freqStart: 2600,
    freqEnd: 2100,
    duration: 0.035,
    highpass: 1200,
    peak: 0.09,
  },
};

function playOneOsc(
  audio: AudioContext,
  destination: AudioNode,
  startTime: number,
  spec: SynthSpec,
  volume: number,
  freqStart: number,
  freqEnd: number,
) {
  const osc = audio.createOscillator();
  osc.type = spec.type;
  osc.frequency.setValueAtTime(freqStart, startTime);
  osc.frequency.exponentialRampToValueAtTime(
    Math.max(50, freqEnd),
    startTime + spec.duration,
  );

  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(
    Math.max(0.0002, spec.peak * volume),
    startTime + Math.min(0.01, spec.duration * 0.2),
  );
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + spec.duration);

  osc.connect(gain).connect(destination);
  osc.start(startTime);
  osc.stop(startTime + spec.duration + 0.02);
}

function playSynth(variant: SoundVariant, volume: number): void {
  const audio = getContext();
  if (!audio) return;
  if (audio.state === "suspended") audio.resume().catch(() => {});
  const spec = SYNTH[variant];
  const now = audio.currentTime;

  const filter = audio.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = spec.highpass;
  filter.connect(audio.destination);

  playOneOsc(audio, filter, now, spec, volume, spec.freqStart, spec.freqEnd);
  if (spec.second) {
    playOneOsc(
      audio,
      filter,
      now + spec.second.delay,
      spec,
      volume,
      spec.second.freqStart,
      spec.second.freqEnd,
    );
  }
}

function playSample(variant: SoundVariant, volume: number): boolean {
  const audio = getContext();
  if (!audio) return false;
  const buf = buffers.get(variant);
  if (!buf) return false;
  if (audio.state === "suspended") audio.resume().catch(() => {});
  const source = audio.createBufferSource();
  source.buffer = buf;
  const gain = audio.createGain();
  gain.gain.value = Math.min(1, Math.max(0, volume));
  source.connect(gain).connect(audio.destination);
  source.start(0);
  return true;
}

/* ------------------------ mute store ------------------------ */

const MUTE_KEY = "hireloop_sound_muted";

function readMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

const muteListeners = new Set<() => void>();

let mutedCache = readMuted();

export function isMuted(): boolean {
  return mutedCache;
}

export function setMuted(next: boolean): void {
  mutedCache = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
    } catch {
      /* ignore quota / privacy errors */
    }
  }
  muteListeners.forEach((cb) => cb());
}

export function toggleMuted(): void {
  setMuted(!mutedCache);
}

export function subscribeMuted(cb: () => void): () => void {
  muteListeners.add(cb);
  return () => muteListeners.delete(cb);
}

/* ------------------------ public play API ------------------------ */

/**
 * Play the click sound for a variant. Honors mute state. Prefers a
 * preloaded MP3 sample; falls back to the per-variant synthesizer if
 * the sample isn't loaded (or doesn't exist on disk).
 */
export function playClick(variant: SoundVariant = "soft"): void {
  if (typeof window === "undefined") return;
  if (mutedCache) return;
  const volume = DEFAULT_VOLUMES[variant];
  if (!playSample(variant, volume)) {
    playSynth(variant, volume);
    // Kick off a load so future plays can use the real file once it lands.
    loadBuffer(variant).catch(() => {});
  }
}
