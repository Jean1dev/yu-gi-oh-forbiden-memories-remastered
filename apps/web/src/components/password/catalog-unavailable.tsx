import { PASSWORD_MESSAGES } from "./messages.ts";

export function CatalogUnavailable() {
  return <p role="alert">{PASSWORD_MESSAGES.catalogUnavailable}</p>;
}
