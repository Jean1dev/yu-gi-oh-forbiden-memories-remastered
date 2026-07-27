/**
 * Domain error carrying a stable code and structured details
 * (TypeScript-development-guidelines.md §8.1).
 *
 * `code` is what consumers and tests assert on; `message` is for humans and may
 * change without breaking the contract.
 */
export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "DomainError";
  }
}
