/**
 * URL utilities for location sharing and browser history support
 */

/**
 * Format a location URL path for sharing
 */
export function formatLocationUrl(
  locale: string,
  lat: number,
  lng: number
): string {
  return `/${locale}/p/${lat.toFixed(6)},${lng.toFixed(6)}`;
}

/**
 * Parse lat,lng from URL path segment
 * Returns null if parsing fails
 */
export function parseLocationFromPath(
  pathSegment: string
): { lat: number; lng: number } | null {
  const parts = pathSegment.split(",");
  if (parts.length !== 2) return null;

  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);

  if (isNaN(lat) || isNaN(lng)) return null;
  if (lat < -90 || lat > 90) return null;
  if (lng < -180 || lng > 180) return null;

  return { lat, lng };
}

/**
 * Get the full shareable URL for a location
 */
export function getShareableUrl(
  locale: string,
  lat: number,
  lng: number
): string {
  if (typeof window === "undefined") {
    return formatLocationUrl(locale, lat, lng);
  }
  return `${window.location.origin}${formatLocationUrl(locale, lat, lng)}`;
}
