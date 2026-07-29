import { afterEach } from "vitest";

/**
 * Cleans up mounted React trees after each component test. Guarded on
 * `document` because this setup file runs for every test in `apps/web`,
 * including the plain Node-environment suites that predate library/F02 and
 * never mount anything (`@testing-library/react`'s cleanup requires a DOM to
 * exist).
 */
afterEach(async () => {
  if (typeof document !== "undefined") {
    const { cleanup } = await import("@testing-library/react");
    cleanup();
  }
});
