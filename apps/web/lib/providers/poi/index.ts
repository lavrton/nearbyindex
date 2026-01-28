export * from "./types";
export { OverpassProvider } from "./overpass";
export { LocalDBProvider } from "./localdb";

import type { POIProvider } from "./types";
import { OverpassProvider } from "./overpass";
import { LocalDBProvider } from "./localdb";

export type ProviderType = "localdb" | "overpass";

const PROVIDER_TYPE = (process.env.POI_PROVIDER || "localdb") as ProviderType;

let provider: POIProvider | null = null;

export function getPOIProvider(): POIProvider {
  if (!provider) {
    provider = createProvider(PROVIDER_TYPE);
  }
  return provider;
}

export function createProvider(type: ProviderType): POIProvider {
  switch (type) {
    case "localdb":
      return new LocalDBProvider();
    case "overpass":
      return new OverpassProvider();
    default:
      throw new Error(`Unknown POI provider: ${type}`);
  }
}

// For testing or explicit provider selection
export function setProvider(p: POIProvider): void {
  provider = p;
}
