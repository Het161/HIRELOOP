import type { Config } from "tailwindcss";

/**
 * HireLoop design tokens — terminal-native.
 * Phosphor-dark surfaces, warm CRT off-white text, terminal-green +
 * terracotta accents. JetBrains Mono everywhere; IBM Plex Sans is
 * reserved for rare editorial moments only.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0d0e0c",
        surface: "#16181a",
        surface2: "#1a1d1a",
        paper: "#d4d4cf",
        muted: "#6b7066",
        dim: "#3d423a",
        border: "#2a2d28",
        accent: "#7ec96f", // terminal green
        accent2: "#d97757", // terracotta
        danger: "#c8553d",
      },
      fontFamily: {
        mono: ['var(--font-mono)', '"JetBrains Mono"', "ui-monospace", "monospace"],
        editorial: [
          'var(--font-editorial)',
          '"IBM Plex Sans"',
          "ui-sans-serif",
          "sans-serif",
        ],
      },
      borderColor: {
        DEFAULT: "#2a2d28",
      },
      maxWidth: {
        shell: "1180px",
      },
    },
  },
  plugins: [],
};

export default config;
