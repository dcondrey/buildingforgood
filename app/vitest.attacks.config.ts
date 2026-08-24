import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * The attack suite, run as its own project.
 *
 * These harnesses live in `review/attacks/` and were written to falsify a
 * specific claim at a specific commit. Nothing executed them: vitest's root is
 * `app/` and they sit outside it, so the repository shipped adversarial tests
 * that CI never ran — an assertion with nothing behind it, which is exactly
 * what the claim inventory exists to catch.
 *
 * Root stays `app/`, so every import the harnesses make resolves the way it
 * does for the main suite. `server.fs.allow` is what lets a test file be read
 * from outside that root; without it vite refuses the path and reports the
 * harness as a missing module.
 */
const appDir = fileURLToPath(new URL(".", import.meta.url));
const pkg = (name: string) => resolve(appDir, "node_modules", name);

export default defineConfig({
  plugins: [react()],
  server: { fs: { allow: [resolve(appDir, "..")] } },
  resolve: {
    // A harness importing a bare specifier resolves from its own directory
    // upward, and `review/` has no node_modules. Exact-match regexes rather
    // than string prefixes, so `react` does not also rewrite `react-dom`.
    alias: [
      { find: /^@testing-library\/react$/, replacement: pkg("@testing-library/react") },
      { find: /^react\/jsx-dev-runtime$/, replacement: pkg("react/jsx-dev-runtime") },
      { find: /^react\/jsx-runtime$/, replacement: pkg("react/jsx-runtime") },
      { find: /^react-dom\/client$/, replacement: pkg("react-dom/client") },
      { find: /^react-dom$/, replacement: pkg("react-dom") },
      { find: /^react$/, replacement: pkg("react") },
    ],
  },
  test: {
    include: ["../review/attacks/**/*.attack.test.ts", "../review/attacks/**/*.attack.test.tsx"],
    environment: "jsdom",
  },
});
