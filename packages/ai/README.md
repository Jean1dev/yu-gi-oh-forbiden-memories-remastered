# @yugioh/ai

Deterministic NPC decision policies for duel modes. The package consumes public duel state and
shared action contracts; it never owns duel rules, UI, persistence, or transport.

Public APIs are exported from `src/index.ts`. Run `pnpm --filter @yugioh/ai test` and
`pnpm --filter @yugioh/ai typecheck` from the repository root.

`generateCandidates(publicState, playerId)` enumerates deterministic structural actions from the
NPC's public view. It never reads private duel state or decides legality; the engine-backed filter
is the next stage of the decision pipeline.

`filterLegalCandidates` accepts an injected evaluation capability. The Free Duel composition root
backs that capability with the real engine and returns only public projected states, so policies
never receive private decks, hidden cards, or engine errors.
