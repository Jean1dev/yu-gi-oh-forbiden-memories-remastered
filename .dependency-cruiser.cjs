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
      name: "domain-cores-are-pure",
      comment:
        "Domain cores — the ingestion of F01, the integrity gate of F02 and whatever comes next " +
        "— take already-read content and return in-memory structures, so they stay testable " +
        "without a filesystem. All I/O belongs to the scripts and apps at the boundary.",
      severity: "error",
      from: {
        path: "^packages/(shared|data|rules|engine|ai)/src/",
        pathNot: "\\.test\\.ts$",
      },
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
      name: "rules-depends-only-on-shared",
      comment:
        "packages/rules may only import packages/shared (build-deck/F01). The card catalog " +
        "(packages/data) is consumed by injection via CardCatalogLookup, never imported " +
        "directly, so the collection-ownership rule stays testable without the real dataset.",
      severity: "error",
      from: { path: "^packages/rules/" },
      to: { path: "^packages/(?!rules|shared)" },
    },
    {
      name: "engine-depends-only-on-shared",
      comment:
        "packages/engine may only import packages/shared (motor-duelo-1x1/F02). First real " +
        "application of the \"headless engine\" pillar: no data/rules/ai dependency yet, " +
        "checked from the package's very first commit rather than added later.",
      severity: "error",
      from: { path: "^packages/engine/" },
      to: { path: "^packages/(?!engine|shared)" },
    },
    {
      name: "web-has-no-engine-or-ai-dependency-yet",
      comment:
        "apps/web (build-deck/F01) depends on packages/shared, packages/rules and packages/data " +
        "so far — no feature has wired packages/engine or packages/ai into the web app yet.",
      severity: "error",
      from: { path: "^apps/web/" },
      to: { path: "^packages/(engine|ai)/" },
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
    {
      name: "combat-modifier-placeholders-depend-only-on-shared",
      comment:
        "packages/rules/src/guardian-star, terrain and effect-system (motor-duelo-1x1/F04) are " +
        "placeholder ports for cross-PRD engines that do not exist yet. Already covered by " +
        "rules-depends-only-on-shared, but singled out here because these three subsystems are " +
        "the ones a future GuardianStar/Terrain/Effect System PRD will replace — narrower scope " +
        "documents that intent explicitly.",
      severity: "error",
      from: { path: "^packages/rules/src/(guardian-star|terrain|effect-system)/" },
      to: { path: "^packages/(?!rules|shared)" },
    },
    {
      name: "duel-state-is-pure",
      comment:
        "packages/shared/src/duel/** is DuelState, the single source of truth of the 1x1 duel " +
        "engine (motor-duelo-1x1/F01). It must stay data-only — no other package, no app, no " +
        "UI/IO library — so the future engine package (F03+) inherits zero dependencies from it, " +
        "before that package even exists.",
      severity: "error",
      from: { path: "^packages/shared/src/duel/" },
      to: {
        path: "^(packages/(?!shared)|apps/|react|react-dom|next|@supabase/|node:|fs$|path$|os$|child_process$)",
      },
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
