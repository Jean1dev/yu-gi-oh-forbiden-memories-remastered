import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { getSealedCatalog, listAllCards } from "../../../../lib/catalog/sealed-catalog.ts";
import { dataPackageDir } from "../../../../lib/server/repo-root.ts";

export async function GET(): Promise<Response> {
  const catalog = await getSealedCatalog();
  if (!catalog.ok) {
    return Response.json({ code: "catalog_unavailable" }, { status: 503 });
  }

  try {
    const rawRoster = JSON.parse(
      await readFile(join(dataPackageDir(), "data", "roster.json"), "utf8"),
    ) as unknown;
    return Response.json({
      rawRoster,
      cardNumbers: listAllCards(catalog.value).map(({ numero }) => numero),
      hash: null,
    });
  } catch {
    return Response.json({ code: "roster_unavailable" }, { status: 503 });
  }
}
