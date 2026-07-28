import type { CardNumber } from "../card/types.ts";

/**
 * Enumerates every playable card number in the catalog — the capability the
 * signup pool's fallback needs on top of `CardCatalogLookup`'s single-number
 * lookup (spec build-deck/F02, Decision 4). Declared here, implemented by
 * `banco-de-cartas`/F03 alongside `CardCatalogLookup`; consumers receive it as
 * an injected dependency and never construct one themselves.
 */
export type CardPoolLookup = () => readonly CardNumber[];
