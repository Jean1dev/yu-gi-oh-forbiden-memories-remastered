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
- `serialization` (`./src/serialization`, motor-duelo-1x1 F05): `serialize` (a cloned, reference-
  independent `Snapshot` of a `DuelState`) and `load` (validates an untrusted `unknown` against
  `DuelStateSchema` and returns a cloned `DuelState`, or a `Result` error). `Snapshot` is a plain
  type alias for `DuelState` (`packages/shared`), not a new wrapper — this is the contract the
  future Online Duel server (cross-PRD) will use to persist and resync sessions.
- `turn` (`./src/turn`, motor-duelo-1x1 F06): `apply` — the engine's single dispatcher
  (`docs/arquitetura.md` §3.1), an exhaustive `switch` over `Action.type` (`packages/shared`) that
  F07-F12 each extend with their own case. Today handles only `advance_phase`: the four-phase cycle
  draw → main → battle → end, and, from `end`, the turn transition (reset per-monster turn flags,
  reset the new active player's hand play, alternate `activePlayer`, increment `turn`, emit
  `onTurnEnd`/`onTurnStart`). Also exports `isFirstDuelTurn` and `hasUsedHandPlay`/
  `markHandPlayUsed`, ready for F08-F11 to consume. The `"draw"` case delegates to `draw`
  (below) before completing the transition to `"main"`.
- `draw` (`./src/draw`, motor-duelo-1x1 F07): `drawUpToHandSize` — completes the active player's
  hand up to `INITIAL_HAND_SIZE`, drawing from the top of the deck and emitting one `onDraw` per
  card; marks `deckOutPlayer` on `DuelState` if the deck runs out mid-draw (consumed later by
  F12). `resolveDrawPhase` is the boundary entry point for callers outside the normal turn cycle
  (refuses outside `"draw"` phase). `hasDeckedOut`/`getDeckOutPlayer` read the deck-out signal.

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
