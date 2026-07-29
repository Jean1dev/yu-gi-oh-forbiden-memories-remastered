import { defineConfig } from "vitest/config";

/**
 * `apps/web` keeps the default Node environment for plain suites. React
 * component/hook tests from build-deck/F04 and library/F02 opt into jsdom per
 * file because `environmentMatchGlobs` does not exist in this installed Vitest
 * version.
 */
export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
  },
});
