import {
  DomainError,
  err,
  ok,
  type CardCatalogLookup,
  type DeckComposition,
  type DeckViolation,
  type InitializationInput,
  type PlayerId,
  type ReadyDeck,
  type Result,
} from "@yugioh/shared";

/**
 * Produces a seed when the caller does not supply one. Injected so `initDuel`
 * and this module stay free of any internal entropy source
 * (`docs/arquitetura.md` §3.1).
 */
export type SeedGenerator = () => number;

/**
 * Structural deck validator port, matching the contract `montarDeckPronto`
 * will expose once `free-duel`/F02 (`packages/rules/src/deck/`) is
 * implemented — that package does not exist yet in this repository. F03
 * depends on it only through this injected port (motor-duelo-1x1/F03,
 * "assuma os contratos externos" override) instead of importing
 * `packages/rules` directly, so no validation logic is duplicated or faked
 * here. Whoever wires the real `montarDeckPronto` in passes it as this
 * dependency unchanged, since the shapes match by construction.
 */
export type DeckValidator = (input: {
  readonly composition: DeckComposition;
  readonly catalog: CardCatalogLookup;
}) => Result<ReadyDeck, DomainError>;

export type BuildInitializationInputArgs = Readonly<{
  compositionP1: DeckComposition;
  compositionP2: DeckComposition;
  seed?: number;
}>;

export type BuildInitializationInputDeps = Readonly<{
  catalog: CardCatalogLookup;
  seedGenerator: SeedGenerator;
  validateDeck: DeckValidator;
}>;

/** Reads the non-empty, ordered `violations` a `DeckValidator` error must carry. */
function violationsOf(error: DomainError): readonly DeckViolation[] {
  const violations = error.details["violations"];
  if (!Array.isArray(violations) || violations.length === 0) {
    throw new Error(
      "buildInitializationInput: deck validator contract violation — expected a non-empty " +
        "details.violations array",
    );
  }
  return violations as readonly DeckViolation[];
}

/**
 * Maps a validator failure to one of the three PRD messages (motor-duelo-1x1
 * PRD §6 F03 Error Handling), deciding by the leading violation of the
 * already-ordered list (spec Decisions 10, 11): a structural size problem —
 * including `invalid_quantity`, which reads as a corrupted composition
 * closer to a size problem than to the other two — and a copy-count problem
 * each get their own message; an unresolved card number interpolates its
 * `numero`.
 */
function translateDeckError(error: DomainError, player: PlayerId): DomainError {
  const violations = violationsOf(error);
  const leading = violations[0];
  if (leading === undefined) {
    throw new Error("buildInitializationInput: unreachable — violationsOf guarantees non-empty");
  }

  switch (leading.type) {
    case "insufficient_size":
    case "excessive_size":
    case "invalid_quantity":
      return new DomainError(
        "Deck inválido: são necessárias exatamente 40 cartas.",
        "invalid_deck_size",
        { player, violations },
      );
    case "copies_exceeded":
      return new DomainError(
        "Deck inválido: máximo de 3 cópias por carta.",
        "deck_copies_exceeded",
        { player, violations },
      );
    case "unknown_card":
      return new DomainError(
        `Deck inválido: carta desconhecida (numero ${leading.cardNumber}).`,
        "unknown_deck_card",
        { player, violations },
      );
  }
}

/** Resolves every `cardNumber` to its full `Card` via `catalog`. */
function resolveCards(readyDeck: ReadyDeck, catalog: CardCatalogLookup) {
  return readyDeck.cardNumbers.map((cardNumber) => {
    const card = catalog(cardNumber);
    if (card === undefined) {
      throw new Error(
        `buildInitializationInput: catalog does not resolve "${cardNumber}", though the deck ` +
          "validator already confirmed it exists — programming error, not a domain failure",
      );
    }
    return card;
  });
}

/**
 * Validates both decks with authority (spec Decision 1: reuses the injected
 * `validateDeck` instead of duplicating the 40/≤3/existence checks), resolves
 * every `numero` to a full `Card`, and resolves the seed. Fails fast on P1
 * without checking P2 (spec Decision 9). Impure only in the dependencies it
 * is handed; the body itself is pure.
 */
export function buildInitializationInput(
  args: BuildInitializationInputArgs,
  deps: BuildInitializationInputDeps,
): Result<InitializationInput, DomainError> {
  const readyP1 = deps.validateDeck({ composition: args.compositionP1, catalog: deps.catalog });
  if (!readyP1.ok) {
    return err(translateDeckError(readyP1.error, "P1"));
  }

  const readyP2 = deps.validateDeck({ composition: args.compositionP2, catalog: deps.catalog });
  if (!readyP2.ok) {
    return err(translateDeckError(readyP2.error, "P2"));
  }

  const seed = args.seed ?? deps.seedGenerator();

  return ok({
    players: {
      P1: { cards: resolveCards(readyP1.value, deps.catalog) },
      P2: { cards: resolveCards(readyP2.value, deps.catalog) },
    },
    seed,
  });
}
