export interface CityBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface CityConfig {
  bounds: CityBounds;
}

// City configurations
// Bounds should match the POI data area for proper heatmap coverage
export const CITY_CONFIG: Record<string, CityConfig> = {
  cancun: {
    bounds: { minLat: 20.8, maxLat: 21.4, minLng: -87.2, maxLng: -86.5 },
  },
};

// Legacy export for backwards compatibility
export const CITY_BOUNDS: Record<string, CityBounds> = Object.fromEntries(
  Object.entries(CITY_CONFIG).map(([slug, config]) => [slug, config.bounds])
);

/**
 * Get config for a city by slug
 */
export function getCityConfig(citySlug: string): CityConfig | null {
  return CITY_CONFIG[citySlug.toLowerCase()] ?? null;
}

/**
 * Get bounds for a city by slug
 */
export function getCityBounds(citySlug: string): CityBounds | null {
  return CITY_CONFIG[citySlug.toLowerCase()]?.bounds ?? null;
}

/**
 * Get all available city slugs
 */
export function getAvailableCities(): string[] {
  return Object.keys(CITY_BOUNDS);
}

/**
 * Check if a point is within a city's bounds
 */
export function isPointInCity(
  lat: number,
  lng: number,
  citySlug: string
): boolean {
  const bounds = getCityBounds(citySlug);
  if (!bounds) return false;

  return (
    lat >= bounds.minLat &&
    lat <= bounds.maxLat &&
    lng >= bounds.minLng &&
    lng <= bounds.maxLng
  );
}

/**
 * Find which city contains a given point
 */
export function findCityForPoint(lat: number, lng: number): string | null {
  for (const [slug, bounds] of Object.entries(CITY_BOUNDS)) {
    if (
      lat >= bounds.minLat &&
      lat <= bounds.maxLat &&
      lng >= bounds.minLng &&
      lng <= bounds.maxLng
    ) {
      return slug;
    }
  }
  return null;
}
