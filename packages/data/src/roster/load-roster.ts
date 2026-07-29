import { DomainError, RosterSchema, err, ok, type Result, type Roster } from "@yugioh/shared";

import type { CatalogLookup, HiddenDuelist, LoadedRoster, PortraitLookup } from "./types.ts";
import { validateDuelist } from "./validate-duelist.ts";

function parseInput(raw: unknown): unknown {
  if (typeof raw !== "string") {
    return raw;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function readEnvelope(raw: unknown): Result<Roster, DomainError> {
  const parsed = parseInput(raw);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return err(new DomainError("Roster envelope is invalid.", "invalid_roster"));
  }

  const record = parsed as Record<string, unknown>;
  const versionResult = RosterSchema.shape.rosterVersion.safeParse(record.rosterVersion);
  if (!versionResult.success || !Array.isArray(record.duelists)) {
    return err(new DomainError("Roster envelope is invalid.", "invalid_roster"));
  }

  return ok({
    rosterVersion: versionResult.data,
    duelists: record.duelists as Roster["duelists"],
  });
}

function rawIdentity(raw: unknown): Pick<HiddenDuelist, "id" | "name"> {
  const record =
    typeof raw === "object" && raw !== null && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  return {
    id: typeof record.id === "string" ? record.id : null,
    name: typeof record.name === "string" ? record.name : null,
  };
}

export function loadRoster(
  raw: unknown,
  catalog: CatalogLookup,
  portraitExists: PortraitLookup = () => true,
): Result<LoadedRoster, DomainError> {
  const envelope = readEnvelope(raw);
  if (!envelope.ok) {
    return envelope;
  }

  const duelists = [];
  const hidden: HiddenDuelist[] = [];
  const observedDropTiers = new Set<string>();
  const missingPortraits = new Set<string>();
  const ids = new Set<string>();

  for (const rawDuelist of envelope.value.duelists as readonly unknown[]) {
    const result = validateDuelist(rawDuelist, catalog);
    if (!result.ok) {
      hidden.push({
        ...rawIdentity(rawDuelist),
        code: result.error.code as HiddenDuelist["code"],
        details: result.error.details,
      });
      continue;
    }
    if (ids.has(result.value.id)) {
      hidden.push({
        id: result.value.id,
        name: result.value.name,
        code: "duplicate_duelist_id",
        details: { duelistId: result.value.id },
      });
      continue;
    }

    ids.add(result.value.id);
    duelists.push(result.value);
    for (const tier of result.value.dropPool) {
      observedDropTiers.add(tier.tier);
    }
    if (!portraitExists(result.value.portrait)) {
      missingPortraits.add(result.value.portrait);
    }
  }

  return ok({
    rosterVersion: envelope.value.rosterVersion,
    duelists,
    report: {
      declaredDuelists: envelope.value.duelists.length,
      availableDuelists: duelists.length,
      hidden,
      observedDropTiers: [...observedDropTiers],
      missingPortraits: [...missingPortraits],
      valid: hidden.length === 0,
    },
  });
}
