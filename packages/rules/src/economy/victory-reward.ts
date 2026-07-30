import { DomainError, err, ok, type Result } from "@yugioh/shared";

export function validateVictoryRewardStars(stars: number): Result<number, DomainError> {
  if (!Number.isInteger(stars) || stars < 0) {
    return err(
      new DomainError("Victory reward stars must be a non-negative integer.", "invalid_stars_amount", {
        stars,
      }),
    );
  }
  return ok(stars);
}
