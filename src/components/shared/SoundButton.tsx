"use client";

import type { ButtonHTMLAttributes } from "react";
import AsciiButton from "./AsciiButton";
import type { SoundVariant } from "@/lib/sounds";

/* ============================================================ *
 * SoundButton — a button with a click sound matched to its
 * interaction category. Renders as an AsciiButton internally so
 * it inherits the terminal look the rest of the site uses.
 *
 *   <SoundButton variant="primary" onClick={start}>start</SoundButton>
 *   <SoundButton variant="danger"  onClick={del}>delete</SoundButton>
 * ============================================================ */

interface SoundButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Sound category — picks the matching click effect. */
  variant?: SoundVariant;
  /** Visual style — separate from sound. "danger" turns hover red. */
  tone?: "default" | "danger";
}

export default function SoundButton({
  variant = "soft",
  tone,
  ...rest
}: SoundButtonProps) {
  const resolvedTone = tone ?? (variant === "danger" ? "danger" : "default");
  return <AsciiButton variant={resolvedTone} sound={variant} {...rest} />;
}
