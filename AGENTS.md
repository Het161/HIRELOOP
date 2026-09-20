# HireLoop

AI-powered mock interview platform. Next.js 15 App Router + TypeScript strict.
Terminal-native design: phosphor-dark, JetBrains Mono, ASCII box-drawing,
terminal-green + terracotta accents. IBM Plex Sans italic is reserved for rare
editorial moments only.

- All LLM calls (Groq, `openai/gpt-oss-120b`) go through
  `src/services/ai.service.ts`. Groq retires models without notice — the
  previous default, `llama-3.3-70b-versatile`, now 404s. Before changing
  `GROQ_MODEL`, confirm the id is live in `GET /openai/v1/models`, and check
  `/api/health`, which fails loudly when the configured model is missing.
- All shared types live in `src/types/index.ts`.
- TypeScript is strict — no `any`.
- Every external dependency has a fallback, because this is demoed live: the
  database falls back to `src/lib/memory-store.ts`, the model to the chain in
  `FALLBACK_MODELS`, Cartesia TTS to the browser voice, and the Web Speech API
  to Whisper via `/api/stt`. Keep it that way — never let one outage end an
  interview.
- The repo lives on an exFAT volume, so macOS keeps regenerating `._*`
  AppleDouble files. They are git-ignored and ESLint-ignored; they break
  `next build` if either is removed.
