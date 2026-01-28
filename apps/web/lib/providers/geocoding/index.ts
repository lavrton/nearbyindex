export * from "./types";
export { NominatimProvider } from "./nominatim";

import { NominatimProvider } from "./nominatim";

let geocodingProvider: NominatimProvider | null = null;

export function getGeocodingProvider(): NominatimProvider {
  if (!geocodingProvider) {
    geocodingProvider = new NominatimProvider();
  }
  return geocodingProvider;
}
