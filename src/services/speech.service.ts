import type { Seniority } from "@/types";
import { VOICE_PARAMS, getVoiceForSeniority } from "@/lib/voices";
import { splitSentences } from "@/lib/sentences";

/* ============================================================ *
 * SpeechService — voice I/O for the interview.
 *
 *  - Voice OUT → Cartesia Sonic, pipelined a sentence at a time so the
 *                interviewer starts talking ~300ms after the first
 *                sentence exists instead of after the whole turn.
 *                Falls back to the browser voice.
 *  - Voice IN  → browser SpeechRecognition where available (live
 *                interim text), with a MediaRecorder + Whisper fallback
 *                for Safari/Firefox and flaky networks.
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

/** Silence before an answer is considered finished. */
const SILENCE_MS = 2500;
/** Root-mean-square level below which the mic counts as silent. */
const SILENCE_RMS = 0.015;
/** Ignore silence until the candidate has actually said something. */
const MIN_SPEECH_MS = 400;

/** Which transcription path is active. */
export type ListenMode = "browser" | "whisper";

/** Why listening stopped working, in candidate-facing terms. */
export interface ListenError {
  code: "mic-denied" | "no-mic" | "unsupported" | "transcribe-failed";
  message: string;
}

export class SpeechService {
  private readonly seniority: Seniority;

  /* voice OUT — pipelined sentence queue */
  private queue: HTMLAudioElement[] = [];
  private current: HTMLAudioElement | null = null;
  private streamOpen = false;
  private speaking = false;
  private drainResolvers: Array<() => void> = [];
  private turnId = 0;

  /* voice IN — browser recognition */
  private recognition: SpeechRecognitionLike | null = null;
  private listening = false;
  private finalTranscript = "";
  private lastInterim = "";
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private finished = false;
  private onFinalCb: ((text: string) => void) | null = null;
  private onInterimCb: ((text: string) => void) | null = null;
  private onErrorCb: ((error: ListenError) => void) | null = null;
  private onModeChangeCb: ((mode: ListenMode) => void) | null = null;
  private mode: ListenMode = "browser";

  /* voice IN — Whisper recorder fallback */
  private recorder: MediaRecorder | null = null;
  private recorderStream: MediaStream | null = null;
  private recorderChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private levelTimer: ReturnType<typeof setInterval> | null = null;

  /** Fires when the browser blocks autoplay — the UI must ask for a tap. */
  onAutoplayBlocked: (() => void) | null = null;
  /** Fires on every speaking/idle transition. */
  onSpeakingChange: ((speaking: boolean) => void) | null = null;

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

  /** Recording works anywhere with a mic, so voice input is near-universal. */
  static isRecordingSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== "undefined"
    );
  }

  static isVoiceInputSupported(): boolean {
    return (
      SpeechService.isRecognitionSupported() ||
      SpeechService.isRecordingSupported()
    );
  }

  get isListening(): boolean {
    return this.listening;
  }

  get isSpeaking(): boolean {
    return this.speaking;
  }

  get listenMode(): ListenMode {
    return this.mode;
  }

  /* ============================================================ *
   * Voice OUT — pipelined Cartesia playback.
   * ============================================================ */

  /** Build the streaming TTS URL for one sentence. */
  private ttsUrl(sentence: string): string {
    const voice = getVoiceForSeniority(this.seniority);
    const params = new URLSearchParams({
      text: sentence,
      voiceId: voice.id,
      speed: VOICE_PARAMS.speed,
    });
    for (const emotion of VOICE_PARAMS.emotion) {
      params.append("emotion", emotion);
    }
    return `/api/tts?${params.toString()}`;
  }

  /**
   * Open a new spoken turn. Sentences pushed with `speakSentence` play in
   * order; `endTurn` resolves once the last one finishes.
   */
  beginTurn(): void {
    this.cancelSpeak();
    this.turnId += 1;
    this.streamOpen = true;
  }

  /**
   * Queue one sentence. Synthesis starts immediately — while the previous
   * sentence is still playing — so playback is effectively gapless and
   * only the first sentence costs any latency.
   */
  speakSentence(sentence: string): void {
    const clean = sentence.replace(/\[INTERVIEW_COMPLETE\]/g, "").trim();
    if (!clean) return;

    const audio = new Audio(this.ttsUrl(clean));
    audio.preload = "auto";
    // Remember the text so the browser-voice fallback can still say it.
    audio.dataset.text = clean;
    audio.load();

    this.queue.push(audio);
    if (!this.current) void this.playNext();
  }

  /** Close the turn; resolves when every queued sentence has played. */
  endTurn(): Promise<void> {
    this.streamOpen = false;
    if (!this.current && this.queue.length === 0) {
      this.setSpeaking(false);
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.drainResolvers.push(resolve);
    });
  }

  /** One-shot convenience: speak a complete block of text. */
  async speak(text: string): Promise<void> {
    this.beginTurn();
    for (const sentence of splitSentences(text)) {
      this.speakSentence(sentence);
    }
    await this.endTurn();
  }

  private async playNext(): Promise<void> {
    const next = this.queue.shift();
    if (!next) {
      this.current = null;
      // Nothing queued: finish the turn if the stream is closed, otherwise
      // wait for the next sentence to arrive.
      if (!this.streamOpen) this.finishTurn();
      return;
    }

    const turn = this.turnId;
    this.current = next;
    this.setSpeaking(true);

    const advance = () => {
      if (turn !== this.turnId) return; // cancelled — a new turn took over
      this.current = null;
      void this.playNext();
    };

    next.onended = advance;
    next.onerror = () => {
      if (turn !== this.turnId) return;
      // Cartesia (or the network) failed for this sentence — say it with
      // the browser voice rather than dropping it from the interview.
      const text = next.dataset.text ?? "";
      this.current = null;
      void this.fallbackSpeak(text).then(advance);
    };

    try {
      await next.play();
    } catch (err) {
      if (turn !== this.turnId) return;
      if ((err as DOMException)?.name === "NotAllowedError") {
        // Autoplay policy: put the clip back and ask the UI for a tap.
        this.queue.unshift(next);
        this.current = null;
        this.setSpeaking(false);
        this.onAutoplayBlocked?.();
        return;
      }
      next.onerror?.(new Event("error"));
    }
  }

  private finishTurn(): void {
    this.setSpeaking(false);
    const resolvers = this.drainResolvers;
    this.drainResolvers = [];
    for (const resolve of resolvers) resolve();
  }

  private setSpeaking(value: boolean): void {
    if (this.speaking === value) return;
    this.speaking = value;
    this.onSpeakingChange?.(value);
  }

  /**
   * Unlock audio playback after a user gesture. Browsers block autoplay
   * until the page has been interacted with; call this from a click
   * handler, then resume anything that was queued.
   */
  async unlockAudio(): Promise<boolean> {
    try {
      // A silent 1-frame WAV — enough to satisfy the autoplay gate.
      const silent = new Audio(
        "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=",
      );
      silent.volume = 0;
      await silent.play();
      silent.pause();
    } catch {
      return false;
    }
    if (!this.current && this.queue.length > 0) void this.playNext();
    return true;
  }

  /** Browser SpeechSynthesis fallback when Cartesia is unavailable. */
  private fallbackSpeak(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (!text || !SpeechService.isSynthesisSupported()) {
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

      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      utterance.onend = finish;
      utterance.onerror = finish;
      window.speechSynthesis.speak(utterance);
    });
  }

  /** Stop all speech immediately and drop anything still queued. */
  cancelSpeak(): void {
    this.turnId += 1; // invalidates in-flight handlers
    this.streamOpen = false;

    if (this.current) {
      this.current.onended = null;
      this.current.onerror = null;
      this.current.pause();
      this.current = null;
    }
    for (const audio of this.queue) {
      audio.onended = null;
      audio.onerror = null;
      audio.src = "";
    }
    this.queue = [];

    if (SpeechService.isSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }
    this.finishTurn();
  }

  /* ============================================================ *
   * Voice IN — browser recognition, with a Whisper fallback.
   * ============================================================ */

  /**
   * Start listening. `onInterim` fires with the running transcript (only
   * in browser-recognition mode); `onFinal` fires once the candidate has
   * been silent for ~2.5s, or when `submitNow` is called.
   */
  startListening(
    onInterim: (text: string) => void,
    onFinal: (text: string) => void,
    onError?: (error: ListenError) => void,
    onModeChange?: (mode: ListenMode) => void,
  ): void {
    this.stopListening();
    this.finalTranscript = "";
    this.lastInterim = "";
    this.finished = false;
    this.onInterimCb = onInterim;
    this.onFinalCb = onFinal;
    this.onErrorCb = onError ?? null;
    this.onModeChangeCb = onModeChange ?? null;

    if (SpeechService.isRecognitionSupported()) {
      this.startBrowserRecognition();
      return;
    }
    if (SpeechService.isRecordingSupported()) {
      void this.startWhisperRecording();
      return;
    }
    this.onErrorCb?.({
      code: "unsupported",
      message: "This browser cannot capture voice input.",
    });
  }

  private setMode(mode: ListenMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.onModeChangeCb?.(mode);
  }

  private startBrowserRecognition(): void {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) {
      void this.startWhisperRecording();
      return;
    }

    this.setMode("browser");
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
      this.lastInterim = (finalText + interimText).trim();
      this.onInterimCb?.(this.lastInterim);

      if (this.silenceTimer) clearTimeout(this.silenceTimer);
      if (finalText.trim().length > 0) {
        this.silenceTimer = setTimeout(() => this.finish(), SILENCE_MS);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      switch (event.error) {
        case "not-allowed":
        case "service-not-allowed":
          // Previously swallowed — the UI sat on "listening" forever while
          // the mic was blocked.
          this.listening = false;
          this.onErrorCb?.({
            code: "mic-denied",
            message:
              "Microphone access is blocked. Allow it in the address bar, or switch to text mode.",
          });
          break;
        case "audio-capture":
          this.listening = false;
          this.onErrorCb?.({
            code: "no-mic",
            message: "No microphone was found.",
          });
          break;
        case "network":
          // The browser's recognition service is unreachable (common on
          // conference Wi-Fi) — switch to recording + Whisper.
          if (SpeechService.isRecordingSupported() && !this.finished) {
            this.teardownRecognition();
            void this.startWhisperRecording();
          }
          break;
        default:
          /* `no-speech` / `aborted` are routine — ignore. */
          break;
      }
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

  /**
   * Record the answer and transcribe it with Whisper. Used where the Web
   * Speech API is missing (Safari, Firefox) or its service failed.
   */
  private async startWhisperRecording(): Promise<void> {
    if (!SpeechService.isRecordingSupported()) {
      this.onErrorCb?.({
        code: "unsupported",
        message: "This browser cannot capture voice input.",
      });
      return;
    }

    this.setMode("whisper");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      const name = (err as DOMException)?.name;
      this.onErrorCb?.(
        name === "NotFoundError"
          ? { code: "no-mic", message: "No microphone was found." }
          : {
              code: "mic-denied",
              message:
                "Microphone access is blocked. Allow it in the address bar, or switch to text mode.",
            },
      );
      return;
    }

    if (this.finished) {
      for (const track of stream.getTracks()) track.stop();
      return;
    }

    this.recorderStream = stream;
    this.recorderChunks = [];

    const mimeType = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
    ].find((t) => MediaRecorder.isTypeSupported(t));

    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined,
    );
    this.recorder = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.recorderChunks.push(event.data);
    };
    recorder.onstop = () => {
      void this.transcribeRecording();
    };

    recorder.start();
    this.listening = true;
    this.watchSilence(stream);
  }

  /** Stop recording once the candidate has been quiet for SILENCE_MS. */
  private watchSilence(stream: MediaStream): void {
    const AudioCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtor) return;

    const context = new AudioCtor();
    this.audioContext = context;
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);

    const samples = new Float32Array(analyser.fftSize);
    const startedAt = Date.now();
    let lastLoudAt = Date.now();
    let heardSpeech = false;

    this.levelTimer = setInterval(() => {
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (const sample of samples) sum += sample * sample;
      const rms = Math.sqrt(sum / samples.length);

      if (rms > SILENCE_RMS) {
        lastLoudAt = Date.now();
        if (Date.now() - startedAt > MIN_SPEECH_MS) {
          heardSpeech = true;
          this.onInterimCb?.("● recording your answer…");
        }
      } else if (heardSpeech && Date.now() - lastLoudAt > SILENCE_MS) {
        this.submitNow();
      }
    }, 150);
  }

  /** Upload the recording to Whisper and deliver the transcript. */
  private async transcribeRecording(): Promise<void> {
    const chunks = this.recorderChunks;
    this.recorderChunks = [];
    if (chunks.length === 0) {
      this.onFinalCb?.("");
      return;
    }

    const blob = new Blob(chunks, { type: chunks[0].type || "audio/webm" });
    const extension = blob.type.includes("mp4") ? "mp4" : "webm";
    this.onInterimCb?.("transcribing…");

    try {
      const form = new FormData();
      form.append("audio", blob, `answer.${extension}`);
      const res = await fetch("/api/stt", { method: "POST", body: form });
      if (!res.ok) throw new Error(`STT failed (${res.status})`);
      const data = (await res.json()) as { text?: string; error?: string };
      const text = (data.text ?? "").trim();
      this.onInterimCb?.(text);
      this.onFinalCb?.(text);
    } catch {
      this.onErrorCb?.({
        code: "transcribe-failed",
        message: "Could not transcribe that answer — try again, or use text mode.",
      });
      this.onFinalCb?.("");
    }
  }

  /** Submit whatever has been captured so far, right now. */
  submitNow(): void {
    if (this.mode === "whisper") {
      if (this.finished) return;
      this.finished = true;
      this.stopLevelWatch();
      if (this.recorder && this.recorder.state !== "inactive") {
        this.recorder.stop(); // onstop → transcribe → onFinal
      } else {
        this.onFinalCb?.("");
      }
      this.releaseMic();
      this.listening = false;
      return;
    }
    this.finish();
  }

  /** Deliver the final transcript once and stop recognition. */
  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    // Tapping "submit" mid-sentence must not drop the words the browser
    // has not promoted to `final` yet, so prefer the fuller transcript.
    const final = this.finalTranscript.trim();
    const interim = this.lastInterim.trim();
    const text = interim.length > final.length ? interim : final;

    this.teardownRecognition();
    this.listening = false;
    this.onFinalCb?.(text);
  }

  private teardownRecognition(): void {
    if (!this.recognition) return;
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

  private stopLevelWatch(): void {
    if (this.levelTimer) {
      clearInterval(this.levelTimer);
      this.levelTimer = null;
    }
    if (this.audioContext) {
      void this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }

  private releaseMic(): void {
    if (this.recorderStream) {
      for (const track of this.recorderStream.getTracks()) track.stop();
      this.recorderStream = null;
    }
  }

  /** Stop listening without delivering a final transcript. */
  stopListening(): void {
    this.finished = true;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.listening = false;
    this.teardownRecognition();
    this.stopLevelWatch();
    if (this.recorder && this.recorder.state !== "inactive") {
      this.recorder.onstop = null;
      try {
        this.recorder.stop();
      } catch {
        /* already stopped */
      }
    }
    this.recorder = null;
    this.recorderChunks = [];
    this.releaseMic();
  }
}
