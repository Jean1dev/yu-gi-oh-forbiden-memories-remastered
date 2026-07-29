import { afterEach } from "vitest";

/**
 * Cleans up mounted React trees after each component test. Guarded on
 * `document` because this setup file runs for every test in `apps/web`,
 * including plain Node-environment suites that never mount anything
 * (`@testing-library/react`'s cleanup requires a DOM to exist).
 */
afterEach(async () => {
  if (typeof document !== "undefined") {
    const { cleanup } = await import("@testing-library/react");
    cleanup();
  }
});
