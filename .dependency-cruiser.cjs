/**
 * Package boundary rules (TypeScript-development-guidelines.md §3.3,
 * docs/arquitetura.md §2).
 *
 * Allowed direction: shared <- data <- rules <- engine <- ai, with web/server
 * on top. Nothing below ever imports something above it, and no package imports
 * an app. These rules are the executable form of that diagram.
 */
module.exports = {
  forbidden: [
    {
      name: "ingestion-core-is-pure",
      comment:
        "The ingestion core takes already-read content and returns in-memory structures, so it " +
        "stays testable without a filesystem. All I/O belongs to packages/data/scripts.",
      severity: "error",
      from: { path: "^packages/data/src/", pathNot: "\\.test\\.ts$" },
      to: { path: "^(node:|fs$|path$|os$|child_process$)" },
    },
    {
      name: "data-depends-only-on-shared",
      comment: "packages/data may only import packages/shared.",
      severity: "error",
      from: { path: "^packages/data/" },
      to: { path: "^packages/(?!data|shared)" },
    },
    {
      name: "shared-depends-on-no-package",
      comment: "packages/shared is the root of the dependency graph.",
      severity: "error",
      from: { path: "^packages/shared/" },
      to: { path: "^packages/(?!shared)" },
    },
    {
      name: "packages-never-import-apps",
      comment: "Lower-level packages never import apps.",
      severity: "error",
      from: { path: "^packages/" },
      to: { path: "^apps/" },
    },
    {
      name: "no-ui-or-backend-in-packages",
      comment:
        "React, DOM and Supabase belong to the apps. Domain packages stay free of UI and " +
        "transport so they run identically in the browser and on the authoritative server.",
      severity: "error",
      from: { path: "^packages/(shared|data|rules|engine|ai)/" },
      to: { path: "^(react|react-dom|next|@supabase/)" },
    },
    {
      name: "production-never-imports-tests",
      comment: "Tests may import fixtures; production code must not import from tests.",
      severity: "error",
      from: { path: "^packages/[^/]+/src/", pathNot: "\\.test\\.ts$" },
      to: { path: "^packages/[^/]+/tests/" },
    },
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(^|/)(node_modules|generated|dist|\\.next|\\.turbo)/" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.base.json" },
    enhancedResolveOptions: {
      extensions: [".ts", ".mts", ".cts", ".js", ".mjs", ".cjs", ".json"],
    },
  },
};
