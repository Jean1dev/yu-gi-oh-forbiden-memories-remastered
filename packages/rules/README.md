# @yugioh/rules

## Purpose

Pure game-rule helpers that sit between the data layer and the apps
(`docs/arquitetura.md` §2). Originally scoped to Guardian Star / Terrain /
Fusion / Effect System, the charter now also covers deck-assembly rules:
`min(quantity, 3)` is game rule from `product.md`, not UI logic, so it lives
here rather than in `apps/web` (spec build-deck/F01, Decision 1 —
`docs/arquitetura.md` §2 has been updated to describe this).

## Public exports

- `collection` (`./src/collection`, build-deck/F01): the player's owned-card
  rule — `serializeCollection` / `deserializeCollection` (round-trip between
  the in-memory `Collection` and its JSON transport shape), `ownedEntries` /
  `ownedQuantity` / `owns` / `copyLimit` (ownership and the deck-copy cap),
  `enrichCollection` (cross-references a `Collection` with the catalog),
  `deriveOwnedCardNumbers` (the boolean owned/not-owned reading the Library,
  cross-PRD, consumes).
- `initial-deck` (`./src/initial-deck`, build-deck/F02): the signup deck
  draw — `resolveInitialPool` (config + catalog fallback, minimum 14 distinct
  numbers), `drawInitialDeck` (Fisher-Yates draw against an injected
  `RandomSource`, structurally exactly 40 cards with at most 3 copies each),
  `verifyGeneratedDeckInvariants` (safety-net assertion over the drawn deck),
  `generateInitialDeck` (composes the three into the single call `apps/web`
  consumes). Sibling subsystem to `collection`, same package charter
  (spec build-deck/F02, Decision 2).
- `library` (`./src/library`, library/F01): the Library's catalog x
  collection cross-reference — `buildLibraryIndex` (every card of the game
  gets an entry, obtained or not; a `cardNumber` owned outside the catalog is
  excluded from the count and reported in `obtainedOutsideCatalog`),
  `resolveArtReference` (art / placeholder / silhouette, never consulting the
  art lookup for a not-obtained card), `calculateProgress` / `findEntry` /
  `isObtained` (the read-side the "X of 722 obtained" indicator and F05's
  detail screen consume), `onlyObtained` (F02's default status cut, the
  pattern F04 generalizes into the full status filter). Another sibling
  subsystem, same package charter extension `collection` already opened
  (spec library/F01, Decision 1 — `docs/arquitetura.md` §2 registration still
  pending, same as noted there).

## Dependency direction

`@yugioh/rules` depends only on `@yugioh/shared` (`shared ← data ← rules ←
engine ← ai`, `docs/arquitetura.md` §2). It never imports `packages/data`,
`packages/engine`, `packages/ai`, any `apps/*` package, React, the DOM,
`fetch`, or Supabase — enforced by `.dependency-cruiser.cjs` at the
repository root.

The card catalog is consumed by injection (`CardCatalogLookup`, declared in
`packages/shared`), not imported from `packages/data` directly, so this
package's tests stay free of the real dataset (spec build-deck/F01,
Decision 12; guidelines §12.2).

## Runtime assumptions

None. Every exported function is pure: no I/O, no system clock, no internal
randomness. `initial-deck`'s draw takes a `RandomSource` as a parameter
instead of calling `Math.random()` itself (guidelines §12.2) — deterministic
given the same source, not itself a source of nondeterminism. Inputs and
outputs are plain, JSON-serializable data.

## Test command

```
pnpm --filter @yugioh/rules test
```

## Data ownership

None. This package owns no persistent data — it only transforms the
`Collection` value it is given.
