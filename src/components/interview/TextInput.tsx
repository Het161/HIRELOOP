"use client";

import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import AsciiButton from "@/components/shared/AsciiButton";

interface TextInputProps {
  onSubmit: (text: string) => void;
  disabled: boolean;
}

export default function TextInput({ onSubmit, disabled }: TextInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    onSubmit(trimmed);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  return (
    <div>
      <div className="mb-1 text-[12.5px] text-accent2">❯ your-answer:</div>
      <div
        className={`flex items-start border border-border bg-surface ${
          disabled ? "opacity-50" : ""
        }`}
      >
        <span className="select-none px-3 py-2.5 text-accent2">&gt;</span>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder="type your answer…"
          aria-label="Your answer"
          className="max-h-[200px] w-full resize-none overflow-y-auto bg-transparent py-2.5 pr-3 text-[13px] leading-relaxed text-paper outline-none placeholder:text-dim"
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-[12px] text-dim">
          [ ↵ submit · ⇧↵ newline ]
        </span>
        <AsciiButton
          sound="primary"
          onClick={submit}
          disabled={disabled || !value.trim()}
        >
          submit <span className="btn-ret">↵</span>
        </AsciiButton>
      </div>
    </div>
  );
}
