"use client";

import {
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  getRolesByCategory,
} from "@/lib/roles";
import type { Role, RoleCategory } from "@/types";

interface RoleSelectorProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  query: string;
  onQueryChange: (q: string) => void;
}

export default function RoleSelector({
  selectedId,
  onSelect,
  query,
  onQueryChange,
}: RoleSelectorProps) {
  const q = query.trim().toLowerCase();

  function matchesQuery(role: Role): boolean {
    if (!q) return true;
    return (
      role.name.toLowerCase().includes(q) ||
      role.id.toLowerCase().includes(q) ||
      role.description.toLowerCase().includes(q) ||
      role.category.toLowerCase().includes(q) ||
      role.topics.some((t) => t.toLowerCase().includes(q))
    );
  }

  const visibleCategories = CATEGORY_ORDER.filter((cat: RoleCategory) =>
    getRolesByCategory(cat).some(matchesQuery)
  );

  const hasResults = visibleCategories.length > 0;

  return (
    <div>
      {/* fzf search row */}
      <div className="flex items-center gap-2 border border-border bg-surface px-3 py-2 mb-6">
        <span className="text-accent2 text-[13px] flex-none font-mono select-none">
          ❯ fzf roles ·
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="type to filter…"
          autoComplete="off"
          spellCheck={false}
          className="bg-transparent outline-none text-paper text-[13px] font-mono w-full placeholder:text-dim"
          aria-label="Filter roles"
        />
        <span className="cursor flex-none" />
      </div>

      {/* role file-tree listing */}
      {hasResults ? (
        <div className="text-[13px] font-mono leading-relaxed">
          {visibleCategories.map((cat: RoleCategory) => {
            const roles = getRolesByCategory(cat).filter(matchesQuery);
            if (roles.length === 0) return null;
            return (
              <div key={cat} className="mt-4">
                <div className="text-muted mb-1 pl-2 select-none">
                  {CATEGORY_LABELS[cat].toLowerCase()}/
                </div>
                {roles.map((role: Role, idx: number) => {
                  const isLast = idx === roles.length - 1;
                  const isSelected = role.id === selectedId;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => onSelect(role.id)}
                      className={`row-hover${isSelected ? " selected" : ""} w-full text-left flex items-baseline gap-2 py-0.5 cursor-pointer`}
                    >
                      <span className="text-dim flex-none select-none">
                        {isLast ? "└─" : "├─"}
                      </span>
                      <span
                        className={`flex-none ${isSelected ? "text-accent" : "text-paper"}`}
                        style={{ minWidth: "210px" }}
                      >
                        {role.id}.md
                      </span>
                      <span className="text-dim hidden sm:inline flex-none select-none">→</span>
                      <span className="text-muted hidden sm:inline truncate">
                        {role.topics.map((t) => t.toLowerCase().replace(/[^a-z0-9/+]/g, "").slice(0, 12)).join(" · ")}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-dim text-[13px] font-mono pl-2 select-none">
          — no roles match that filter —
        </div>
      )}
    </div>
  );
}
