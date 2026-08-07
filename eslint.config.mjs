import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Separate Node/Express project (its own package.json, own deps) —
    // not part of the Next.js app, and Next's react-hooks rule false-
    // positives on Baileys' `use*`-prefixed function names there anyway.
    "whatsapp-notifier/**",
  ]),
]);

export default eslintConfig;
