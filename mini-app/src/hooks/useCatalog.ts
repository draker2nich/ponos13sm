import { useEffect, useState } from "react";
import { api, type Catalog } from "../api";

let cached: Promise<Catalog> | null = null;

/** Shop items come from the server so prices live in one place; fetched once per session */
export function useCatalog(): Catalog | null {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  useEffect(() => {
    cached ??= api.catalog().catch((e) => {
      cached = null;
      throw e;
    });
    cached.then(setCatalog, () => undefined);
  }, []);
  return catalog;
}
