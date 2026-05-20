import type { ButtonHTMLAttributes } from "react";

/* ============================================================ *
 * AsciiButton — a <button> rendered as a terminal command:
 * [ action ]. Hover fills with green (or red for danger) and
 * inverts the text. Forwards all native button props.
 * The global ClickSounds listener plays the click tick.
 * ============================================================ */

interface AsciiButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "danger";
}

export default function AsciiButton({
  variant = "default",
  className,
  children,
  type = "button",
  ...rest
}: AsciiButtonProps) {
  return (
    <button
      type={type}
      className={`btn-term${variant === "danger" ? " btn-term-danger" : ""}${className ? ` ${className}` : ""}`}
      {...rest}
    >
      {children}
    </button>
  );
}
