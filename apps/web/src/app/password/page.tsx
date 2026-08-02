import { getPasswordCatalog } from "../../lib/password/catalog-password.ts";
import { toPasswordPayload } from "../../lib/password/catalog-payload.ts";
import type { PasswordCatalogPayload } from "../../lib/password/types.ts";
import { PasswordClient } from "./password-client.tsx";

async function loadCatalogPayload(): Promise<PasswordCatalogPayload> {
  const result = await getPasswordCatalog();
  return result.ok ? toPasswordPayload(result.value) : { status: "error" };
}

export default async function PasswordPage() {
  return <PasswordClient catalogResult={await loadCatalogPayload()} />;
}
