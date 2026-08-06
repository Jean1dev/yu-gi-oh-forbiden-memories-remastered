# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A web remake of Yu-Gi-Oh! Forbidden Memories (PS1). `product.md` is the product source of
truth: seven menu modules (Campanha, Free Duel, Online Duel, Build Deck, Library, Password,
Save), 1v1 duels, 40-card decks, max 3 copies, Guardian Stars, terrains, fusions.

Code, comments and identifiers are in **English**; the UI strings (the `messages.ts` maps) and
the **commit messages** are in Portuguese. Commits follow
`Adiciona <what>, <module>/F0X fase <n>` — one commit per implementation phase.

## Commands

Node 24 is required (`.nvmrc`); `nvm use` before anything else.

The `Makefile` is the entry point — it starts Supabase, regenerates `apps/web/.env.local` from
the running stack, and only then launches the app:

```bash
make dev      # up + pnpm dev, on :3000
make up       # install + start Supabase + write .env.local (no app)
make env      # rewrite .env.local from the running stack
make status   # Supabase status; make stop / make reset
make check    # lint + typecheck + test + build
```

Never hand-edit `apps/web/.env.local` — `make env` overwrites it. `.env.local.example`
documents the variables and the alternative remote-project profile.

The underlying pnpm scripts also work directly (`pnpm dev`, `pnpm lint`, `pnpm typecheck`,
`pnpm test`, `pnpm build`, `pnpm format`, `pnpm db:start`). One that `make check` does **not**
cover: `pnpm test:integration` — see the Supabase note under Gotchas.

Running one package or one test — note there is **no `--` separator**, which pnpm 10 swallows
here, silently running the whole suite instead of filtering:

```bash
pnpm --filter @yugioh/rules test
pnpm --filter @yugioh/web test use-deck-validation      # by file-name substring
pnpm --filter @yugioh/data test -t "722"                # by test-name substring
```

## Architecture

`docs/arquitetura.md` is the binding architecture document; `docs/adrs/generated/` holds the
ADRs. Read them before any structural change.

### Dependency direction (never invert)

```
shared ← data ← rules ← engine ← ai        web / server sit on top of all of them
```

- **`packages/shared`** — zod schemas and types only (`Card`, `DuelState`, network contracts).
  No logic. Root of the graph.
- **`packages/data`** — the card database: the 821→722 ingestion pipeline, in-memory catalog
  with indexes, art resolution, auxiliary tables.
- **`packages/rules`** — pure game rules: collection ownership, deck assembly, Guardian
  Star/Terrain/Effect modifiers. Consumes the catalog **by injection** (`CardCatalogLookup`),
  never by importing `data`.
- **`packages/engine`** — the headless 1v1 duel engine: `apply(state, action) → {state, events}`,
  seeded PRNG, reaction window as an explicit state machine. No React, DOM, `fetch` or Supabase.
- **`apps/web`** — Next.js 16 App Router + React 19 + Zustand.
- `packages/ai` and `apps/server` are planned but do not exist yet.

`.dependency-cruiser.cjs` is meant to be the executable form of these rules, and runs in
`pnpm lint`. **Do not trust it to catch a boundary violation.** Every workspace import
(`@yugioh/shared`, `@yugioh/data/catalog/disk`, …) currently comes back `couldNotResolve` — all
239 of them — so every rule keyed on a `^packages/...` target is dead: the graph simply has no
cross-package edges to match. What still works are the rules that match the import string
itself, notably `domain-cores-are-pure` (no `node:*` under `packages/*/src/`). Check the
dependency direction by reading imports, not by trusting a green run.

### Two rules that shape most code

**Domain cores are pure.** Nothing under `packages/*/src/` performs I/O. That is why the
filesystem loaders live in `packages/data/scripts/` (`loadCatalogFromDisk` and friends) instead
of `src/`, and why `packages/rules` receives the catalog as a function.

**Failures travel as values.** Every boundary function returns `Result<T, DomainError>`
(`packages/shared/src/result.ts`); exceptions are for programmer error only. `DomainError` carries
a `code` the UI maps to a message.

### Data pipeline

`packages/data/generated/` is gitignored and must be built before the app or most tests run:
`data:ingest` writes `cards.json` + `arts-manifest.json`, and **`data:validate` writes
`dataset-seal.json`** — the catalog loader reads the seal *first*, so `data:ingest` alone is not
enough. The `dev`, `build`, `test` and `typecheck` turbo tasks all depend on `data:validate`, so
this is usually automatic.

The auxiliary tables (`fusions.json`, the Guardian Star matrix, terrains, drops) are all still
`[]` — schema and loaders exist, values do not. The combat modifiers in
`packages/rules/src/{guardian-star,terrain,effect-system}` are deliberate neutral placeholders
for PRDs that have not been written.

### Persistence

Three tables (`collections`, `active_decks`, `reward_ledger`), all RLS `select`-own only. Every
write goes through a `SECURITY DEFINER` RPC, because economy mutations must be atomic and
idempotent. Two rules learned the hard way here:

- **Every client-callable RPC needs a `p_player_id = auth.uid()` guard.** Migration 0006 exists
  solely to retrofit one that was missing. `persist_initial_deck` is instead restricted to
  `service_role`, because its caller computes the deck contents.
- **Every new table needs an explicit `GRANT`.** This project's `public` schema has no default
  privileges, so RLS is never even reached without one.

### Server/client boundary in `apps/web`

The catalog is read from disk, so it can only be loaded in a Server Component or a route
handler, then passed to client components as a serializable prop — see `app/build-deck/page.tsx`
and `app/library/page.tsx`. A `"use client"` module that reaches `lib/catalog/sealed-catalog.ts`
(or anything under `lib/server/`) drags `node:fs` into the browser bundle and breaks the route.

Path resolution in server code goes through `lib/server/repo-root.ts` rather than
`import.meta.url`, which the bundler may rewrite.

## Workflow

Features are specified before they are written. `docs/prds/<module>.md` defines features
(F01, F02…), `docs/specs/<module>/F0X-<slug>/` holds the generated `spec.md` + `plan.md`.
Feature IDs are local to each PRD, so always name the module too ("build-deck F05").

Three skills drive this (see `AGENTS.md`): `duel-feature-prd` → `spec-writer` →
`implement-feature`. The implementation skill commits one commit per phase.

That pipeline is for new behavior only. Bugs and small adjustments to already-specified behavior
go through the lighter path in `AGENTS.md` ("Small fixes and adjustments") instead — a direct
`Corrige`/`Ajusta` commit, no new spec.md.

`TypeScript-development-guidelines.md` is the declared language standard for the repo. It is
generic and long — consult it for a specific question rather than reading it end to end.

## Gotchas

- **Integration tests silently pass when unconfigured.** They are wrapped in
  `describe.skipIf(!hasSupabaseEnv)` and report green without running. Export `SUPABASE_URL`,
  `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` before trusting a green run. Note the app
  runtime wants `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` while the tests want `SUPABASE_ANON_KEY`
  — locally the same value.
- **Two pre-existing flaky property tests**, both from fast-check drawing prototype keys, both
  unrelated to whatever you are changing:
  `packages/engine/src/serialization/round-trip.properties.test.ts` (`__proto__`) and
  `packages/data/src/art/resolve-art.test.ts` (`valueOf`/`toString`).
- **React component tests opt into jsdom per file** with a `// @vitest-environment jsdom`
  docblock; the installed Vitest has no `environmentMatchGlobs`.
- **`apps/web/tsconfig.json` overrides `moduleResolution` to `bundler`** — under the base
  `NodeNext`, `next/link` does not resolve.
- `supabase start` writes a generated bundle into `supabase/.temp/`, which is excluded from
  eslint for that reason.
- **Server code that reads a runtime-computed path only breaks on Vercel.** Anything going
  through `lib/server/repo-root.ts` (the generated catalog, `packages/data/data/roster.json`,
  the arts under `cards-data/`) is invisible to Next's output-file tracing, so the route needs
  an explicit entry in `outputFileTracingIncludes` in `apps/web/next.config.mjs`. `next dev`
  and `next start` read the real tree and never surface the omission — the symptom appears only
  in the deploy, as a 503 from the route and whatever empty state the client falls back to.
  Two traps inside that map, both of which have already shipped bugs:
  - **The keys are globs, so a dynamic segment has to be escaped.** Unescaped `[duelistId]` is a
    character class matching one letter, so `/free-duel/[duelistId]/duel` silently matches
    nothing. Write `/free-duel/\\[duelistId\\]/duel`.
  - **The values are relative to the app directory** (`apps/web`), not to
    `outputFileTracingRoot`.

  Verify by reading the build's own trace rather than by inspection — after `next build`, each
  route's real payload is listed in `apps/web/.next/server/app/<route>/{page,route}.js.nft.json`.
  An entry that contributes zero files to that list is a dead pattern.

## Current state

Implemented: `banco-de-cartas` F01–F08, `build-deck` F01–F07, `library` F01–F05 (complete),
`free-duel` F01–F10 (complete), `password` F01–F04, `motor-duelo-1x1` F01–F12 (complete), plus
the integration shell (main menu, `/login`, `POST /api/account/bootstrap`, the
`/cards-data/[file]` art route).

The duel engine has a full turn cycle end to end: `apply(state, action)` dispatches
`advance_phase` (with draw built in), `summon_monster`, `play_spell_or_trap`/`play_field_spell`,
`equip_card`/`activate_spell`,
`change_position`, and `declare_attack`/`resolve_attack` (complete FM combat table, no
piercing). Once life points hit 0, a deck runs out, or a player surrenders, `motor-duelo-1x1/F12`
freezes the state with a winner/loser (or draw) and refuses any further action — a duel can be
played, and finished, from the first turn to the result screen (`free-duel/F09`–`F10`).

The 25 spell cards documented in `docs/spells/` resolve through a shared effect table and a pure
engine interpreter, including equipment bonuses, immediate effects, terrains and attack locks.

Not implemented: Campanha, Online Duel, Save. `password/F05` (redemption history).
`DeckValidator`/`montarDeckPronto` are still a forward-declared contract with no real
implementation.
