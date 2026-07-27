/**
 * Domain error carrying a stable code and structured details
 * (TypeScript-development-guidelines.md §8.1).
 *
 * `code` is what consumers and tests assert on; `message` is for humans and may
 * change without breaking the contract.
 *
 * The fields are declared and assigned explicitly rather than through
 * constructor parameter properties, which Node's type stripping cannot run.
 */
export class DomainError extends Error {
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(message: string, code: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.details = details;
  }
}
