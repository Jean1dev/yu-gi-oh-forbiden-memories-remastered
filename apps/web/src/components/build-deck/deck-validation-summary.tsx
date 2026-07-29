"use client";

import type { CardCatalogLookup, DeckDraftViolation } from "@yugioh/shared";

import type { UseDeckValidationResult } from "../../hooks/use-deck-validation.ts";
import { formatViolation } from "../../lib/build-deck/format-violation.ts";
import styles from "./deck-validation-summary.module.css";

export type DeckValidationSummaryProps = Readonly<{
  validation: UseDeckValidationResult;
  catalog: CardCatalogLookup;
}>;

function violationKey(violation: DeckDraftViolation): string {
  return "cardNumber" in violation ? `${violation.type}:${violation.cardNumber}` : violation.type;
}

/**
 * The `X/40` counter and violation list (spec build-deck/F06 §3, PRD §6 F06
 * Experience): green when `valid`, red otherwise. While `useDeckValidation`
 * is still gated on the collection loading (spec Decision 7), the counter
 * renders in neither color and no violation list is shown yet, since none
 * has been computed.
 */
export function DeckValidationSummary({ validation, catalog }: DeckValidationSummaryProps) {
  const counterClassName = validation.loading
    ? styles.counter
    : validation.valid
      ? styles.valid
      : styles.invalid;

  return (
    <div className={styles.summary}>
      <p className={counterClassName} aria-live="polite">
        {validation.total}/40
      </p>
      {validation.violations.length > 0 ? (
        <ul className={styles.violations}>
          {validation.violations.map((violation) => (
            <li key={violationKey(violation)}>
              {formatViolation(violation, (cardNumber) => catalog(cardNumber)?.nome)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
