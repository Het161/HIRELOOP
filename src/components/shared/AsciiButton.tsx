"use client";

import type { ButtonHTMLAttributes, MouseEvent } from "react";
import { playClick, type SoundVariant } from "@/lib/sounds";

/* ============================================================ *
 * AsciiButton — a <button> rendered as a terminal command:
 * [ action ]. Hover fills with green (or red for danger) and
 * inverts the text. Plays a per-variant click on press.
 * ============================================================ */

interface AsciiButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style — "danger" turns hover red. */
  variant?: "default" | "danger";
  /** Sound played on click. Defaults to "secondary"; danger defaults to "danger". */
  sound?: SoundVariant;
}

export default function AsciiButton({
  variant = "default",
  sound,
  className,
  children,
  type = "button",
  onClick,
  disabled,
  ...rest
}: AsciiButtonProps) {
  const resolvedSound: SoundVariant =
    sound ?? (variant === "danger" ? "danger" : "secondary");

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    if (!disabled) playClick(resolvedSound);
    onClick?.(e);
  }

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      className={`btn-term${variant === "danger" ? " btn-term-danger" : ""}${className ? ` ${className}` : ""}`}
      {...rest}
    >
      {children}
    </button>
  );
}
