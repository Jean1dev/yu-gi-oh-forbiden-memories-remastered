import {
  DomainError,
  err,
  ok,
  type CardNumber,
  type DropPool,
  type DropTierId,
  type Duelist,
  type DuelistId,
  type Result,
} from "@yugioh/shared";

import type { LoadedRoster } from "./types.ts";

export function getDuelist(roster: LoadedRoster, id: DuelistId): Result<Duelist, DomainError> {
  const duelist = roster.duelists.find((candidate) => candidate.id === id);
  return duelist === undefined
    ? err(new DomainError("Duelist is not available.", "unknown_duelist", { duelistId: id }))
    : ok(duelist);
}

export function getDropPool(roster: LoadedRoster, id: DuelistId): Result<DropPool, DomainError> {
  const duelist = getDuelist(roster, id);
  return duelist.ok ? ok(duelist.value.dropPool) : duelist;
}

export function listCardNumbersForTier(pool: DropPool, tier: DropTierId): readonly CardNumber[] {
  return pool.find((entry) => entry.tier === tier)?.cardNumbers ?? [];
}
