import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // `**/._*` — macOS AppleDouble sidecars. This repo lives on an exFAT
    // volume, so every write regenerates them; they are binary and break
    // the lint pass during `next build`.
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", "**/._*"],
  },
];

export default eslintConfig;
