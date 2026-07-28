import { defineConfig } from "vitest/config";

/**
 * `apps/web` had no Vitest config yet (build-deck/F01-F03 only needed the
 * default Node environment). build-deck/F04 is the first feature with React
 * component tests; `environmentMatchGlobs` does not exist in this installed
 * Vitest version, so each component/hook test file opts into jsdom itself via
 * a `// @vitest-environment jsdom` pragma instead — everything else keeps the
 * default Node environment untouched.
 */
export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
  },
});
