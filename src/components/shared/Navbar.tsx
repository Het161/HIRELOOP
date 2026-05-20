"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "@/components/shared/Toast";
import MuteToggle from "@/components/shared/MuteToggle";
import { playClick } from "@/lib/sounds";

/* ============================================================ *
 * Navbar — fixed tmux-style tab strip across the top of every
 * page. Active tab carries a green ● dot; the rest are dim ○.
 * ============================================================ */

interface Tab {
  label: string;
  href: string | null;
  match: (path: string) => boolean;
}

const TABS: Tab[] = [
  { label: "~/hireloop", href: "/", match: (p) => p === "/" },
  { label: "~/setup", href: "/setup", match: (p) => p.startsWith("/setup") },
  { label: "~/interview", href: null, match: (p) => p.startsWith("/interview") },
  { label: "~/report", href: null, match: (p) => p.startsWith("/report") },
];

export default function Navbar() {
  const pathname = usePathname() || "/";

  return (
    <header className="fixed left-0 right-0 top-0 z-50 h-[37px] border-b border-border bg-surface">
      <div className="flex h-full items-stretch overflow-x-auto text-[12.5px]">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const body = (
            <span className="flex h-full items-center gap-2 whitespace-nowrap border-r border-border px-4">
              <span className={active ? "text-paper" : "text-muted"}>
                {tab.label}
              </span>
              <span className={active ? "text-accent" : "text-dim"}>
                {active ? "●" : "○"}
              </span>
            </span>
          );

          if (tab.href) {
            return (
              <Link
                key={tab.label}
                href={tab.href}
                onClick={() => playClick("nav")}
                className="transition-colors hover:bg-surface2"
              >
                {body}
              </Link>
            );
          }
          return (
            <span key={tab.label} className="cursor-default select-none">
              {body}
            </span>
          );
        })}

        <div className="ml-auto flex items-center gap-3 whitespace-nowrap px-4 text-[12px]">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playClick("nav")}
            className="text-muted transition-colors hover:text-paper"
          >
            [ github ]
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playClick("nav")}
            className="hidden text-muted transition-colors hover:text-paper sm:inline"
          >
            [ docs ]
          </a>
          <button
            type="button"
            onClick={() => {
              playClick("soft");
              toast("theme locked: phosphor-dark");
            }}
            className="text-muted transition-colors hover:text-paper"
          >
            [ theme ]
          </button>
          <MuteToggle />
        </div>
      </div>
    </header>
  );
}
