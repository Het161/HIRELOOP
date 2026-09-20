import Link from "next/link";
import AsciiDivider from "@/components/shared/AsciiDivider";
import RevealWrapper from "@/components/shared/RevealWrapper";
import StatusBar from "@/components/shared/StatusBar";
import Wordmark from "@/components/shared/Wordmark";
import HeroHeadline from "@/components/landing/HeroHeadline";
import LiveCounter from "@/components/landing/LiveCounter";
import RoleChips from "@/components/landing/RoleChips";
import { ROLES } from "@/lib/roles";

/* ============================================================ *
 * HireLoop — Landing Page (Server Component)
 * Interactive islands: HeroHeadline (typewriter + Enter key),
 * LiveCounter (count-up), RoleChips (hover tooltips).
 * ============================================================ */

export default function LandingPage() {
  return (
    <>
      {/* ── Version sub-header ──────────────────────────────── */}
      <div className="border-b border-border">
        <div className="mx-auto flex max-w-shell items-center justify-between gap-4 px-6 py-2.5 text-[12.5px] sm:px-11">
          <div className="truncate text-muted">
            <span className="text-accent2">❯</span> hireloop v1.0.0
            <span className="mx-2 text-dim">─</span>
            ai-powered interview practice
            <span className="mx-2 hidden text-dim sm:inline">─</span>
            <span className="hidden sm:inline">built by het</span>
          </div>
        </div>
      </div>

      <main>
        {/* ── Hero ────────────────────────────────────────────── */}
        <section className="mx-auto max-w-shell px-6 pb-20 pt-24 sm:px-11 sm:pt-36">
          {/* Logo — the page's visual identity, above the headline. */}
          <Wordmark size="xl" priority className="mb-9 sm:mb-11" />

          <div className="mb-7 select-none text-[13px] text-dim">
            &gt; ./start-interview --role any --mode voice|text
          </div>

          {/* Typewriter headline + CTA (client) */}
          <HeroHeadline />

          {/* Role chips (client — hover tooltips) */}
          <div className="mt-5">
            <RoleChips />
          </div>
        </section>

        {/* ── Double divider ──────────────────────────────────── */}
        <div className="mx-auto max-w-shell px-6 sm:px-11">
          <AsciiDivider variant="double" />
        </div>

        {/* ── How it works ────────────────────────────────────── */}
        <RevealWrapper>
          <section className="mx-auto max-w-shell px-6 py-20 sm:px-11">
            <div className="mb-9 text-[15px]">
              <span className="text-dim">## </span>
              <span className="font-medium">how-it-works</span>
            </div>
            <pre className="m-0 whitespace-pre-wrap text-[13.5px] leading-[2] text-muted">
              <span className="text-dim">├─ </span>
              <span className="text-accent2">01</span>
              {"  "}
              <span className="text-paper">pick a role and seniority</span>
              {"\n"}
              <span className="text-dim">│      └─ </span>
              <span className="text-dim">20+ tech roles · junior to senior</span>
              {"\n"}
              <span className="text-dim">├─ </span>
              <span className="text-accent2">02</span>
              {"  "}
              <span className="text-paper">get interviewed by the AI</span>
              {"\n"}
              <span className="text-dim">│      └─ </span>
              <span className="text-dim">
                voice or text · adapts to your answers · 30 min
              </span>
              {"\n"}
              <span className="text-dim">└─ </span>
              <span className="text-accent2">03</span>
              {"  "}
              <span className="text-paper">read the honest debrief</span>
              {"\n"}
              <span className="text-dim">       └─ </span>
              <span className="text-dim">
                scored breakdown · per-question feedback · improvement plan
              </span>
            </pre>
          </section>
        </RevealWrapper>

        {/* ── Single divider ──────────────────────────────────── */}
        <div className="mx-auto max-w-shell px-6 sm:px-11">
          <AsciiDivider />
        </div>

        {/* ── Available roles ─────────────────────────────────── */}
        <RevealWrapper delay={60}>
          <section className="mx-auto max-w-shell px-6 py-20 sm:px-11">
            <div className="mb-2 text-[15px]">
              <span className="text-dim">## </span>
              <span className="font-medium">available-roles</span>
            </div>
            <div className="mb-8 text-[12.5px] text-dim">
              ❯ ls roles/ — {ROLES.length} files
            </div>
            <div className="grid grid-cols-1 gap-x-10 gap-y-1 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
              {ROLES.map((role) => (
                <div key={role.id} className="flex items-baseline gap-2 py-1">
                  <span>
                    <span className="text-dim">&lt;</span>
                    <span className="text-paper transition-colors hover:text-accent">
                      {role.id}
                    </span>
                    <span className="text-dim">&gt;</span>
                  </span>
                  <span className="text-[11.5px] text-muted">
                    [{role.category}]
                  </span>
                </div>
              ))}
            </div>
          </section>
        </RevealWrapper>

        {/* ── Single divider ──────────────────────────────────── */}
        <div className="mx-auto max-w-shell px-6 sm:px-11">
          <AsciiDivider />
        </div>

        {/* ── Why HireLoop — editorial moment ─────────────────── */}
        <RevealWrapper delay={80}>
          <section className="mx-auto max-w-shell px-6 py-24 sm:px-11">
            <div className="mb-8 select-none text-[12.5px] text-dim">
              ❯ why-hireloop
            </div>
            <blockquote
              className="editorial max-w-[820px] leading-[1.5]"
              style={{ fontSize: "clamp(22px, 3.4vw, 32px)" }}
            >
              &ldquo;The best way to prepare for an interview is to have one
              &mdash; even with an AI on the other side.&rdquo;
            </blockquote>
            <div className="mt-6 font-mono text-[13px] text-muted">
              &mdash; het, building in public
            </div>
          </section>
        </RevealWrapper>

        {/* ── Activity ticker ─────────────────────────────────── */}
        <div className="border-y border-border bg-surface">
          <div className="mx-auto max-w-shell overflow-x-auto whitespace-nowrap px-6 py-3 text-[12.5px] text-muted sm:px-11">
            <span className="text-dim">❯ STATUS</span>
            <span className="pulse-dot ml-3" />
            <span className="ml-3">
              <LiveCounter target={3127} />
            </span>
            <span> interviews completed this week</span>
            <span className="mx-2 text-dim">·</span>
            avg score 71
            <span className="mx-2 text-dim">·</span>
            top role: backend developer
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        <RevealWrapper delay={40}>
          <footer className="mx-auto max-w-shell px-6 py-20 sm:px-11">
            <div className="mb-8 select-none text-[12.5px] text-dim">
              ❯ cat /etc/hireloop.conf
            </div>
            <div className="grid grid-cols-1 gap-10 text-[13px] sm:grid-cols-3">
              {/* links */}
              <div>
                <div className="mb-3 text-muted">[ links ]</div>
                <ul className="space-y-1.5 text-dim">
                  <li>
                    <Link
                      href="/setup"
                      className="transition-colors hover:text-paper"
                    >
                      → start an interview
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/setup"
                      className="transition-colors hover:text-paper"
                    >
                      → browse roles
                    </Link>
                  </li>
                  <li className="cursor-pointer transition-colors hover:text-paper">
                    → sample report
                  </li>
                </ul>
              </div>
              {/* system */}
              <div>
                <div className="mb-3 text-muted">[ system ]</div>
                <ul className="space-y-1.5 text-dim">
                  <li>
                    <span className="text-accent">✓</span> groq · gpt-oss-120b ·
                    online
                  </li>
                  <li>
                    <span className="text-accent">✓</span> speech engine · ready
                  </li>
                  <li>
                    <span className="text-accent">✓</span> datastore · connected
                  </li>
                </ul>
              </div>
              {/* contact */}
              <div>
                <div className="mb-3 text-muted">[ contact ]</div>
                <ul className="space-y-1.5 text-dim">
                  <li>
                    <a
                      href="https://github.com/het161"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-colors hover:text-paper"
                    >
                      → github.com/het
                    </a>
                  </li>
                  <li className="transition-colors hover:text-paper">
                    → het@hireloop.dev
                  </li>
                  <li>
                    {/* There is no /feedback route — this used to 404. */}
                    <a
                      href="https://github.com/het161/hireloop/issues"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-colors hover:text-paper"
                    >
                      → report an issue
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mb-5 mt-12">
              <AsciiDivider />
            </div>

            <div className="flex flex-wrap items-center text-[12.5px] text-muted">
              <Wordmark size="sm" className="mr-2.5" />
              <span className="text-dim">·</span>
              <span className="mx-2">built by het</span>
              <span className="mx-2 text-dim">·</span>
              open source
              <span className="mx-2 text-dim">·</span>
              MIT
              <span className="mx-2 text-dim">·</span>
              2026
            </div>
          </footer>
        </RevealWrapper>
      </main>

      {/* ── Status bar ──────────────────────────────────────── */}
      <StatusBar
        left={
          <>
            <span className="text-dim">❯ status</span>
            <span className="pulse-dot" />
            <LiveCounter target={3127} />
            <span>interviews this week</span>
            <span className="text-dim">·</span>
            <span>avg score 71</span>
          </>
        }
        right={<span className="text-dim">phosphor-dark</span>}
      />
    </>
  );
}
