# HireLoop

AI-powered mock interview platform. Next.js 15 App Router + TypeScript strict.
Terminal-native design: phosphor-dark, JetBrains Mono, ASCII box-drawing,
terminal-green + terracotta accents. IBM Plex Sans italic is reserved for rare
editorial moments only.

- All LLM calls (Groq / Llama 3.3) go through `src/services/ai.service.ts`.
- All shared types live in `src/types/index.ts`.
- TypeScript is strict — no `any`.
