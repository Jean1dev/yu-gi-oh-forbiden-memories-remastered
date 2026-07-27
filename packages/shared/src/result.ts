/**
 * Discriminated result used by every boundary function in the monorepo
 * (TypeScript-development-guidelines.md §7.1).
 *
 * Expected domain failures travel as values, not as exceptions: the compiler
 * forces callers to narrow `ok` before touching `value`.
 */
export type Result<T, E extends Error = Error> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E extends Error>(error: E): Result<never, E> {
  return { ok: false, error };
}
