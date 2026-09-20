/* ============================================================ *
 * Streaming sentence splitter.
 *
 * The interviewer's turn arrives from Groq one token at a time. Waiting
 * for the whole turn before synthesising speech costs ~2s of dead air,
 * so we cut the stream into speakable sentences and send each to TTS the
 * moment it is complete — the first sentence is already playing while
 * the rest of the turn is still being generated.
 * ============================================================ */

/** Abbreviations whose trailing period does NOT end a sentence. */
const ABBREVIATIONS = new Set([
  "mr",
  "mrs",
  "ms",
  "dr",
  "prof",
  "sr",
  "jr",
  "st",
  "vs",
  "etc",
  "e.g",
  "i.e",
  "fig",
  "approx",
  "inc",
  "ltd",
  "co",
  "no",
]);

/** Shortest fragment worth sending to TTS on its own. */
const MIN_SENTENCE_CHARS = 24;

/**
 * Accumulates streamed text and releases complete sentences.
 *
 * ```ts
 * const splitter = new SentenceSplitter();
 * for await (const token of stream) {
 *   for (const sentence of splitter.push(token)) speak(sentence);
 * }
 * const tail = splitter.flush();
 * ```
 */
export class SentenceSplitter {
  private buffer = "";

  /** Feed a chunk of text; returns any sentences completed by it. */
  push(chunk: string): string[] {
    this.buffer += chunk;
    const out: string[] = [];

    for (;;) {
      let end = this.findSentenceEnd(this.buffer, 0);

      // A fragment too short to be worth its own TTS round-trip ("Right.")
      // is merged forward into the next sentence, so prosody stays natural.
      while (
        end !== -1 &&
        this.buffer.slice(0, end).trim().length < MIN_SENTENCE_CHARS &&
        this.buffer.slice(end).trim().length > 0
      ) {
        end = this.findSentenceEnd(this.buffer, end);
      }
      if (end === -1) break;

      const sentence = this.buffer.slice(0, end).trim();
      this.buffer = this.buffer.slice(end);
      if (sentence) out.push(sentence);
    }

    return out;
  }

  /** Release whatever is left (call once the stream ends). */
  flush(): string | null {
    const rest = this.buffer.trim();
    this.buffer = "";
    return rest.length > 0 ? rest : null;
  }

  /**
   * Index just past the first sentence-ending punctuation, or -1.
   * Requires trailing whitespace so a sentence is only cut once the next
   * token confirms the boundary — this keeps "3.14" and "Node.js" whole.
   */
  private findSentenceEnd(text: string, from: number): number {
    for (let i = from; i < text.length; i += 1) {
      const ch = text[i];
      if (ch !== "." && ch !== "!" && ch !== "?") continue;

      // Run past grouped terminators: "..." "?!" and any closing quote.
      let end = i;
      while (end + 1 < text.length && /[.!?]/.test(text[end + 1])) end += 1;
      while (end + 1 < text.length && /["'’”)]/.test(text[end + 1])) end += 1;

      if (end + 1 >= text.length) return -1;
      const next = text[end + 1];

      // Normally a boundary is confirmed by following whitespace, which
      // keeps "Node.js" and "3.14" intact.
      if (!/\s/.test(next)) {
        // Models run sentences together with no space ("define?Got it."),
        // most often when stringing several questions into one turn. A
        // `?` or `!` followed by a capital is always a real boundary —
        // unlike `.`, which appears inside identifiers and numbers.
        const runOn = (ch === "?" || ch === "!") && /[A-Z]/.test(next);
        if (!runOn) continue;
        return end + 1;
      }

      if (ch === "." && this.endsWithAbbreviation(text.slice(0, i))) continue;

      return end + 1;
    }
    return -1;
  }

  private endsWithAbbreviation(before: string): boolean {
    const word = before.split(/[\s(]/).pop()?.toLowerCase() ?? "";
    if (ABBREVIATIONS.has(word)) return true;
    // Single initials: "J." in "J. Smith".
    return /^[a-z]$/.test(word);
  }
}

/** One-shot split of complete text into speakable sentences. */
export function splitSentences(text: string): string[] {
  const splitter = new SentenceSplitter();
  // The trailing space lets the final sentence's boundary be confirmed.
  const out = splitter.push(`${text} `);
  const tail = splitter.flush();
  if (tail) out.push(tail);
  return out;
}
