"use client";

import { useMemo, useRef } from "react";
import type { KeyboardEvent, UIEvent } from "react";

interface CodeEditorProps {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  /** Language label shown top-right of the editor. */
  languageLabel?: string;
}

const INDENT = "  "; // two spaces

/** Leading-whitespace of the line containing string index `pos`. */
function leadingWhitespace(text: string, pos: number): string {
  const lineStart = text.lastIndexOf("\n", pos - 1) + 1;
  const line = text.slice(lineStart, pos);
  const match = line.match(/^[ \t]*/);
  return match ? match[0] : "";
}

/**
 * Lightweight, dependency-free code editor — a monospace textarea with a
 * synced line-number gutter, tab-to-indent, and newline auto-indent. On-brand
 * with the terminal aesthetic; no syntax highlighting (kept intentionally
 * simple and fast).
 */
export default function CodeEditor({
  value,
  onChange,
  disabled = false,
  languageLabel,
}: CodeEditorProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lineCount = useMemo(
    () => Math.max(1, value.split("\n").length),
    [value],
  );

  function syncScroll(e: UIEvent<HTMLTextAreaElement>) {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  }

  function replaceSelection(insert: string, caretOffset: number) {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = value.slice(0, start) + insert + value.slice(end);
    onChange(next);
    const caret = start + caretOffset;
    // Restore caret after React re-renders the controlled value.
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = caret;
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    const ta = taRef.current;
    if (!ta) return;

    if (e.key === "Tab") {
      e.preventDefault();
      replaceSelection(INDENT, INDENT.length);
      return;
    }

    if (e.key === "Enter") {
      // Auto-indent: carry the current line's leading whitespace to the new line.
      e.preventDefault();
      const indent = leadingWhitespace(value, ta.selectionStart);
      const prevChar = value[ta.selectionStart - 1];
      // A trailing { ( : [ opens a block → add one extra indent level.
      const extra = prevChar && /[{([:]/.test(prevChar) ? INDENT : "";
      const insert = "\n" + indent + extra;
      replaceSelection(insert, insert.length);
      return;
    }
  }

  return (
    <div className="flex min-h-[340px] flex-col border border-border bg-[#0b0c0a]">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5 text-[11px] text-dim">
        <span className="text-muted">❯ solution</span>
        {languageLabel && (
          <span className="text-accent2">● {languageLabel}</span>
        )}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* line-number gutter */}
        <div
          ref={gutterRef}
          aria-hidden
          className="select-none overflow-hidden border-r border-border bg-surface px-2 py-3 text-right font-mono text-[13px] leading-[1.6] text-dim"
          style={{ minWidth: "3ch" }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={syncScroll}
          disabled={disabled}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          wrap="off"
          className="flex-1 resize-none bg-transparent px-3 py-3 font-mono text-[13px] leading-[1.6] text-paper caret-accent outline-none disabled:opacity-50"
          placeholder="// write your solution here…"
        />
      </div>
    </div>
  );
}
