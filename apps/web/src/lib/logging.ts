export type LogLevel = "debug" | "info" | "warn" | "error";

// The one sanctioned console sink in the repository: every other file goes through `log` below
// instead of calling `console` directly (guidelines §23.3's structured-logging chokepoint).
/* eslint-disable no-console */
const SINKS: Readonly<Record<LogLevel, (message: string) => void>> = {
  debug: (message) => console.debug(message),
  info: (message) => console.info(message),
  warn: (message) => console.warn(message),
  error: (message) => console.error(message),
};
/* eslint-enable no-console */

/**
 * The one structured-logging chokepoint for `apps/web`'s I/O boundary
 * (guidelines §23.2-§23.3): every discard or non-fatal failure in the
 * collection-loading path reports through here instead of a scattered raw
 * console call.
 */
export function log(level: LogLevel, event: string, context: Record<string, unknown> = {}): void {
  SINKS[level](JSON.stringify({ level, event, ...context }));
}
