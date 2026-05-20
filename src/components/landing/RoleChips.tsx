"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRole } from "@/lib/roles";
import { playClick } from "@/lib/sounds";

/* ============================================================ *
 * RoleChips — three file-path-style role chips. Click opens a
 * faux terminal tooltip with the role&rsquo;s topics; clicking the
 * chip also navigates to /setup with that role pre-selected.
 * ============================================================ */

const CHIPS = [
  { id: "frontend-developer", label: "roles/frontend-developer.md" },
  { id: "product-manager",    label: "roles/product-manager.md" },
  { id: "ai-engineer",        label: "roles/ai-engineer.md" },
] as const;

export default function RoleChips() {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(null);
      }
    }
    document.addEventListener("click", handleOutside);
    return () => document.removeEventListener("click", handleOutside);
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex flex-wrap gap-3 text-[12.5px]"
    >
      {CHIPS.map(({ id, label }) => {
        const role = getRole(id);
        const isOpen = open === id;

        return (
          <div key={id} className="relative">
            <button
              className="border border-border px-3 py-1.5 text-muted transition-colors hover:text-accent2"
              onClick={(e) => {
                e.stopPropagation();
                playClick("toggle");
                setOpen(isOpen ? null : id);
              }}
            >
              {label}
            </button>

            {isOpen && role && (
              <div className="absolute left-0 top-[calc(100%+10px)] z-50 w-[300px] max-w-[78vw] border border-border bg-surface p-3 text-[12px]">
                <div className="mb-2 text-accent2">
                  ┌─ {label}
                </div>
                <div className="leading-relaxed text-muted">
                  <span className="text-dim">category</span>
                  {"  "}
                  {role.category}
                  <br />
                  <span className="text-dim">topics</span>
                  {"    "}
                  {role.topics.slice(0, 4).join(" · ")}
                </div>
                <div className="my-2 overflow-hidden whitespace-nowrap text-dim leading-none">
                  {"─".repeat(40)}
                </div>
                <div className="text-dim">press start to interview for this role</div>
                <button
                  className="mt-2 text-accent2 transition-colors hover:text-paper"
                  onClick={() => {
                    playClick("primary");
                    router.push(`/setup?role=${id}`);
                    setOpen(null);
                  }}
                >
                  → start now ↵
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
