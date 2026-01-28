import type { GeocodingProvider, GeocodingResult } from "./types";

interface NominatimSearchResult {
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  importance: number;
}

interface NominatimReverseResult {
  lat: string;
  lon: string;
  display_name: string;
  type: string;
}

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

export class NominatimProvider implements GeocodingProvider {
  private userAgent: string;

  constructor(userAgent?: string) {
    this.userAgent =
      userAgent || process.env.NOMINATIM_USER_AGENT || "nearbyindex/1.0";
  }

  async search(query: string): Promise<GeocodingResult[]> {
    const url = new URL("/search", NOMINATIM_BASE_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "5");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": this.userAgent,
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim search failed: ${response.statusText}`);
    }

    const results: NominatimSearchResult[] = await response.json();

    return results.map((r) => ({
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      displayName: r.display_name,
      type: r.type,
      importance: r.importance,
    }));
  }

  async reverse(lat: number, lng: number): Promise<GeocodingResult | null> {
    const url = new URL("/reverse", NOMINATIM_BASE_URL);
    url.searchParams.set("lat", lat.toString());
    url.searchParams.set("lon", lng.toString());
    url.searchParams.set("format", "json");

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": this.userAgent,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Nominatim reverse failed: ${response.statusText}`);
    }

    const result: NominatimReverseResult = await response.json();

    if (!result.lat) {
      return null;
    }

    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
      type: result.type,
      importance: 0,
    };
  }
}
