# HireLoop

**The interview before the interview.** AI-powered mock interviews for every
tech role — pick a role, choose video or text, get interviewed by an adaptive
AI, and receive a scored debrief report. Free for everyone, portfolio-focused.

Terminal-native design: phosphor-dark surfaces, JetBrains Mono throughout,
ASCII box-drawing, terminal-green + terracotta accents.

## Stack

- **Next.js 15** App Router + **TypeScript** (strict, no `any`)
- **Tailwind CSS v3** + custom terminal design tokens
- **Groq API** (Llama 3.3 70B) — the adaptive interviewer brain + report grading
- **Tavus CVI** — real-time photorealistic video interviewer (video mode), over Daily.co WebRTC
- **Cartesia Sonic** — realistic interviewer voice (fallback when Tavus is unavailable)
- **MongoDB Atlas** (Mongoose) — sessions + reports
- **Framer Motion** — animations · **@react-pdf/renderer** — PDF debrief export

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment** — copy the example and fill it in:

   ```bash
   cp .env.local.example .env.local
   ```

   | Variable             | Required | Where to get it                                          |
   | -------------------- | -------- | -------------------------------------------------------- |
   | `GROQ_API_KEY`       | yes      | https://console.groq.com/keys — free                     |
   | `MONGODB_URI`        | yes      | https://www.mongodb.com/cloud/atlas                      |
   | `TAVUS_API_KEY`      | video    | https://platform.tavus.io — free dev account, 25 min     |
   | `TAVUS_REPLICA_ID`   | video    | https://platform.tavus.io/replicas — pick a stock face   |
   | `NEXT_PUBLIC_APP_URL`| video    | your public URL (see "Video mode" below)                 |
   | `CARTESIA_API_KEY`   | optional | https://cartesia.ai — voice fallback                     |

   **Text mode needs only Groq + MongoDB.** Video mode additionally needs the
   three Tavus variables.

3. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## Video mode (Tavus) — local development needs ngrok

In video mode, Tavus runs the photorealistic face + voice + WebRTC, while
HireLoop's **own Groq brain** drives the interview. Tavus reaches that brain by
calling back to `/api/tavus-llm/[sessionId]` — so the app must be reachable
from the public internet. `localhost` will **not** work.

For local development:

1. Install ngrok — `brew install ngrok` (or download from ngrok.com).
2. With `npm run dev` running, in another terminal: `ngrok http 3000`.
3. Copy the public https URL (e.g. `https://abc123.ngrok-free.app`).
4. Set `NEXT_PUBLIC_APP_URL=https://abc123.ngrok-free.app` in `.env.local`.
5. Restart `npm run dev`.

On production (Vercel) this is automatic — set `NEXT_PUBLIC_APP_URL` to your
deployment URL.

If `NEXT_PUBLIC_APP_URL` is not a public URL, HireLoop skips Tavus and runs the
interview in the standard voice/text flow instead — nothing breaks.

## How it works

1. **`/setup`** — choose a role (21 roles), a seniority level, and video or
   text mode. (Video is disabled if `TAVUS_API_KEY` is not set.)
2. **`/interview/[id]`**
   - **Video** — a real face-to-face interview: Tavus streams a photorealistic
     interviewer; HireLoop's Groq brain answers each turn via a custom-LLM
     endpoint; the transcript fills the terminal panel from live captions.
   - **Text** — type your answers; the interviewer streams in over SSE.
3. **`/report/[id]`** — a scored debrief: overall score, three sub-scores, a
   question-by-question breakdown with model answers, strengths, areas to
   improve, recommended resources. Exportable to PDF.

## Notes

- **AI brain** — every LLM call runs through Groq. In video mode Tavus calls
  the OpenAI-compatible endpoint at `src/app/api/tavus-llm/[sessionId]`; in text
  mode the SSE route streams directly. The report is graded by Groq from the
  MongoDB transcript either way.
- **Tavus persona** — HireLoop creates a fresh Tavus persona per interview so
  each conversation's custom LLM routes to the right session. (`TAVUS_PERSONA_ID`
  is intentionally not used — a static persona cannot do per-session routing.)
- **Graceful degradation** — if Tavus is unavailable (no key, quota, or a
  non-public URL), video mode falls back to the voice/text interview. Quota and
  connection errors surface as terminal-style messages, never browser alerts.
- **Cleanup** — ending an interview terminates the Tavus conversation, freeing
  the Daily room and your Tavus minutes.
- Build for production with `npm run build`.

## Deploying to Vercel

Push to a Git repo, import into Vercel, and set `GROQ_API_KEY`, `MONGODB_URI`,
`TAVUS_API_KEY`, `TAVUS_REPLICA_ID`, `NEXT_PUBLIC_APP_URL` (your Vercel URL),
and optionally `CARTESIA_API_KEY` as environment variables.

---

Built by Het · Open source · MIT
