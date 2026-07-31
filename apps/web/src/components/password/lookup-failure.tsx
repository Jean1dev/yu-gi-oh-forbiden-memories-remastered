import type { PasswordResolution } from "@yugioh/shared";

import { PASSWORD_MESSAGES } from "./messages.ts";

export type LookupFailureProps = Readonly<{
  resolution: Exclude<PasswordResolution, { status: "resolved" }>;
}>;

export function LookupFailure({ resolution }: LookupFailureProps) {
  return (
    <p role="alert">
      {resolution.status === "not_found" ? PASSWORD_MESSAGES.notFound : PASSWORD_MESSAGES.malformed}
    </p>
  );
}
