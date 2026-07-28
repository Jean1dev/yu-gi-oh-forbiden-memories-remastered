# @yugioh/engine

## Purpose

The headless, deterministic duel engine (`docs/arquitetura.md` §2). This is the first package in
the monorepo to hold real logic — `packages/shared` holds only types, schemas and contracts, with
no functions. `@yugioh/engine` is where the pure reducer lives: the code that reads and writes
`DuelState`.

## Public exports

- `events` (`./src/events`): the trigger-event vocabulary mechanics —
  `createEvent`, `openReactionWindow`, `closeReactionWindow`, `hasOpenReactionWindow`.
- `prng` (`./src/prng`): the engine's one seeded source of randomness —
  `createMulberry32`, `shuffle`.
- `initialization` (`./src/initialization`, motor-duelo-1x1 F03): produces the first `DuelState` of
  a duel — `buildInitializationInput` (validates and resolves the two decks + seed) and `initDuel`
  (pure, total, builds the state).
- `combat` (`./src/combat`, motor-duelo-1x1 F04): `calculateEffectiveAtkDef` — a monster's ATK/DEF
  base plus the Guardian Star, terrain and equipment modifiers, added term by term. The three
  modifiers are injected as `ModifierProviders` (`packages/rules/src/guardian-star`, `terrain`,
  `effect-system` supply the neutral `{ atk: 0, def: 0 }` implementations today, since none of
  those cross-PRD engines exist yet); this function never imports `packages/rules` itself.

## Dependency direction

`@yugioh/engine` depends only on `@yugioh/shared` (`shared ← data ← rules ← engine ← ai`,
`docs/arquitetura.md` §2). It never imports `packages/data`, `packages/rules`, `packages/ai`, any
`apps/*` package, React, the DOM, `fetch`, WebSocket, Node built-ins, or Supabase — enforced by
`.dependency-cruiser.cjs` at the repository root.

`packages/rules` does not exist yet (`free-duel`/F02, which owns the deck validator, is not
implemented). `buildInitializationInput` therefore takes the validator as an injected
`DeckValidator` dependency instead of importing `packages/rules` directly — the same pattern
already used for the card catalog (`CardCatalogLookup`). Whoever wires the real `montarDeckPronto`
in later passes it as this dependency unchanged, since the shapes match by construction.

## Runtime assumptions

None. Every exported function is pure and total: no I/O, no UI, no system clock, no external
entropy. `prng`/`initialization` use a PRNG, but only the seeded, deterministic kind — never
`Math.random()` or any other unseeded source. Inputs and outputs are plain, JSON-serializable data
(`DuelState`, `DuelEvent`, `ReactionWindow`).

## Test command

```
pnpm --filter @yugioh/engine test
```

## Data ownership

None. This package owns no persistent data, table or file — it only transforms the `DuelState`
value it is given and returns a new one.
