import type {
  CardCatalogLookup,
  DropTierId,
  Duelist,
  DuelistId,
  RosterErrorCode,
} from "@yugioh/shared";

export type PortraitLookup = (portrait: string) => boolean;

export type HiddenDuelist = Readonly<{
  id: string | null;
  name: string | null;
  code: RosterErrorCode;
  details: Readonly<Record<string, unknown>>;
}>;

export type RosterReport = Readonly<{
  declaredDuelists: number;
  availableDuelists: number;
  hidden: readonly HiddenDuelist[];
  observedDropTiers: readonly DropTierId[];
  missingPortraits: readonly string[];
  valid: boolean;
}>;

export type LoadedRoster = Readonly<{
  rosterVersion: string;
  duelists: readonly Duelist[];
  report: RosterReport;
}>;

export type CatalogLookup = CardCatalogLookup;

export type DuelistLookup = ReadonlyMap<DuelistId, Duelist>;
