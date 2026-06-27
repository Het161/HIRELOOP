import type { Seniority } from "@/types";
import { VOICE_PARAMS, getVoiceForSeniority } from "@/lib/voices";

/* ============================================================ *
 * SpeechService — voice I/O for the interview.
 *
 *  - Voice OUT  → Cartesia Sonic TTS (realistic, emotional voice),
 *                 with a browser SpeechSynthesis fallback.
 *  - Voice IN   → browser SpeechRecognition (free, English).
 *
 * Instantiate only in the browser.
 * ============================================================ */

/* ---- Minimal ambient typings for the Web Speech API --------------- *
 * SpeechRecognition is not in the standard TS DOM lib, so we declare
 * just enough of it here to stay fully typed (no `any`).             */

interface SpeechRecognitionAlternativeLike {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultLike {
  readonly length: number;
  readonly isFinal: boolean;
  item(index: number): SpeechRecognitionAlternativeLike;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  readonly length: number;
  item(index: number): SpeechRecognitionResultLike;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

const SILENCE_MS = 3000;

export class SpeechService {
  private readonly seniority: Seniority;

  /* speech recognition (voice IN) */
  private recognition: SpeechRecognitionLike | null = null;
  private listening = false;
  private finalTranscript = "";
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private finished = false;
  private onFinalCb: ((text: string) => void) | null = null;

  /* speech synthesis (voice OUT) */
  private speaking = false;
  private currentAudio: HTMLAudioElement | null = null;
  private speakResolve: (() => void) | null = null;

  constructor(seniority: Seniority) {
    this.seniority = seniority;
  }

  /* ---- Capability checks ----------------------------------------- */

  static isRecognitionSupported(): boolean {
    if (typeof window === "undefined") return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  static isSynthesisSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  get isListening(): boolean {
    return this.listening;
  }

  get isSpeaking(): boolean {
    return this.speaking;
  }

  /* ============================================================ *
   * Voice OUT — Cartesia TTS (with browser fallback).
   * ============================================================ */

  /**
   * Speak `text` aloud using Cartesia Sonic. Resolves when playback
   * finishes (or is cancelled). Falls back to the browser voice if the
   * Cartesia request fails for any reason.
   */
  async speak(text: string): Promise<void> {
    this.cancelSpeak();

    const clean = text
      .replace(/\[INTERVIEW_COMPLETE\]/g, "")
      .replace(/\[KEY\]/g, "")
      .trim();
    if (!clean) return;

    try {
      const voice = getVoiceForSeniority(this.seniority);
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: clean,
          voiceId: voice.id,
          speed: VOICE_PARAMS.speed,
          emotion: VOICE_PARAMS.emotion,
        }),
      });
      if (!res.ok) {
        throw new Error(`TTS request failed (${res.status})`);
      }
      const blob = await res.blob();
      if (blob.size === 0) {
        throw new Error("TTS returned empty audio");
      }
      await this.playBlob(blob);
    } catch (err) {
      console.warn("Cartesia TTS failed — falling back to browser voice", err);
      await this.fallbackSpeak(clean);
    }
  }

  /** Play an MP3 blob through an <audio> element. */
  private playBlob(blob: Blob): Promise<void> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      this.currentAudio = audio;
      this.speaking = true;

      const finish = () => {
        this.speaking = false;
        URL.revokeObjectURL(url);
        if (this.currentAudio === audio) this.currentAudio = null;
        this.speakResolve = null;
        resolve();
      };

      this.speakResolve = finish;
      audio.onended = finish;
      audio.onerror = finish;
      audio.play().catch(finish);
    });
  }

  /** Browser SpeechSynthesis fallback when Cartesia is unavailable. */
  private fallbackSpeak(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (!SpeechService.isSynthesisSupported()) {
        resolve();
        return;
      }
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => /female|samantha|zira|google uk/i.test(v.name)) ??
        voices.find((v) => v.lang.startsWith("en")) ??
        voices[0];
      if (preferred) utterance.voice = preferred;
      utterance.rate = 1;
      utterance.pitch = 1;

      this.speaking = true;
      const finish = () => {
        this.speaking = false;
        this.speakResolve = null;
        resolve();
      };
      this.speakResolve = finish;
      utterance.onend = finish;
      utterance.onerror = finish;
      window.speechSynthesis.speak(utterance);
    });
  }

  /** Stop any in-progress speech immediately and resolve its promise. */
  cancelSpeak(): void {
    if (this.currentAudio) {
      this.currentAudio.onended = null;
      this.currentAudio.onerror = null;
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    if (SpeechService.isSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }
    this.speaking = false;
    if (this.speakResolve) {
      const resolveFn = this.speakResolve;
      this.speakResolve = null;
      resolveFn();
    }
  }

  /* ============================================================ *
   * Voice IN — browser SpeechRecognition.
   * ============================================================ */

  /**
   * Start continuous listening. `onInterim` fires with the running
   * transcript; `onFinal` fires once after ~3s of silence with the
   * complete answer (also stopping recognition).
   */
  startListening(
    onInterim: (text: string) => void,
    onFinal: (text: string) => void,
  ): void {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) {
      console.warn("SpeechRecognition is not supported in this browser.");
      return;
    }

    this.stopListening();
    this.finalTranscript = "";
    this.finished = false;
    this.onFinalCb = onFinal;

    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      this.listening = true;
    };

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }
      this.finalTranscript = finalText;
      onInterim((finalText + interimText).trim());

      if (this.silenceTimer) clearTimeout(this.silenceTimer);
      if (finalText.trim().length > 0) {
        this.silenceTimer = setTimeout(() => this.finish(), SILENCE_MS);
      }
    };

    recognition.onerror = () => {
      /* `no-speech` / `aborted` are common and non-fatal — ignore. */
    };

    recognition.onend = () => {
      // The browser may end recognition on its own; restart unless the
      // candidate is done so listening feels continuous.
      if (!this.finished && this.listening) {
        try {
          recognition.start();
        } catch {
          this.listening = false;
        }
      } else {
        this.listening = false;
      }
    };

    this.recognition = recognition;
    try {
      recognition.start();
    } catch {
      this.listening = false;
    }
  }

  /** Deliver the final transcript once and stop recognition. */
  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    const text = this.finalTranscript.trim();
    this.stopListening();
    this.onFinalCb?.(text);
  }

  /** Stop listening without delivering a final transcript. */
  stopListening(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.listening = false;
    if (this.recognition) {
      this.recognition.onend = null;
      this.recognition.onresult = null;
      this.recognition.onerror = null;
      try {
        this.recognition.abort();
      } catch {
        /* already stopped */
      }
      this.recognition = null;
    }
  }
}
